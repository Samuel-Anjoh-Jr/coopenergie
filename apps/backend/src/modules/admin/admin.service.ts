import { Injectable, NotFoundException } from "@nestjs/common";
import { SubscriptionStatus } from "@prisma/client";

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
}