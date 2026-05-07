import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  ServiceUnavailableException,
} from "@nestjs/common";

type CampayCollectResponse = {
  status?: string;
  reference?: string;
  external_reference?: string;
  message?: string;
  [key: string]: unknown;
};

type SandboxFinalStatus = "SUCCESSFUL" | "FAILED";

type SandboxPaymentState = {
  finalStatus: SandboxFinalStatus;
  statusChecks: number;
};

const CAMPAY_REQUEST_TIMEOUT_MS = 12000;
const CAMPAY_MAX_ATTEMPTS = 3;
const CAMPAY_CAMEROON_PREFIX = "237";

const CAMPAY_SANDBOX_TEST_NUMBERS: Record<string, SandboxFinalStatus> = {
  "237677777777": "SUCCESSFUL",
  "237677777770": "FAILED",
  "237699999999": "SUCCESSFUL",
  "237699999990": "FAILED",
};

@Injectable()
export class CampayService {
  private readonly sandboxPaymentStates = new Map<
    string,
    SandboxPaymentState
  >();

  async getHealthStatus() {
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();
    const webhookSecret = this.readSecret(process.env.CAMPAY_WEBHOOK_SECRET);
    const webhookUrl = this.readSecret(process.env.CAMPAY_WEBHOOK_URL);

    if (!apiKey || !baseUrl) {
      return {
        ready: false,
        configured: false,
        mode: this.resolveMode(baseUrl),
        baseUrl: baseUrl ?? null,
        webhookUrl: webhookUrl ?? null,
        webhookSecretConfigured: !!webhookSecret,
        authReady: false,
        statusCode: null,
        providerMessage: "CamPay configuration is missing.",
      };
    }

    try {
      const response = await fetch(
        `${baseUrl.replace(/\/+$/, "")}/transaction/healthcheck/`,
        {
          method: "GET",
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
        },
      );

      const text = await response.text();
      const payload = this.tryParseJson(text);
      const providerMessage =
        this.readString(payload?.message) ||
        this.readString(payload?.detail) ||
        response.statusText ||
        null;
      const authReady = !this.isInvalidTokenResponse(
        response.status,
        providerMessage,
      );

      return {
        ready: authReady,
        configured: true,
        mode: this.resolveMode(baseUrl),
        baseUrl,
        webhookUrl: webhookUrl ?? null,
        webhookSecretConfigured: !!webhookSecret,
        authReady,
        statusCode: response.status,
        providerMessage,
      };
    } catch (error) {
      return {
        ready: false,
        configured: true,
        mode: this.resolveMode(baseUrl),
        baseUrl,
        webhookUrl: webhookUrl ?? null,
        webhookSecretConfigured: !!webhookSecret,
        authReady: false,
        statusCode: null,
        providerMessage: error instanceof Error ? error.message : String(error),
      };
    }
  }

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

    const sandboxCollectResponse = this.tryHandleSandboxCollect(
      from,
      externalRef,
    );
    if (sandboxCollectResponse) {
      return sandboxCollectResponse;
    }

