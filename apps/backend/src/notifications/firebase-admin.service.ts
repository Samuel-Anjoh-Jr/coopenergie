import { Injectable, Logger } from "@nestjs/common";
import * as admin from "firebase-admin";
import { UsersService } from "../modules/users/users.service";

type NotificationPayload = Record<string, string>;

@Injectable()
export class FirebaseAdminService {
  private readonly logger = new Logger(FirebaseAdminService.name);
  private readonly projectId =
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID?.trim();
  private readonly serverKey = process.env.FIREBASE_SERVER_KEY?.trim();
  private readonly privateKey =
    process.env.FIREBASE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  private readonly clientEmail =
    process.env.FIREBASE_SERVICE_ACCOUNT_CLIENT_EMAIL?.trim();
  private readonly canUseAdminSdk =
    !!this.projectId && !!this.privateKey && !!this.clientEmail;

  constructor(private readonly usersService: UsersService) {
    if (!this.privateKey) {
      if (!this.serverKey) {
        this.logger.warn(
          "Firebase not configured - push notifications disabled",
        );
      }
      return;
    }

    if (!this.projectId || !this.clientEmail) {
      this.logger.warn(
        "Firebase service account is incomplete - push notifications disabled",
      );
      return;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.projectId,
          privateKey: this.privateKey,
          clientEmail: this.clientEmail,
        }),
      });
    }
  }

  async sendToToken(
    token: string,
    title: string,
    body: string,
    data?: NotificationPayload,
  ) {
    return this.sendToTokens([token], title, body, data);
  }

  async sendToTokens(
    tokens: string[],
    title: string,
    body: string,
    data?: NotificationPayload,
  ) {
    if (tokens.length === 0) {
      return;
    }

    if (this.canUseAdminSdk) {
      await this.sendViaAdminSdk(tokens, title, body, data);
      return;
    }

    if (this.serverKey) {
      await this.sendViaLegacyFcm(tokens, title, body, data);
      return;
    }

    this.logger.warn(
      "Firebase push is not configured; skipping web notification dispatch.",
    );
  }

  private async sendViaAdminSdk(
    tokens: string[],
    title: string,
    body: string,
    data?: NotificationPayload,
  ) {
    const sound = data?.sound ?? "default";
    const payload = this.stripUndefined({
      token: undefined,
      notification: {
        title,
        body,
      },
      data,
      android: {
        notification: {
          sound,
        },
      },
      apns: {
        payload: {
          aps: {
            sound,
          },
        },
      },
    });

    const response = await admin.messaging().sendEachForMulticast({
      ...payload,
      tokens,
    });

    const staleTokens = response.responses.flatMap((result, index) => {
      const code = result.error?.code;

      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        return [tokens[index]];
      }

      if (!result.success) {
        this.logger.warn(
          `Failed to send Firebase notification to token ${tokens[index]}: ${
            result.error?.message ?? "unknown error"
          }`,
        );
      }

      return [];
    });

    await this.removeStaleTokens(staleTokens);
  }

  private async sendViaLegacyFcm(
    tokens: string[],
    title: string,
    body: string,
    data?: NotificationPayload,
  ) {
    const response = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        Authorization: `key=${this.serverKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        registration_ids: tokens,
        notification: {
          title,
          body,
          sound: data?.sound ?? "default",
        },
        data,
      }),
    });

    const payload = (await response.json().catch(() => null)) as {
      results?: Array<{ error?: string }>;
    } | null;

    if (!response.ok) {
      this.logger.warn(
        `Legacy FCM request failed with status ${response.status}.`,
      );
      return;
    }

    const staleTokens = (payload?.results ?? []).flatMap((result, index) => {
      if (
        result.error === "InvalidRegistration" ||
        result.error === "NotRegistered"
      ) {
        return [tokens[index]];
      }

      if (result.error) {
        this.logger.warn(
          `Legacy FCM notification failed for token ${tokens[index]}: ${result.error}`,
        );
      }

      return [];
    });

    await this.removeStaleTokens(staleTokens);
  }

  private async removeStaleTokens(tokens: string[]) {
    if (tokens.length === 0) {
      return;
    }

    for (const token of [...new Set(tokens)]) {
      await this.usersService.removeStaleToken(token);
    }
  }

  private stripUndefined<T extends object>(value: T): T {
    return JSON.parse(JSON.stringify(value)) as T;
  }
}
