import { Args, Query, Resolver } from "@nestjs/graphql";
import {
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import { ContributionStatus, ProposalStatus } from "@prisma/client";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { ReportType } from "../types/report.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class ReportResolver {
  constructor(private readonly prisma: PrismaService) {}

  @Query(() => ReportType)
  async report(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        name: true,
        vaultAddress: true,
        targetAmountXAF: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const [contributionAggregate, proposalCounts, firstContribution] =
      await Promise.all([
        this.prisma.contribution.aggregate({
          where: {
            cooperativeId,
            status: ContributionStatus.CONFIRMED,
          },
          _sum: {
            amountXAF: true,
          },
        }),
        this.prisma.proposal.groupBy({
          by: ["status"],
          where: {
            cooperativeId,
          },
          _count: {
            _all: true,
          },
        }),
        this.prisma.contribution.findFirst({
          where: {
            cooperativeId,
            status: ContributionStatus.CONFIRMED,
          },
          orderBy: {
            createdAt: "asc",
          },
          select: {
            createdAt: true,
          },
        }),
      ]);

    const totalCollected = contributionAggregate._sum.amountXAF ?? 0;
    const targetAmount = cooperative.targetAmountXAF;
    const completionPercent =
      targetAmount > 0
        ? Number(((totalCollected / targetAmount) * 100).toFixed(2))
        : 0;

    const monthsActive = firstContribution
      ? Math.max(
          1,
          (new Date().getFullYear() -
            firstContribution.createdAt.getFullYear()) *
            12 +
            (new Date().getMonth() - firstContribution.createdAt.getMonth()) +
            1,
        )
      : 0;
    const averageMonthlyContributions =
      monthsActive > 0 ? totalCollected / monthsActive : 0;
    const remainingAmount = Math.max(0, targetAmount - totalCollected);
    const estimatedMonthsToGoal =
      averageMonthlyContributions > 0
        ? Number((remainingAmount / averageMonthlyContributions).toFixed(2))
        : null;

    const totalProposals = proposalCounts.reduce(
      (sum, proposalCount) => sum + proposalCount._count._all,
      0,
    );
    const approvedProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.APPROVED)
        ?._count._all ?? 0;
    const rejectedProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.REJECTED)
        ?._count._all ?? 0;
    const pendingProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.PENDING)
        ?._count._all ?? 0;

    return {
      cooperativeName: cooperative.name,
      walletAddress: cooperative.vaultAddress,
      totalCollected,
      targetAmount,
      completionPercent,
      estimatedMonthsToGoal,
      totalProposals,
      approvedProposals,
      rejectedProposals,
      pendingProposals,
      generatedAt: new Date(),
    };
  }

  private async assertMembership(userId: string, cooperativeId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }
  }
}
