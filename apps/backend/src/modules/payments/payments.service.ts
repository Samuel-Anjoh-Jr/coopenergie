import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { PaymentProvider, PaymentStatus, Prisma } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";

import { detectCameroonCarrier } from "../../common/phone-utils";
import { PUBSUB } from "../../graphql/graphql.tokens";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ContributionsService } from "../contributions/contributions.service";
import { CampayService } from "./campay.service";

const PENDING_STATUS_SYNC_MIN_INTERVAL_MS = 15000;

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly pendingStatusLastSyncAt = new Map<string, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly campayService: CampayService,
    private readonly contributionsService: ContributionsService,
    private readonly notificationsService: NotificationsService,
    @Inject(PUBSUB) private readonly pubSub: PubSub,
  ) {}

  async initiate(
    userId: string,
    cooperativeId: string,
    idempotencyKey: string,
    amountXAF: number,
    phoneNumber: string,
  ) {
    const detectedCarrier = detectCameroonCarrier(phoneNumber);

    if (!detectedCarrier) {
      throw new BadRequestException(
        "A valid MTN or Orange Cameroon mobile money number is required.",
      );
    }

    const normalizedPhoneNumber = detectedCarrier.normalizedPhone;

    const [user, cooperative, membership] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          id: userId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.cooperative.findUnique({
        where: {
          id: cooperativeId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      this.prisma.membership.findUnique({
        where: {
          userId_cooperativeId: {
            userId,
            cooperativeId,
          },
        },
        select: {
          userId: true,
        },
      }),
    ]);

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }

    const existingPayment = await this.prisma.payment.findUnique({
      where: {
        idempotencyKey,
      },
    });

    if (existingPayment) {
      if (
        existingPayment.userId !== userId ||
        existingPayment.cooperativeId !== cooperativeId
      ) {
        throw new ForbiddenException(
          "This idempotency key is already assigned to another payment.",
        );
      }

      return this.buildInitiateResponse(existingPayment);
    }

    const reference = `COOP-${cooperativeId.slice(0, 8)}-${Date.now()}`;

    let payment;

    try {
      payment = await this.prisma.payment.create({
        data: {
          userId,
          cooperativeId,
          amountXAF,
          status: PaymentStatus.PENDING,
          provider: PaymentProvider.CAMPAY,
          reference,
          idempotencyKey,
          phoneNumber: normalizedPhoneNumber,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const duplicatePayment = await this.prisma.payment.findUnique({
          where: {
            idempotencyKey,
          },
        });

        if (!duplicatePayment) {
          throw error;
        }

        if (
          duplicatePayment.userId !== userId ||
          duplicatePayment.cooperativeId !== cooperativeId
        ) {
          throw new ForbiddenException(
            "This idempotency key is already assigned to another payment.",
          );
        }

        return this.buildInitiateResponse(duplicatePayment);
      }

      throw error;
    }

    try {
      await this.campayService.initiatePayment(
        amountXAF,
        "XAF",
        normalizedPhoneNumber,
        `Contribution for cooperative ${cooperative.name}`,
        reference,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);

      this.logger.warn(
        `CamPay initiate failed for payment ${payment.id} (${normalizedPhoneNumber}): ${errorMessage}`,
      );

      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      if (errorMessage.toLowerCase().includes("invalid token")) {
        throw new InternalServerErrorException(
          "Payment provider configuration error. Verify CAMPAY_PERMANENT_TOKEN/CAMPAY_API_KEY and CAMPAY_API_BASE_URL/CAMPAY_BASE_URL.",
        );
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      if (error instanceof ServiceUnavailableException) {
        throw error;
      }

      if (
        errorMessage.toLowerCase().includes("timeout") ||
        errorMessage.toLowerCase().includes("network") ||
        errorMessage.toLowerCase().includes("fetch failed")
      ) {
        throw new ServiceUnavailableException(
          "Unable to reach payment provider now. Please retry in a few moments.",
        );
      }

      throw new InternalServerErrorException(
        "Unable to initiate payment right now. Please try again.",
      );
    }

    return this.buildInitiateResponse(payment);
  }

  async getPayment(userId: string, paymentId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: {
        id: paymentId,
      },
      include: {
        contribution: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found.");
    }

    if (payment.userId !== userId) {
      throw new ForbiddenException("You do not have access to this payment.");
    }

    const resolvedPayment = await this.tryResolvePendingPaymentStatus(payment);

    return {
      paymentId: resolvedPayment.id,
      reference: resolvedPayment.reference,
      status: resolvedPayment.status,
      amountXAF: resolvedPayment.amountXAF,
      cooperativeId: resolvedPayment.cooperativeId,
      createdAt: resolvedPayment.createdAt,
      updatedAt: resolvedPayment.updatedAt,
    };
  }

  async handleWebhook(
    payload: Record<string, unknown>,
    signature: string,
    rawBody: string,
  ) {
    const validSignature = this.campayService.verifyWebhookSignature(
      rawBody,
      signature,
    );

    if (!validSignature) {
      throw new BadRequestException("Invalid webhook signature.");
    }

    const reference =
      this.readString(payload.external_reference) ||
      this.readString(payload.reference);

    if (!reference) {
      throw new BadRequestException("Missing payment reference.");
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        reference,
      },
      include: {
        contribution: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException("Payment not found.");
    }

    if (payment.status === PaymentStatus.SUCCESS) {
      await this.ensureContributionRecorded(payment);
      return {
        acknowledged: true,
        status: payment.status,
      };
    }

    const providerStatus = this.resolveProviderPaymentStatus(payload);

    if (providerStatus === PaymentStatus.SUCCESS) {
      const updatedPayment = await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.SUCCESS,
        },
      });

      await this.ensureContributionRecorded({
        ...updatedPayment,
        contribution: payment.contribution,
      });
      await this.notificationsService.notifyPaymentConfirmed(
        updatedPayment.userId,
        updatedPayment.amountXAF,
      );
      await this.pubSub.publish(
        `payment.updated.${updatedPayment.cooperativeId}`,
        {
          onPayment: updatedPayment,
        },
      );

      return {
        acknowledged: true,
        status: updatedPayment.status,
      };
    }

    if (providerStatus === PaymentStatus.FAILED) {
      const updatedPayment = await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });

      await this.notificationsService.notifyPaymentFailed(
        updatedPayment.userId,
        updatedPayment.amountXAF,
      );
      await this.pubSub.publish(
        `payment.updated.${updatedPayment.cooperativeId}`,
        {
          onPayment: updatedPayment,
        },
      );

      return {
        acknowledged: true,
        status: updatedPayment.status,
      };
    }

    return {
      acknowledged: true,
      status: payment.status,
    };
  }

  private async ensureContributionRecorded(payment: {
    id: string;
    amountXAF: number;
    cooperativeId: string;
    contribution?: {
      id: string;
    } | null;
    status: PaymentStatus;
    userId: string;
  }) {
    if (payment.contribution) {
      return payment.contribution;
    }

    try {
      return await this.contributionsService.create(
        payment.userId,
        payment.cooperativeId,
        payment.amountXAF,
        payment.id,
      );
    } catch (error) {
      this.logger.error(
        `Failed to record contribution for payment ${payment.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  private buildInitiateResponse(payment: {
    id: string;
    reference: string;
    status: PaymentStatus;
  }) {
    return {
      paymentId: payment.id,
      reference: payment.reference,
      status: payment.status,
      message: "Confirm on your phone",
    };
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }

  private async tryResolvePendingPaymentStatus(payment: {
    id: string;
    reference: string;
    status: PaymentStatus;
    amountXAF: number;
    cooperativeId: string;
    userId: string;
    provider: PaymentProvider;
    createdAt: Date;
    updatedAt: Date;
    contribution?: {
      id: string;
    } | null;
  }) {
    if (
      payment.status !== PaymentStatus.PENDING ||
      payment.provider !== PaymentProvider.CAMPAY
    ) {
      this.pendingStatusLastSyncAt.delete(payment.id);
      return payment;
    }

    const now = Date.now();
    const lastSyncedAt = this.pendingStatusLastSyncAt.get(payment.id);

    if (
      typeof lastSyncedAt === "number" &&
      now - lastSyncedAt < PENDING_STATUS_SYNC_MIN_INTERVAL_MS
    ) {
      return payment;
    }

    this.pendingStatusLastSyncAt.set(payment.id, now);

    try {
      const providerPayload = await this.campayService.checkStatus(
        payment.reference,
      );
      const providerStatus = this.resolveProviderPaymentStatus(providerPayload);

      if (!providerStatus || providerStatus === PaymentStatus.PENDING) {
        return payment;
      }

      const updatedPayment = await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: providerStatus,
        },
      });

      if (providerStatus === PaymentStatus.SUCCESS) {
        await this.ensureContributionRecorded({
          ...updatedPayment,
          contribution: payment.contribution,
        });
        await this.notificationsService.notifyPaymentConfirmed(
          updatedPayment.userId,
          updatedPayment.amountXAF,
        );
      }

      if (providerStatus === PaymentStatus.FAILED) {
        await this.notificationsService.notifyPaymentFailed(
          updatedPayment.userId,
          updatedPayment.amountXAF,
        );
      }

      await this.pubSub.publish(
        `payment.updated.${updatedPayment.cooperativeId}`,
        {
          onPayment: updatedPayment,
        },
      );

      if (updatedPayment.status !== PaymentStatus.PENDING) {
        this.pendingStatusLastSyncAt.delete(payment.id);
      }

      return {
        ...payment,
        status: updatedPayment.status,
        updatedAt: updatedPayment.updatedAt,
      };
    } catch (error) {
      this.logger.debug(
        `Unable to refresh pending payment ${payment.id} status from provider: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );

      return payment;
    }
  }

  private resolveProviderPaymentStatus(payload: Record<string, unknown>) {
    const candidates: unknown[] = [
      payload.status,
      payload.campay_status,
      payload.payment_status,
      payload.transaction_status,
    ];

    const nestedData = payload.data;
    if (nestedData && typeof nestedData === "object") {
      const nestedRecord = nestedData as Record<string, unknown>;
      candidates.push(
        nestedRecord.status,
        nestedRecord.campay_status,
        nestedRecord.payment_status,
        nestedRecord.transaction_status,
      );
    }

    for (const candidate of candidates) {
      const normalized = this.normalizeProviderStatusValue(candidate);

      if (normalized === PaymentStatus.SUCCESS) {
        return PaymentStatus.SUCCESS;
      }

      if (normalized === PaymentStatus.FAILED) {
        return PaymentStatus.FAILED;
      }
    }

    return PaymentStatus.PENDING;
  }

  private normalizeProviderStatusValue(value: unknown) {
    if (typeof value !== "string") {
      return undefined;
    }

    const normalized = value
      .trim()
      .toUpperCase()
      .replace(/[\s-]+/g, "_");

    if (
      normalized === "SUCCESS" ||
      normalized === "SUCCESSFUL" ||
      normalized === "SUCCEEDED" ||
      normalized === "COMPLETED" ||
      normalized === "PAID"
    ) {
      return PaymentStatus.SUCCESS;
    }

    if (
      normalized === "FAILED" ||
      normalized === "FAILURE" ||
      normalized === "REJECTED" ||
      normalized === "CANCELLED" ||
      normalized === "CANCELED" ||
      normalized === "EXPIRED" ||
      normalized === "TIMED_OUT" ||
      normalized === "TIMEOUT"
    ) {
      return PaymentStatus.FAILED;
    }

    return undefined;
  }
}
