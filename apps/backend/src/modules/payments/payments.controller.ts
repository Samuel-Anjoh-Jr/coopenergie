import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";

import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { VendorPaymentsService } from "../vendors/vendor-payments.service";
import { InitiatePaymentDto } from "./dto/initiate-payment.dto";
import { PaymentsService } from "./payments.service";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post("initiate")
  initiate(
    @CurrentUser() user: { userId: string },
    @Body() body: InitiatePaymentDto,
  ) {
    return this.paymentsService.initiate(
      user.userId,
      body.cooperativeId,
      body.idempotencyKey,
      body.amountXAF,
      body.phoneNumber,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  getPayment(@CurrentUser() user: { userId: string }, @Param("id") id: string) {
    return this.paymentsService.getPayment(user.userId, id);
  }
}

@Controller("payments/webhook")
export class PaymentsWebhookController {
  private readonly logger = new Logger(PaymentsWebhookController.name);

  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly vendorPaymentsService: VendorPaymentsService,
  ) {}

  @Get()
  handleWebhookGet(
    @Query() query: Record<string, unknown>,
    @Req() request: any,
  ) {
    const payload = this.normalizePayload(query);
    const signature =
      this.readPayloadSignature(payload) ||
      this.readAuthorizationBearerToken(request) ||
      "";

    return this.handleWithVendorFallback(payload, String(signature), "");
  }

  @Post()
  handleWebhook(@Req() request: any) {
    const rawBody = this.getRawBody(request);
    const bodyPayload = this.getPayload(request, rawBody);
    const queryPayload = this.normalizePayload(
      (request.query || {}) as Record<string, unknown>,
    );
    const payload = {
      ...queryPayload,
      ...bodyPayload,
    };
    const signature =
      this.readHeader(
        request,
        "x-campay-signature",
        "campay-signature",
        "x-signature",
        "x-webhook-signature",
        "webhook-signature",
      ) ||
      this.readAuthorizationBearerToken(request) ||
      this.readPayloadSignature(payload) ||
      this.readPayloadSignature(queryPayload) ||
      "";

    return this.handleWithVendorFallback(payload, String(signature), rawBody);
  }

  private async handleWithVendorFallback(
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string,
  ) {
    try {
      return await this.paymentsService.handleWebhook(payload, signature, rawBody);
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }

      this.logger.debug("Primary payment webhook did not match a contribution payment reference.");
    }

    const reference = this.readReference(payload);
    const campayStatus = this.readStatus(payload);

    if (!reference || !campayStatus) {
      throw new NotFoundException("No matching payment reference was found for this webhook payload.");
    }

    try {
      const vendorResult = await this.vendorPaymentsService.handleVendorPaymentWebhook(
        reference,
        campayStatus,
      );

      if (!vendorResult.handled) {
        throw new NotFoundException("No matching payment reference was found for this webhook payload.");
      }

      return {
        acknowledged: true,
        type: "vendor",
        result: vendorResult,
      };
    } catch (error) {
      this.logger.error(
        `Vendor webhook fallback failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw error;
    }
  }

  private normalizePayload(payload: Record<string, unknown>) {
    const normalized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(payload)) {
      if (Array.isArray(value)) {
        normalized[key] = value[0];
        continue;
      }

      normalized[key] = value;
    }

    return normalized;
  }

  private getRawBody(request: any) {
    if (Buffer.isBuffer(request.body)) {
      return request.body.toString("utf8");
    }

    if (Buffer.isBuffer(request.rawBody)) {
      return request.rawBody.toString("utf8");
    }

    if (typeof request.body === "string") {
      return request.body;
    }

    if (request.body && typeof request.body === "object") {
      return JSON.stringify(request.body);
    }

    return "";
  }

  private getPayload(request: any, rawBody: string) {
    if (
      request.body &&
      typeof request.body === "object" &&
      !Buffer.isBuffer(request.body)
    ) {
      return request.body as Record<string, unknown>;
    }

    if (!rawBody) {
      return {};
    }

    try {
      return JSON.parse(rawBody) as Record<string, unknown>;
    } catch {
      throw new BadRequestException("Invalid webhook payload.");
    }
  }

  private readHeader(request: any, ...names: string[]) {
    for (const name of names) {
      const value = request.headers?.[name];

      if (typeof value === "string" && value.trim()) {
        return value.trim();
      }

      if (Array.isArray(value) && typeof value[0] === "string") {
        const normalized = value[0].trim();
        if (normalized) {
          return normalized;
        }
      }
    }

    return undefined;
  }

  private readAuthorizationBearerToken(request: any) {
    const authorization = this.readHeader(request, "authorization");

    if (!authorization) {
      return undefined;
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private readPayloadSignature(payload: Record<string, unknown>) {
    const candidates = [
      payload.signature,
      payload.webhook_signature,
      payload.campay_signature,
      payload.token,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return undefined;
  }

  private readReference(payload: Record<string, unknown>) {
    const candidates = [
      payload.reference,
      payload.external_reference,
      payload.externalReference,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return undefined;
  }

  private readStatus(payload: Record<string, unknown>) {
    const candidates = [payload.status, payload.campay_status, payload.payment_status];

    for (const candidate of candidates) {
      if (typeof candidate === "string" && candidate.trim()) {
        return candidate.trim();
      }
    }

    return undefined;
  }
}
