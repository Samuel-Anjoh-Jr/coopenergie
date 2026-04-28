import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from "@nestjs/common";

type CampayCollectResponse = {
  status?: string;
  reference?: string;
  external_reference?: string;
  message?: string;
  [key: string]: unknown;
};

@Injectable()
export class CampayService {
  async initiatePayment(
    amount: number,
    currency: string,
    from: string,
    description: string,
    externalRef: string,
  ) {
    const payload = {
      amount: amount.toString(),
      currency,
      from,
      description,
      external_reference: externalRef,
    };

    return this.request<CampayCollectResponse>("/collect/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async checkStatus(reference: string) {
    return this.request<Record<string, unknown>>(`/transaction/${reference}/`, {
      method: "GET",
    });
  }

  verifyWebhookSignature(payload: string, signature: string) {
    const secret = this.readSecret(process.env.CAMPAY_WEBHOOK_SECRET);

    if (!secret || !signature) {
      return false;
    }

    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const provided = signature.replace(/^sha256=/i, "");

    if (provided.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(Buffer.from(provided), Buffer.from(expected));
  }

  private async request<T>(
    path: string,
    init: {
      method: "GET" | "POST";
      body?: string;
    },
  ) {
    const apiKey = this.readApiKey(process.env.CAMPAY_API_KEY);
    const baseUrl = this.readSecret(process.env.CAMPAY_BASE_URL);

    if (!apiKey || !baseUrl) {
      throw new InternalServerErrorException(
        "CamPay configuration is missing.",
      );
    }

    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Token ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: init.body,
    });

    const text = await response.text();
    const data = this.tryParseJson(text);

    if (!response.ok) {
      throw new BadRequestException(
        this.readString(data?.message) ||
          this.readString(data?.detail) ||
          "CamPay request failed.",
      );
    }

    return (data ?? {}) as T;
  }

  private tryParseJson(value: string) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }

  private readApiKey(value: string | undefined) {
    const sanitized = this.readSecret(value);
    return sanitized ? sanitized.replace(/\s+/g, "") : undefined;
  }

  private readSecret(value: string | undefined) {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const unwrapped = trimmed.slice(1, -1).trim();
      return unwrapped || undefined;
    }

    return trimmed || undefined;
  }
}
