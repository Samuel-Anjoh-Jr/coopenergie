import { Injectable, Logger } from "@nestjs/common";
type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, string>;
  sound?: string;
  channelId?: string;
};

@Injectable()
export class ExpoPushService {
  private readonly logger = new Logger(ExpoPushService.name);

  async sendExpoNotifications(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const { Expo } = await import("expo-server-sdk");
    const expo = new Expo();
    const validTokens = tokens.filter((token) => Expo.isExpoPushToken(token));

    if (validTokens.length === 0) {
      return;
    }

    const sound = data?.sound ?? "default";
    const soundChannel = data?.soundChannel ?? sound.replace(/\.[^.]+$/, "");

    const messages: ExpoPushMessage[] = validTokens.map((to) => ({
      to,
      title,
      body,
      data,
      sound,
      channelId: soundChannel,
    }));

    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.warn(
          `Failed to send Expo notification chunk: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}
