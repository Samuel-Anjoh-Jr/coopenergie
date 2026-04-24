import {
  Args,
  Int,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import {
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from "@nestjs/common";
import { ProposalStatus } from "@prisma/client";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { ProposalsService } from "../../modules/proposals/proposals.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProposalType } from "../types/proposal.type";
import { WithdrawalRequestType } from "../types/withdrawal.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => ProposalType)
export class ProposalResolver {
  constructor(
    private readonly proposalsService: ProposalsService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => [ProposalType])
  async proposals(
    @Args("cooperativeId") cooperativeId: string,
    @Args("status", { nullable: true }) status: string | undefined,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);

    let parsedStatus: ProposalStatus | undefined;

    if (status) {
      if (!Object.values(ProposalStatus).includes(status as ProposalStatus)) {
        throw new BadRequestException("Invalid proposal status.");
      }

      parsedStatus = status as ProposalStatus;
    }

    return this.proposalsService.findByCooperative(cooperativeId, parsedStatus);
  }

  @Query(() => ProposalType)
  proposal(@Args("id") id: string, @CurrentUser() user: { userId: string }) {
    return this.proposalsService.findById(id, user.userId);
  }

  @ResolveField("yesVotes", () => Int)
  yesVotes(@Parent() proposal: { id: string }) {
    return this.prisma.vote.count({
      where: {
        proposalId: proposal.id,
        choice: true,
      },
    });
  }

  @ResolveField("noVotes", () => Int)
  noVotes(@Parent() proposal: { id: string }) {
    return this.prisma.vote.count({
      where: {
        proposalId: proposal.id,
        choice: false,
      },
    });
  }

  @ResolveField("withdrawalRequest", () => WithdrawalRequestType, {
    nullable: true,
  })
  withdrawalRequest(@Parent() proposal: { id: string }) {
    return this.prisma.withdrawalRequest.findUnique({
      where: {
        proposalId: proposal.id,
      },
      include: {
        proposal: {
          select: {
            txHash: true,
          },
        },
      },
    });
  }

  @ResolveField("hasUserVoted", () => Boolean)
  async hasUserVoted(
    @Parent() proposal: { id: string },
    @CurrentUser() user: { userId: string },
  ) {
    const existingVote = await this.prisma.vote.findUnique({
      where: {
        userId_proposalId: {
          userId: user.userId,
          proposalId: proposal.id,
        },
      },
      select: {
        id: true,
      },
    });

    return !!existingVote;
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