    return this.request<CampayCollectResponse>("/collect/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  }

  async checkStatus(reference: string) {
    const sandboxStatusResponse = this.tryHandleSandboxStatus(reference);
    if (sandboxStatusResponse) {
      return sandboxStatusResponse;
    }

    return this.request<Record<string, unknown>>(`/transaction/${reference}/`, {
      method: "GET",
    });
  }

  private tryHandleSandboxCollect(from: string, externalRef: string) {
    if (!this.shouldUseSandboxSimulation(externalRef)) {
      return null;
    }

    const normalizedPhone = this.normalizeCameroonPhone(from);
    if (!normalizedPhone) {
      return null;
    }

    const finalStatus = CAMPAY_SANDBOX_TEST_NUMBERS[normalizedPhone];
    if (!finalStatus) {
      return null;
    }

    this.sandboxPaymentStates.set(externalRef, {
      finalStatus,
      statusChecks: 0,
    });

    return {
      status: "PENDING",
      reference: externalRef,
      external_reference: externalRef,
      message: "Sandbox test payment accepted.",
    } satisfies CampayCollectResponse;
  }

  private tryHandleSandboxStatus(reference: string) {
    if (!this.isSandboxMode()) {
      return null;
    }

    const state = this.sandboxPaymentStates.get(reference);
    if (!state) {
      return null;
    }

    if (state.statusChecks === 0) {
      state.statusChecks += 1;
      return {
        reference,
        external_reference: reference,
        status: "PENDING",
      };
    }

    this.sandboxPaymentStates.delete(reference);
    return {
      reference,
      external_reference: reference,
      status: state.finalStatus,
    };
  }

  private shouldUseSandboxSimulation(externalRef: string) {
    return this.isSandboxMode() && externalRef.startsWith("COOP-");
  }

  private isSandboxMode() {
    return this.resolveMode(this.getBaseUrl()) === "sandbox";
  }

  private normalizeCameroonPhone(value: string) {
    const digits = value.replace(/\D+/g, "");
    if (!digits) {
      return null;
    }

    if (digits.startsWith(CAMPAY_CAMEROON_PREFIX) && digits.length === 12) {
      return digits;
    }

    if (digits.length === 9) {
      return `${CAMPAY_CAMEROON_PREFIX}${digits}`;
    }

    return null;
  }

  verifyWebhookSignature(payload: string, signature: string) {
    const secret = this.getWebhookSecret();

    if (!secret || !signature) {
      return false;
    }

    if (this.isJwtLike(signature)) {
      return this.verifyHs256JwtSignature(signature, secret);
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
    const apiKey = this.getApiKey();
    const baseUrl = this.getBaseUrl();

    if (!apiKey || !baseUrl) {
      throw new InternalServerErrorException(
        "CamPay configuration is missing.",
      );
    }

    const endpoint = `${baseUrl.replace(/\/+$/, "")}${path}`;

    for (let attempt = 1; attempt <= CAMPAY_MAX_ATTEMPTS; attempt += 1) {
      const isLastAttempt = attempt === CAMPAY_MAX_ATTEMPTS;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, CAMPAY_REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(endpoint, {
          method: init.method,
          headers: {
            Authorization: `Token ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: init.body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        const text = await response.text();
        const data = this.tryParseJson(text);
        const providerMessage =
          this.readString(data?.message) ||
          this.readString(data?.detail) ||
          "CamPay request failed.";

        if (response.ok) {
          return (data ?? {}) as T;
        }

        if (this.isRetryableStatus(response.status) && !isLastAttempt) {
          await this.sleep(this.retryDelayMs(attempt));
          continue;
        }

        if (response.status >= 500) {
          throw new ServiceUnavailableException(
            "Payment provider is temporarily unavailable. Please retry in a few moments.",
          );
        }

        throw new BadRequestException(providerMessage);
      } catch (error) {
        clearTimeout(timeoutId);

        if (!this.isRetryableNetworkError(error)) {
          throw error;
        }

        if (!isLastAttempt) {
          await this.sleep(this.retryDelayMs(attempt));
          continue;
        }

        throw new ServiceUnavailableException(
          "Payment provider is temporarily unavailable. Please retry in a few moments.",
        );
      }
    }

    throw new ServiceUnavailableException(
      "Payment provider is temporarily unavailable. Please retry in a few moments.",
    );
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

  private isRetryableStatus(status: number) {
    return (
      status === 408 ||
      status === 429 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  private isRetryableNetworkError(error: unknown) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return true;
    }

    if (!(error instanceof Error)) {
      return false;
    }

    const code = (error as { code?: string }).code;
    const message = error.message.toLowerCase();

    if (
      code === "UND_ERR_CONNECT_TIMEOUT" ||
      code === "UND_ERR_HEADERS_TIMEOUT"
    ) {
      return true;
    }

    return (
      message.includes("fetch failed") ||
      message.includes("connect timeout") ||
      message.includes("network") ||
      message.includes("timed out")
    );
  }

  private retryDelayMs(attempt: number) {
    const baseDelayMs = 300;
    return baseDelayMs * Math.pow(2, attempt - 1);
  }

  private sleep(delayMs: number) {
    return new Promise<void>((resolve) => {
      setTimeout(resolve, delayMs);
    });
  }

  private readApiKey(value: string | undefined) {
    const sanitized = this.readSecret(value);
    return sanitized ? sanitized.replace(/\s+/g, "") : undefined;
  }

  private getApiKey() {
    return this.readApiKey(
      process.env.CAMPAY_API_KEY || process.env.CAMPAY_PERMANENT_TOKEN,
    );
  }

  private getBaseUrl() {
    return this.readSecret(
      process.env.CAMPAY_BASE_URL || process.env.CAMPAY_API_BASE_URL,
    );
  }

  private getWebhookSecret() {
    return this.readSecret(
      process.env.CAMPAY_WEBHOOK_SECRET || process.env.CAMPAY_WEBHOOK_KEY,
    );
  }

  private isJwtLike(value: string) {
    return value.split(".").length === 3;
  }

  private verifyHs256JwtSignature(token: string, secret: string) {
    const [headerB64, payloadB64, signatureB64] = token.split(".");

    if (!headerB64 || !payloadB64 || !signatureB64) {
      return false;
    }

    const header = this.tryParseJson(this.decodeBase64Url(headerB64));

    if (header?.alg !== "HS256") {
      return false;
    }

    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(signingInput)
      .digest();
    const providedSignature = this.decodeBase64UrlToBuffer(signatureB64);

    if (
      !providedSignature ||
      providedSignature.length !== expectedSignature.length
    ) {
      return false;
    }

    return timingSafeEqual(providedSignature, expectedSignature);
  }

  private decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
  }

  private decodeBase64UrlToBuffer(value: string) {
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padding =
        normalized.length % 4 === 0
          ? ""
          : "=".repeat(4 - (normalized.length % 4));
      return Buffer.from(`${normalized}${padding}`, "base64");
    } catch {
      return null;
    }
  }

  private isInvalidTokenResponse(statusCode: number, message: string | null) {
    const normalizedMessage = message?.toLowerCase() || "";

    return (
      statusCode === 401 ||
      statusCode === 403 ||
      normalizedMessage.includes("invalid token")
    );
  }

  private resolveMode(baseUrl: string | undefined) {
    if (!baseUrl) {
      return null;
    }

    return baseUrl.includes("demo.campay.net") ? "sandbox" : "live";
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
