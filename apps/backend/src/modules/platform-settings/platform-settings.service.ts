import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { Role, VendorPaymentModel } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { UpdateMonetisationSettingsDto } from "./dto/update-monetisation-settings.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

@Injectable()
export class PlatformSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getSettings() {
    return this.prisma.platformSettings.upsert({
      where: { id: "singleton" },
      update: {},
      create: { id: "singleton" },
    });
  }

  async updateSettings(adminUserId: string, dto: UpdatePlatformSettingsDto) {
    const currentSettings = await this.getSettings();

    const nextSettings = {
      withdrawalThresholdMin:
        dto.withdrawalThresholdMin ?? currentSettings.withdrawalThresholdMin,
      withdrawalThresholdDefault:
        dto.withdrawalThresholdDefault ??
        currentSettings.withdrawalThresholdDefault,
      withdrawalThresholdMax:
        dto.withdrawalThresholdMax ?? currentSettings.withdrawalThresholdMax,
      maintenanceMode: dto.maintenanceMode ?? currentSettings.maintenanceMode,
    };

    if (
      nextSettings.withdrawalThresholdMin >
        nextSettings.withdrawalThresholdDefault ||
      nextSettings.withdrawalThresholdDefault >
        nextSettings.withdrawalThresholdMax
    ) {
      throw new BadRequestException(
        "withdrawalThresholdMin <= withdrawalThresholdDefault <= withdrawalThresholdMax is required.",
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.platformSettings.update({
        where: {
          id: "singleton",
        },
        data: {
          ...dto,
          updatedById: adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "UPDATE_PLATFORM_SETTINGS",
          entity: "platform_settings",
          entityId: updatedSettings.id,
          metadata: {
            withdrawalThresholdDefault: dto.withdrawalThresholdDefault,
            withdrawalThresholdMin: dto.withdrawalThresholdMin,
            withdrawalThresholdMax: dto.withdrawalThresholdMax,
            maintenanceMode: dto.maintenanceMode,
          },
        },
      });

      this.eventEmitter.emit("admin.settings.updated", {
        updatedById: adminUserId,
      });

      return updatedSettings;
    });
  }

  async getCooperativeThreshold(cooperativeId: string) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const existingSettings = await this.prisma.cooperativeSettings.findUnique({
      where: {
        cooperativeId,
      },
      select: {
        withdrawalThreshold: true,
      },
    });

    if (existingSettings) {
      return {
        threshold: existingSettings.withdrawalThreshold,
        source: "cooperative" as const,
      };
    }

    const platformSettings = await this.getSettings();

    await this.prisma.cooperativeSettings.create({
      data: {
        cooperativeId,
        withdrawalThreshold: platformSettings.withdrawalThresholdDefault,
      },
    });

    return {
      threshold: platformSettings.withdrawalThresholdDefault,
      source: "platform_default" as const,
    };
  }

  async setCooperativeThreshold(
    adminUserId: string,
    cooperativeId: string,
    threshold: number,
  ) {
    const [cooperative, membership, platformSettings] = await Promise.all([
      this.prisma.cooperative.findUnique({
        where: {
          id: cooperativeId,
        },
        select: {
          id: true,
        },
      }),
      this.prisma.membership.findUnique({
        where: {
          userId_cooperativeId: {
            userId: adminUserId,
            cooperativeId,
          },
        },
        select: {
          role: true,
        },
      }),
      this.getSettings(),
    ]);

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    if (membership?.role !== Role.COOP_ADMIN) {
      throw new ForbiddenException("Cooperative admin access is required.");
    }

    if (threshold < platformSettings.withdrawalThresholdMin) {
      throw new BadRequestException(
        `threshold must be at least ${platformSettings.withdrawalThresholdMin}.`,
      );
    }

    if (threshold > platformSettings.withdrawalThresholdMax) {
      throw new BadRequestException(
        `threshold must be at most ${platformSettings.withdrawalThresholdMax}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const settings = await tx.cooperativeSettings.upsert({
        where: {
          cooperativeId,
        },
        update: {
          withdrawalThreshold: threshold,
        },
        create: {
          cooperativeId,
          withdrawalThreshold: threshold,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          cooperativeId,
          action: "UPDATE_COOPERATIVE_WITHDRAWAL_THRESHOLD",
          entity: "cooperative_settings",
          entityId: settings.id,
          metadata: {
            threshold,
          },
        },
      });

      return {
        threshold: settings.withdrawalThreshold,
        source: "cooperative" as const,
      };
    });
  }

  async getMonetisationSettings() {
    const settings = await this.getSettings();

    return {
      withdrawalFeePercent: settings.withdrawalFeePercent,
      vendorPaymentModel: settings.vendorPaymentModel,
      vendorOneTimeFeeXAF: settings.vendorOneTimeFeeXAF,
      vendorMonthlyFeeXAF: settings.vendorMonthlyFeeXAF,
      vendorYearlyFeeXAF: settings.vendorYearlyFeeXAF,
    };
  }

  async updateMonetisationSettings(
    adminUserId: string,
    dto: UpdateMonetisationSettingsDto,
  ) {
    const currentSettings = await this.getSettings();
    const nextWithdrawalFeePercent =
      dto.withdrawalFeePercent ?? currentSettings.withdrawalFeePercent;

    if (nextWithdrawalFeePercent < 0 || nextWithdrawalFeePercent > 50) {
      throw new BadRequestException(
        "withdrawalFeePercent must be between 0 and 50.",
      );
    }

    const nextVendorPaymentModel =
      dto.vendorPaymentModel ?? currentSettings.vendorPaymentModel;

    if (!Object.values(VendorPaymentModel).includes(nextVendorPaymentModel)) {
      throw new BadRequestException("Invalid vendorPaymentModel value.");
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedSettings = await tx.platformSettings.update({
        where: { id: "singleton" },
        data: {
          ...dto,
          updatedById: adminUserId,
        },
      });

      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "UPDATE_MONETISATION_SETTINGS",
          entity: "platform_settings",
          entityId: updatedSettings.id,
          metadata: {
            previous: {
              withdrawalFeePercent: currentSettings.withdrawalFeePercent,
              vendorPaymentModel: currentSettings.vendorPaymentModel,
              vendorOneTimeFeeXAF: currentSettings.vendorOneTimeFeeXAF,
              vendorMonthlyFeeXAF: currentSettings.vendorMonthlyFeeXAF,
              vendorYearlyFeeXAF: currentSettings.vendorYearlyFeeXAF,
            },
            next: {
              withdrawalFeePercent: updatedSettings.withdrawalFeePercent,
              vendorPaymentModel: updatedSettings.vendorPaymentModel,
              vendorOneTimeFeeXAF: updatedSettings.vendorOneTimeFeeXAF,
              vendorMonthlyFeeXAF: updatedSettings.vendorMonthlyFeeXAF,
              vendorYearlyFeeXAF: updatedSettings.vendorYearlyFeeXAF,
            },
            vendorRecordsUpdated: false,
          },
        },
      });

      return {
        withdrawalFeePercent: updatedSettings.withdrawalFeePercent,
        vendorPaymentModel: updatedSettings.vendorPaymentModel,
        vendorOneTimeFeeXAF: updatedSettings.vendorOneTimeFeeXAF,
        vendorMonthlyFeeXAF: updatedSettings.vendorMonthlyFeeXAF,
        vendorYearlyFeeXAF: updatedSettings.vendorYearlyFeeXAF,
      };
    });
  }

  async calculateWithdrawalFee(amountXAF: number) {
    const settings = await this.getMonetisationSettings();
    const fee = Math.round(amountXAF * (settings.withdrawalFeePercent / 100));
    const netAmount = amountXAF - fee;

    return { fee, netAmount };
  }

  async calculateTargetWithFee(baseTargetXAF: number) {
    const settings = await this.getMonetisationSettings();

    return (
      baseTargetXAF +
      Math.round(baseTargetXAF * (settings.withdrawalFeePercent / 100))
    );
  }

  async recomputeCooperativeTargets() {
    const settings = await this.getMonetisationSettings();
    const cooperatives = await this.prisma.cooperative.findMany({
      where: {
        baseTargetXAF: {
          not: null,
        },
      },
      select: {
        id: true,
        baseTargetXAF: true,
      },
    });

    if (cooperatives.length === 0) {
      return { updatedCount: 0 };
    }

    await this.prisma.$transaction(
      cooperatives.map((cooperative) => {
        const baseTargetXAF = cooperative.baseTargetXAF ?? 0;
        const targetAmountXAF =
          baseTargetXAF +
          Math.round(baseTargetXAF * (settings.withdrawalFeePercent / 100));

        return this.prisma.cooperative.update({
          where: {
            id: cooperative.id,
          },
          data: {
            targetAmountXAF,
          },
        });
      }),
    );

    return { updatedCount: cooperatives.length };
  }
}
