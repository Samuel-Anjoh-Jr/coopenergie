import {
  Args,
  Float,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";
import { ContributionStatus } from "@prisma/client";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { CooperativesService } from "../../modules/cooperatives/cooperatives.service";
import { MembershipsService } from "../../modules/memberships/memberships.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CooperativeType } from "../types/cooperative.type";
import { LedgerEventType } from "../types/ledger-event.type";
import { MemberType } from "../types/member.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => CooperativeType)
export class CooperativeResolver {
  constructor(
    private readonly cooperativesService: CooperativesService,
    private readonly membershipsService: MembershipsService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [CooperativeType])
  myCooperatives(@CurrentUser() user: { userId: string }) {
    return this.cooperativesService.findByUser(user.userId);
  }

  @Query(() => CooperativeType)
  cooperative(
    @Args("id") id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.cooperativesService.findById(id, user.userId);
  }

  @ResolveField("progress", () => Float)
  async progress(@Parent() coop: { id: string; targetAmountXAF: number }) {
    const totalCollected = await this.totalCollected(coop);

    if (coop.targetAmountXAF <= 0) {
      return 0;
    }

    return Number(
      ((totalCollected / coop.targetAmountXAF) * 100).toFixed(2),
    );
  }

  @ResolveField("totalCollected", () => Int)
  async totalCollected(@Parent() coop: { id: string }) {
    const aggregate = await this.prisma.contribution.aggregate({
      where: {
        cooperativeId: coop.id,
        status: ContributionStatus.CONFIRMED,
      },
      _sum: {
        amountXAF: true,
      },
    });

    return aggregate._sum.amountXAF ?? 0;
  }

  @ResolveField("memberCount", () => Int)
  memberCount(@Parent() coop: { id: string }) {
    return this.prisma.membership.count({
      where: {
        cooperativeId: coop.id,
      },
    });
  }

  @ResolveField("members", () => [MemberType])
  async members(@Parent() coop: { id: string }) {
    const members = await this.membershipsService.getMembers(coop.id);
    const contributionTotals = await this.prisma.contribution.groupBy({
      by: ["userId"],
      where: {
        cooperativeId: coop.id,
        status: ContributionStatus.CONFIRMED,
      },
      _sum: {
        amountXAF: true,
      },
    });

    const totalsByUserId = new Map(
      contributionTotals.map((entry) => [entry.userId, entry._sum.amountXAF ?? 0]),
    );

    return members.map((member) => ({
      id: member.user.id,
      name: member.user.name,
      email: member.user.email,
      role: member.role,
      joinedAt: member.joinedAt,
      totalContributed: totalsByUserId.get(member.userId) ?? 0,
    }));
  }

  @ResolveField("recentActivity", () => [LedgerEventType])
  async recentActivity(@Parent() coop: { id: string }) {
    const events = await this.prisma.ledgerEvent.findMany({
      where: {
        cooperativeId: coop.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 10,
    });

    const celoscanBase =
      process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() || "https://celoscan.io";

    return events.map((event) => ({
      ...event,
      celoScanUrl: `${celoscanBase.replace(/\/+$/, "")}/tx/${event.txHash}`,
    }));
  }
}
