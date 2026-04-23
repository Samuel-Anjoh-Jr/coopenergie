import { Args, Parent, Query, ResolveField, Resolver } from "@nestjs/graphql";
import {
  ForbiddenException,
  NotFoundException,
  UseGuards,
} from "@nestjs/common";
import {
  ProposalStatus as PrismaProposalStatus,
  ProposalType as PrismaProposalType,
  Role,
} from "@prisma/client";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { PlatformSettingsService } from "../../modules/platform-settings/platform-settings.service";
import { WithdrawalsService } from "../../modules/withdrawals/withdrawals.service";
import { PrismaService } from "../../prisma/prisma.service";
import {
  CooperativeSettingsType,
  PlatformSettingsType,
  WithdrawalEligibilityType,
  WithdrawalRequestType,
} from "../types/withdrawal.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => WithdrawalRequestType)
export class WithdrawalResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly withdrawalsService: WithdrawalsService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Query(() => [WithdrawalRequestType])
  async withdrawals(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.withdrawalsService.findByCooperative(cooperativeId);
  }

  @Query(() => WithdrawalEligibilityType)
  async withdrawalEligibility(
    @Args("proposalId") proposalId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      select: {
        id: true,
        cooperativeId: true,
        status: true,
        type: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposal not found.");
    }

    if (proposal.type !== PrismaProposalType.WITHDRAWAL) {
      throw new NotFoundException("Withdrawal proposal not found.");
    }

    await this.assertMembership(user.userId, proposal.cooperativeId);

    const [thresholdEvaluation, eligibleVoters] = await Promise.all([
      this.withdrawalsService.evaluateWithdrawalThreshold(proposalId),
      this.withdrawalsService.getEligibleVoters(proposal.cooperativeId),
    ]);

    const eligibleUserIds = eligibleVoters.map((entry) => entry.userId);
    const hasVoted = await this.prisma.vote.findUnique({
      where: {
        userId_proposalId: {
          userId: user.userId,
          proposalId,
        },
      },
      select: {
        id: true,
      },
    });

    const isEligibleVoter = eligibleUserIds.includes(user.userId);
    const proposalOpen = proposal.status === PrismaProposalStatus.PENDING;
    const canVote = proposalOpen && isEligibleVoter && !hasVoted;

    let reason = "Eligible to vote";
    if (!proposalOpen) {
      reason = "Proposal is no longer open for voting";
    } else if (!isEligibleVoter) {
      reason = "User is not an eligible voter";
    } else if (hasVoted) {
      reason = "Vote already cast";
    }

    return {
      canVote,
      reason,
      eligibleVoterCount: thresholdEvaluation.eligibleVoterCount,
      currentYesVotes: thresholdEvaluation.yesVotes,
      currentNoVotes: thresholdEvaluation.noVotes,
      threshold: thresholdEvaluation.threshold,
      yesPercent: Number((thresholdEvaluation.yesPercent ?? 0).toFixed(2)),
      quorumReached:
        thresholdEvaluation.totalEligibleVoted >= thresholdEvaluation.quorumMin,
    };
  }

  @Query(() => PlatformSettingsType)
  async platformSettings(@CurrentUser() user: { userId: string }) {
    await this.assertPlatformAdmin(user.userId);
    return this.platformSettingsService.getSettings();
  }

  @Query(() => CooperativeSettingsType)
  async cooperativeSettings(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);

    const settings = await this.platformSettingsService.getCooperativeThreshold(
      cooperativeId,
    );

    return {
      cooperativeId,
      withdrawalThreshold: settings.threshold,
    };
  }

  @ResolveField("celoTxUrl", () => String, { nullable: true })
  celoTxUrl(
    @Parent()
    withdrawalRequest: {
      proposal?: {
        txHash?: string | null;
      } | null;
    },
  ) {
    const txHash = withdrawalRequest.proposal?.txHash;

    if (!txHash) {
      return null;
    }

    const celoscanBase =
      process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() || "https://celoscan.io";

    return `${celoscanBase.replace(/\/+$/, "")}/tx/${txHash}`;
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
      throw new ForbiddenException("You do not have access to this cooperative.");
    }
  }

  private async assertPlatformAdmin(userId: string) {
    const platformAdminMembership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: Role.PLATFORM_ADMIN,
      },
      select: {
        userId: true,
      },
    });

    if (!platformAdminMembership) {
      throw new ForbiddenException("Platform admin access is required.");
    }
  }
}
