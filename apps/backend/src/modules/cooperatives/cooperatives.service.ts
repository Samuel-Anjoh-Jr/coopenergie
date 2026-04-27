import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";

import { EventListenerService } from "../../blockchain/event-listener.service";
import { FactoryService } from "../../blockchain/factory.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCooperativeDto } from "./dto/create-cooperative.dto";

@Injectable()
export class CooperativesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly factoryService: FactoryService,
    private readonly eventListenerService: EventListenerService,
  ) {}

  async create(
    userId: string,
    { name, targetAmountXAF }: CreateCooperativeDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        celoAddress: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (!user.celoAddress) {
      throw new BadRequestException(
        "User must have a CELO address before creating a cooperative.",
      );
    }

    const normalizedName = name.trim();
    const slug = this.generateSlug(normalizedName);

    if (!slug) {
      throw new BadRequestException(
        "Cooperative name cannot produce a valid slug.",
      );
    }

    try {
      const cooperative = await this.prisma.$transaction(async (tx) => {
        const createdCooperative = await tx.cooperative.create({
          data: {
            name: normalizedName,
            slug,
            targetAmountXAF,
          },
        });

        await tx.membership.create({
          data: {
            userId,
            cooperativeId: createdCooperative.id,
            role: Role.COOP_ADMIN,
          },
        });

        return createdCooperative;
      });

      const deployment = await this.factoryService.deployCooperative(
        normalizedName,
        targetAmountXAF,
        user.celoAddress,
      );

      const updatedCooperative = await this.prisma.cooperative.update({
        where: {
          id: cooperative.id,
        },
        data: {
          vaultAddress: deployment.vaultAddress,
          celoScanUrl: deployment.celoScanUrl,
          vaultAdminAddress: user.celoAddress, // Persist admin address
        },
      });

      await this.eventListenerService.addVaultToWatch(
        deployment.vaultAddress,
        cooperative.id,
      );

      return updatedCooperative;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "A cooperative with this name already exists.",
        );
      }

      throw error;
    }
  }

  async findByUser(userId: string) {
    return this.prisma.cooperative.findMany({
      where: {
        memberships: {
          some: {
            userId,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  async findById(id: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId: id,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id,
      },
      include: {
        _count: {
          select: {
            memberships: true,
          },
        },
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    return {
      ...cooperative,
      memberCount: cooperative._count.memberships,
      _count: undefined,
    };
  }

  async getProgress(id: string) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id,
      },
      select: {
        confirmedBalanceXAF: true,
        targetAmountXAF: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const totalCollected = cooperative.confirmedBalanceXAF;
    const target = cooperative.targetAmountXAF;
    const percentage =
      target > 0 ? Number(((totalCollected / target) * 100).toFixed(2)) : 0;

    return {
      totalCollected,
      target,
      percentage,
    };
  }

  private generateSlug(name: string) {
    return name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }
}
