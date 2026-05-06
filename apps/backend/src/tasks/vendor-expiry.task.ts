import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import {
  VendorAccountStatus,
  VendorSubscriptionStatus,
} from "@prisma/client";

import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class VendorExpiryTask {
  private readonly logger = new Logger(VendorExpiryTask.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) {}

  @Cron("0 2 * * *")
  async expireOverdueSubscriptions() {
    const now = new Date();

    const overdueSubscriptions = await this.prisma.vendorSubscriptionRecord.findMany({
      where: {
        status: VendorSubscriptionStatus.ACTIVE,
        expiresAt: {
          lt: now,
        },
      },
      include: {
        vendor: {
          include: {
            user: {
              select: { email: true, preferredLocale: true },
            },
          },
        },
      },
    });

    for (const subscription of overdueSubscriptions) {
      await this.prisma.$transaction(async (transaction) => {
        await transaction.vendorSubscriptionRecord.update({
          where: { id: subscription.id },
          data: {
            status: VendorSubscriptionStatus.EXPIRED,
          },
        });

        await transaction.vendor.update({
          where: { id: subscription.vendorId },
          data: {
            status: VendorAccountStatus.SUBSCRIPTION_EXPIRED,
          },
        });

        await transaction.auditLog.create({
          data: {
            userId: subscription.vendor.userId,
            action: "VENDOR_SUBSCRIPTION_EXPIRED",
            entity: "VendorSubscriptionRecord",
            entityId: subscription.id,
            metadata: {
              subscriptionId: subscription.id,
              expiredAt: now,
              previousExpiresAt: subscription.expiresAt,
            },
          },
        });
      });

      await this.mailService.sendSubscriptionExpiredNotification(
        subscription.vendor.email ?? subscription.vendor.user.email,
        subscription.vendor.businessName,
        subscription.vendor.user.preferredLocale ?? "fr",
      );

      this.logger.log(`Expired vendor subscription ${subscription.id} for vendor ${subscription.vendorId}`);
    }
  }
}
