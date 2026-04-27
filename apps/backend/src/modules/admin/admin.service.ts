import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, SubscriptionStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPlatformMetrics() {
    const [
      totalCooperatives,
      totalUsers,
      contributionsAggregate,
      totalPayments,
      activeSubscriptions,
    ] = await Promise.all([
      this.prisma.cooperative.count(),
      this.prisma.user.count(),
      this.prisma.contribution.aggregate({
        _sum: {
          amountXAF: true,
        },
      }),
      this.prisma.payment.count(),
      this.prisma.subscription.count({
        where: {
          status: SubscriptionStatus.ACTIVE,
        },
      }),
    ]);

    return {
      totalCooperatives,
      totalUsers,
      totalContributionsXAF: contributionsAggregate._sum.amountXAF ?? 0,
      totalPayments,
      activeSubscriptions,
    };
  }

  async getAllCooperatives(page = 1, limit = 20) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? Math.min(limit, 100) : 20;
    const skip = (safePage - 1) * safeLimit;

    const [items, total] = await Promise.all([
      this.prisma.cooperative.findMany({
        orderBy: {
          createdAt: "desc",
        },
        select: {
          id: true,
          name: true,
          slug: true,
          suspended: true,
          withdrawalsLocked: true,
          targetAmountXAF: true,
          confirmedBalanceXAF: true,
          createdAt: true,
          updatedAt: true,
        },
        skip,
        take: safeLimit,
      }),
      this.prisma.cooperative.count(),
    ]);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async suspendUser(userId: string) {
    const existing = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        suspended: true,
      },
    });
  }

  async setCooperativeSuspension(
    adminUserId: string,
    cooperativeId: string,
    suspended: boolean,
  ) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { id: true, name: true, suspended: true },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const updated = await this.prisma.cooperative.update({
      where: { id: cooperativeId },
      data: { suspended },
      select: {
        id: true,
        name: true,
        slug: true,
        suspended: true,
        withdrawalsLocked: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        cooperativeId,
        action: suspended
          ? "ADMIN_SUSPEND_COOPERATIVE"
          : "ADMIN_UNSUSPEND_COOPERATIVE",
        entity: "cooperative",
        entityId: cooperativeId,
        metadata: {
          cooperativeName: cooperative.name,
          previousSuspended: cooperative.suspended,
          nextSuspended: suspended,
        },
      },
    });

    return updated;
  }

  async setCooperativeWithdrawalLock(
    adminUserId: string,
    cooperativeId: string,
    withdrawalsLocked: boolean,
  ) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { id: true, name: true, withdrawalsLocked: true },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const updated = await this.prisma.cooperative.update({
      where: { id: cooperativeId },
      data: { withdrawalsLocked },
      select: {
        id: true,
        name: true,
        slug: true,
        suspended: true,
        withdrawalsLocked: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        cooperativeId,
        action: withdrawalsLocked
          ? "ADMIN_LOCK_COOPERATIVE_WITHDRAWALS"
          : "ADMIN_UNLOCK_COOPERATIVE_WITHDRAWALS",
        entity: "cooperative",
        entityId: cooperativeId,
        metadata: {
          cooperativeName: cooperative.name,
          previousWithdrawalsLocked: cooperative.withdrawalsLocked,
          nextWithdrawalsLocked: withdrawalsLocked,
        },
      },
    });

    return updated;
  }

  async renameCooperativeSlug(
    adminUserId: string,
    cooperativeId: string,
    slug: string,
  ) {
    const trimmedSlug = slug.trim().toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(trimmedSlug)) {
      throw new BadRequestException(
        "slug must contain only lowercase letters, numbers, and single dashes.",
      );
    }

    const cooperative = await this.prisma.cooperative.findUnique({
      where: { id: cooperativeId },
      select: { id: true, name: true, slug: true },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    if (cooperative.slug === trimmedSlug) {
      return {
        id: cooperative.id,
        name: cooperative.name,
        slug: cooperative.slug,
      };
    }

    try {
      const updated = await this.prisma.cooperative.update({
        where: { id: cooperativeId },
        data: { slug: trimmedSlug },
        select: {
          id: true,
          name: true,
          slug: true,
          suspended: true,
          withdrawalsLocked: true,
        },
      });

      await this.prisma.auditLog.create({
        data: {
          userId: adminUserId,
          cooperativeId,
          action: "ADMIN_RENAME_COOPERATIVE_SLUG",
          entity: "cooperative",
          entityId: cooperativeId,
          metadata: {
            cooperativeName: cooperative.name,
            previousSlug: cooperative.slug,
            nextSlug: trimmedSlug,
          },
        },
      });

      return updated;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("That slug is already in use.");
      }

      throw error;
    }
  }

  async getAuditLogs(page = 1, limit = 25, action?: string) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? Math.min(limit, 100) : 25;
    const skip = (safePage - 1) * safeLimit;

    const where: Prisma.AuditLogWhereInput = action
      ? {
          action: {
            contains: action,
            mode: "insensitive",
          },
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: safeLimit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          cooperative: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async getUsers(page = 1, limit = 25, search?: string) {
    const safePage = page > 0 ? page : 1;
    const safeLimit = limit > 0 ? Math.min(limit, 100) : 25;
    const skip = (safePage - 1) * safeLimit;
    const q = search?.trim();

    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            {
              name: {
                contains: q,
                mode: "insensitive",
              },
            },
            {
              email: {
                contains: q,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: safeLimit,
        select: {
          id: true,
          name: true,
          email: true,
          suspended: true,
          isPlatformAdmin: true,
          createdAt: true,
          memberships: {
            select: {
              role: true,
              cooperative: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      items,
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit),
    };
  }

  async setPlatformAdminRole(
    adminUserId: string,
    targetUserId: string,
    isPlatformAdmin: boolean,
  ) {
    const [actor, target] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: adminUserId },
        select: { id: true, email: true },
      }),
      this.prisma.user.findUnique({
        where: { id: targetUserId },
        select: {
          id: true,
          email: true,
          name: true,
          isPlatformAdmin: true,
        },
      }),
    ]);

    if (!actor) {
      throw new NotFoundException("Admin user not found.");
    }

    if (!target) {
      throw new NotFoundException("Target user not found.");
    }

    if (!isPlatformAdmin && adminUserId === targetUserId) {
      throw new BadRequestException(
        "You cannot demote your own platform admin role.",
      );
    }

    if (!isPlatformAdmin && target.isPlatformAdmin) {
      const adminCount = await this.prisma.user.count({
        where: { isPlatformAdmin: true },
      });

      if (adminCount <= 1) {
        throw new BadRequestException(
          "At least one platform admin must remain.",
        );
      }
    }

    const updated = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { isPlatformAdmin },
      select: {
        id: true,
        name: true,
        email: true,
        isPlatformAdmin: true,
        suspended: true,
        createdAt: true,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: adminUserId,
        action: isPlatformAdmin
          ? "ADMIN_PROMOTE_PLATFORM_ADMIN"
          : "ADMIN_DEMOTE_PLATFORM_ADMIN",
        entity: "user",
        entityId: targetUserId,
        metadata: {
          actorEmail: actor.email,
          targetEmail: target.email,
          targetName: target.name,
          previousIsPlatformAdmin: target.isPlatformAdmin,
          nextIsPlatformAdmin: isPlatformAdmin,
        },
      },
    });

    return updated;
  }

  async getCooperativesAdminKeyHealth() {
    // Find all cooperatives with a vaultAdminAddress
    const cooperatives = await this.prisma.cooperative.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        vaultAdminAddress: true,
        vaultAddress: true,
        createdAt: true,
      },
    });

    const results = [];
    for (const coop of cooperatives) {
      if (!coop.vaultAdminAddress) {
        results.push({
          ...coop,
          health: 'no-vault-admin-address',
          message: 'No vault admin address recorded.'
        });
        continue;
      }
      const user = await this.prisma.user.findFirst({
        where: { celoAddress: coop.vaultAdminAddress },
        select: { id: true, name: true, email: true, celoKeyEncrypted: true },
      });
      if (!user) {
        results.push({
          ...coop,
          health: 'no-local-user',
          message: 'No local user with this vault admin address.'
        });
        continue;
      }
      if (!user.celoKeyEncrypted) {
        results.push({
          ...coop,
          health: 'missing-key',
          message: 'Vault admin user exists but has no stored CELO key.',
          user,
        });
        continue;
      }
      results.push({
        ...coop,
        health: 'ok',
        message: 'Vault admin key is present.',
        user,
      });
    }
    return results;
  }
}