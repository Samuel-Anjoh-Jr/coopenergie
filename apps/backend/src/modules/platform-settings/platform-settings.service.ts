import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";
import { SetCooperativeThresholdDto } from "./dto/set-cooperative-threshold.dto";
import { UpdatePlatformSettingsDto } from "./dto/update-platform-settings.dto";

@Injectable()
export class PlatformSettingsService {
  constructor(private readonly prisma: PrismaService) {}

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
      withdrawalQuorumMinVotes:
        dto.withdrawalQuorumMinVotes ??
        currentSettings.withdrawalQuorumMinVotes,
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

    if (nextSettings.withdrawalQuorumMinVotes < 1) {
      throw new BadRequestException(
        "withdrawalQuorumMinVotes must be at least 1.",
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
            withdrawalQuorumMinVotes: dto.withdrawalQuorumMinVotes,
            maintenanceMode: dto.maintenanceMode,
          },
        },
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
}
