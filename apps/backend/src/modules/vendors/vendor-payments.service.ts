import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  VendorAccountStatus,
  VendorPaymentModel,
  VendorSubscriptionStatus,
} from "@prisma/client";

import { MailService } from "../../mail/mail.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CampayService } from "../payments/campay.service";

@Injectable()
export class VendorPaymentsService {
  private readonly logger = new Logger(VendorPaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly campayService: CampayService,
    private readonly notificationsService: NotificationsService,
    private readonly mailService: MailService,
  ) {}

  async initiateOneTimeRegistrationPayment(
    vendorId: string,
    phoneNumber: string,
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: { id: true, email: true, preferredLocale: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    if (vendor.paymentModel !== VendorPaymentModel.ONE_TIME) {
      throw new BadRequestException(
        "This vendor is not configured for one-time registration payment.",
      );
    }

    if (vendor.status !== VendorAccountStatus.PENDING_PAYMENT) {
      throw new BadRequestException(
        "Vendor registration payment is not required for this account.",
      );
    }

    const platformSettings = await this.prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
      select: { vendorOneTimeFeeXAF: true },
    });

    const amount = platformSettings.vendorOneTimeFeeXAF;

    if (amount <= 0) {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.vendor.update({
          where: { id: vendor.id },
          data: {
            status: VendorAccountStatus.ACTIVE,
            campayRegistrationRef: null,
          },
        });

        await transaction.auditLog.create({
          data: {
            userId: vendor.userId,
            action: "VENDOR_REGISTRATION_ACTIVATED_NO_FEE",
            entity: "Vendor",
            entityId: vendor.id,
            metadata: {
              vendorId: vendor.id,
              reason: "One-time fee set to zero",
            },
          },
        });
      });

      await this.notificationsService.notifyPaymentConfirmed(vendor.user.id, 0);
      await this.mailService.sendVendorRegistrationActivatedNotification(
        vendor.email ?? vendor.user.email,
        vendor.businessName,
        vendor.user.preferredLocale ?? "fr",
      );

      return {
        status: VendorAccountStatus.ACTIVE,
        paymentRequired: false,
      };
    }

    const reference = this.buildReference("REG", vendor.id);

    await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { campayRegistrationRef: reference },
    });

    const payment = await this.campayService.initiatePayment(
      amount,
      "XAF",
      phoneNumber,
      `Vendor registration fee for ${vendor.businessName}`,
      reference,
    );

    return {
      status: VendorAccountStatus.PENDING_PAYMENT,
      paymentRequired: true,
      amountXAF: amount,
      reference,
      campay: payment,
    };
  }

  async initiateSubscription(
    vendorId: string,
    phoneNumber: string,
    billingCycle: "MONTHLY" | "YEARLY",
  ) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      include: {
        user: {
          select: { id: true, email: true, preferredLocale: true },
        },
      },
    });

    if (!vendor) {
      throw new NotFoundException("Vendor not found.");
    }

    if (vendor.paymentModel !== VendorPaymentModel.SUBSCRIPTION) {
      throw new BadRequestException(
        "This vendor is not configured for subscription payments.",
      );
    }

    if (
      vendor.status !== VendorAccountStatus.ACTIVE &&
      vendor.status !== VendorAccountStatus.SUBSCRIPTION_EXPIRED
    ) {
      throw new BadRequestException(
        "Vendor is not eligible for a subscription payment.",
      );
    }

    const platformSettings = await this.prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
      select: { vendorMonthlyFeeXAF: true, vendorYearlyFeeXAF: true },
    });

    const amount =
      billingCycle === "MONTHLY"
        ? platformSettings.vendorMonthlyFeeXAF
        : platformSettings.vendorYearlyFeeXAF;

    const reference = this.buildReference(
      billingCycle === "MONTHLY" ? "SUBM" : "SUBY",
      vendor.id,
    );
    const startsAt = new Date();
    const expiresAt = this.getNextExpiration(startsAt, billingCycle);

    if (amount <= 0) {
      const activated = await this.prisma.$transaction(async (transaction) => {
        const record = await transaction.vendorSubscriptionRecord.create({
          data: {
            vendorId: vendor.id,
            priceXAF: amount,
            billingCycle,
            status: VendorSubscriptionStatus.ACTIVE,
            campayReference: reference,
            startedAt: startsAt,
            expiresAt,
          },
        });

        await transaction.vendor.update({
          where: { id: vendor.id },
          data: { status: VendorAccountStatus.ACTIVE },
        });

        await transaction.auditLog.create({
          data: {
            userId: vendor.userId,
            action: "VENDOR_SUBSCRIPTION_ACTIVATED_NO_FEE",
            entity: "Vendor",
            entityId: vendor.id,
            metadata: {
              vendorId: vendor.id,
              billingCycle,
              startsAt,
              expiresAt,
            },
          },
        });

        return record;
      });

      await this.notificationsService.notifyPaymentConfirmed(
        vendor.user.id,
        amount,
      );
      await this.mailService.sendVendorSubscriptionActivatedNotification(
        vendor.email ?? vendor.user.email,
        vendor.businessName,
        billingCycle,
        expiresAt,
        vendor.user.preferredLocale ?? "fr",
      );

      return {
        status: activated.status,
        paymentRequired: false,
        amountXAF: amount,
        billingCycle,
        expiresAt,
      };
    }

    const subscription = await this.prisma.vendorSubscriptionRecord.create({
      data: {
        vendorId: vendor.id,
        priceXAF: amount,
        billingCycle,
        status: VendorSubscriptionStatus.PENDING,
        campayReference: reference,
      },
    });

    const payment = await this.campayService.initiatePayment(
      amount,
      "XAF",
      phoneNumber,
      `Vendor subscription ${billingCycle.toLowerCase()} for ${vendor.businessName}`,
      reference,
    );

    return {
      id: subscription.id,
      status: subscription.status,
      paymentRequired: true,
      amountXAF: amount,
      billingCycle,
      reference,
      campay: payment,
      expiresAtPreview: expiresAt,
    };
  }

  async handleVendorPaymentWebhook(reference: string, campayStatus: string) {
    const normalizedStatus = (campayStatus ?? "").toUpperCase();

    if (!reference || !normalizedStatus) {
      return { handled: false };
    }

    const subscription = await this.prisma.vendorSubscriptionRecord.findUnique({
      where: { campayReference: reference },
      include: {
        vendor: {
          include: {
            user: {
              select: { id: true, email: true, preferredLocale: true },
            },
          },
        },
      },
    });

    if (subscription) {
      const cycle =
        subscription.billingCycle === "YEARLY" ? "YEARLY" : "MONTHLY";

      if (normalizedStatus === "SUCCESSFUL") {
        const startsAt = new Date();
        const expiresAt = this.getNextExpiration(startsAt, cycle);

        await this.prisma.$transaction(async (transaction) => {
          await transaction.vendorSubscriptionRecord.update({
            where: { id: subscription.id },
            data: {
              status: VendorSubscriptionStatus.ACTIVE,
              startedAt: startsAt,
              expiresAt,
            },
          });

          await transaction.vendor.update({
            where: { id: subscription.vendorId },
            data: { status: VendorAccountStatus.ACTIVE },
          });

          await transaction.auditLog.create({
            data: {
              userId: subscription.vendor.userId,
              action: "VENDOR_SUBSCRIPTION_ACTIVATED",
              entity: "VendorSubscriptionRecord",
              entityId: subscription.id,
              metadata: {
                reference,
                billingCycle: cycle,
                startsAt,
                expiresAt,
              },
            },
          });
        });

        await this.notificationsService.notifyPaymentConfirmed(
          subscription.vendor.user.id,
          subscription.priceXAF,
        );
        await this.mailService.sendVendorSubscriptionActivatedNotification(
          subscription.vendor.email ?? subscription.vendor.user.email,
          subscription.vendor.businessName,
          cycle,
          expiresAt,
          subscription.vendor.user.preferredLocale ?? "fr",
        );

        return { handled: true, type: "subscription", status: "ACTIVE" };
      }

      if (normalizedStatus === "FAILED") {
        await this.prisma.vendorSubscriptionRecord.update({
          where: { id: subscription.id },
          data: { status: VendorSubscriptionStatus.CANCELLED },
        });

        await this.notificationsService.notifyPaymentFailed(
          subscription.vendor.user.id,
          subscription.priceXAF,
        );

        return { handled: true, type: "subscription", status: "CANCELLED" };
      }

      return {
        handled: true,
        type: "subscription",
        status: subscription.status,
      };
    }

    const vendor = await this.prisma.vendor.findUnique({
      where: { campayRegistrationRef: reference },
      include: {
        user: {
          select: { id: true, email: true, preferredLocale: true },
        },
      },
    });

    if (!vendor) {
      return { handled: false };
    }

    if (normalizedStatus === "SUCCESSFUL") {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.vendor.update({
          where: { id: vendor.id },
          data: {
            status: VendorAccountStatus.ACTIVE,
            campayRegistrationRef: null,
          },
        });

        await transaction.auditLog.create({
          data: {
            userId: vendor.userId,
            action: "VENDOR_REGISTRATION_ACTIVATED",
            entity: "Vendor",
            entityId: vendor.id,
            metadata: {
              reference,
            },
          },
        });
      });

      await this.notificationsService.notifyPaymentConfirmed(vendor.user.id, 0);
      await this.mailService.sendVendorRegistrationActivatedNotification(
        vendor.email ?? vendor.user.email,
        vendor.businessName,
        vendor.user.preferredLocale ?? "fr",
      );

      return { handled: true, type: "registration", status: "ACTIVE" };
    }

    if (normalizedStatus === "FAILED") {
      await this.notificationsService.notifyPaymentFailed(vendor.user.id, 0);
      return { handled: true, type: "registration", status: "PENDING_PAYMENT" };
    }

    this.logger.warn(
      `Vendor webhook ignored for reference ${reference} with status ${normalizedStatus}`,
    );
    return { handled: true, type: "registration", status: vendor.status };
  }

  private buildReference(prefix: string, vendorId: string) {
    return `VENDOR-${prefix}-${vendorId.slice(0, 8)}-${Date.now()}`;
  }

  private getNextExpiration(from: Date, billingCycle: "MONTHLY" | "YEARLY") {
    const expiresAt = new Date(from);

    if (billingCycle === "YEARLY") {
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      return expiresAt;
    }

    expiresAt.setMonth(expiresAt.getMonth() + 1);
    return expiresAt;
  }
}
