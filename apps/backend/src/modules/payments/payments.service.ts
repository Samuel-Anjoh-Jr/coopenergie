import { randomUUID } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { PaymentProvider, PaymentStatus } from "@prisma/client";
import { PubSub } from "graphql-subscriptions";

import { PUBSUB } from "../../graphql/pubsub.module";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ContributionsService } from "../contributions/contributions.service";
import { CampayService } from "./campay.service";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

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
    amountXAF: number,
    phoneNumber: string,
  ) {
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
      throw new ForbiddenException("You do not have access to this cooperative.");
    }

    const idempotencyKey = randomUUID();
    const reference = `COOP-${cooperativeId.slice(0, 8)}-${Date.now()}`;

    const payment = await this.prisma.payment.create({
      data: {
        userId,
        cooperativeId,
        amountXAF,
        status: PaymentStatus.PENDING,
        provider: PaymentProvider.CAMPAY,
        reference,
        idempotencyKey,
        phoneNumber,
      },
    });

    try {
      await this.campayService.initiatePayment(
        amountXAF,
        "XAF",
        phoneNumber,
        `Contribution for cooperative ${cooperative.name}`,
        reference,
      );
    } catch (error) {
      await this.prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: PaymentStatus.FAILED,
        },
      });
      throw error;
    }

    return {
      paymentId: payment.id,
      reference: payment.reference,
      status: PaymentStatus.PENDING,
      message: "Confirm on your phone",
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

    const status = (this.readString(payload.status) || "").toUpperCase();

    if (status === "SUCCESSFUL") {
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
      await this.pubSub.publish(`payment.updated.${updatedPayment.cooperativeId}`, {
        onPayment: updatedPayment,
      });

      return {
        acknowledged: true,
        status: updatedPayment.status,
      };
    }

    if (status === "FAILED") {
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
      await this.pubSub.publish(`payment.updated.${updatedPayment.cooperativeId}`, {
        onPayment: updatedPayment,
      });

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

  private readString(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }
}
