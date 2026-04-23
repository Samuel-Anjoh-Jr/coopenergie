import {
  Inject,
  UseGuards,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { Args, Resolver, Subscription } from "@nestjs/graphql";
import { PubSub } from "graphql-subscriptions";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { PrismaService } from "../../prisma/prisma.service";
import { PUBSUB } from "../pubsub.module";
import { ContributionType } from "../types/contribution.type";
import { PaymentEventType } from "../types/payment-event.type";
import { ProposalType } from "../types/proposal.type";
import { VoteUpdateType } from "../types/vote-update.type";
import { WithdrawalRequestType } from "../types/withdrawal.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class SubscriptionResolver {
  constructor(
    @Inject(PUBSUB) private readonly pubSub: PubSub,
    private readonly prisma: PrismaService,
  ) {}

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

  @Subscription(() => ContributionType, {
    filter: (payload, variables) =>
      payload.onContribution?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onContribution,
  })
  async onContribution(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.pubSub.asyncIterableIterator(
      `contribution.created.${cooperativeId}`,
    );
  }

  @Subscription(() => VoteUpdateType, {
    filter: (payload, variables) =>
      payload.onVote?.proposal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onVote,
  })
  async onVote(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.pubSub.asyncIterableIterator(`vote.cast.${cooperativeId}`);
  }

  @Subscription(() => ProposalType, {
    filter: (payload, variables) =>
      payload.onProposal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onProposal,
  })
  async onProposal(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.pubSub.asyncIterableIterator(
      `proposal.created.${cooperativeId}`,
    );
  }

  @Subscription(() => PaymentEventType, {
    filter: (payload, variables) =>
      payload.onPayment?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onPayment,
  })
  async onPayment(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.pubSub.asyncIterableIterator(
      `payment.updated.${cooperativeId}`,
    );
  }

  @Subscription(() => WithdrawalRequestType, {
    filter: (payload, variables) =>
      payload.onWithdrawal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onWithdrawal,
  })
  async onWithdrawal(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);
    return this.pubSub.asyncIterableIterator(
      `withdrawal.disbursed.${cooperativeId}`,
    );
  }
}
