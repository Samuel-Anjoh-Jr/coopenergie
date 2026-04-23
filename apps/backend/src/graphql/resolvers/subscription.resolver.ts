import { Inject, UseGuards } from "@nestjs/common";
import { Args, Resolver, Subscription } from "@nestjs/graphql";
import { PubSub } from "graphql-subscriptions";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { PUBSUB } from "../pubsub.module";
import { ContributionType } from "../types/contribution.type";
import { PaymentEventType } from "../types/payment-event.type";
import { ProposalType } from "../types/proposal.type";
import { VoteUpdateType } from "../types/vote-update.type";
import { WithdrawalRequestType } from "../types/withdrawal.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class SubscriptionResolver {
  constructor(@Inject(PUBSUB) private readonly pubSub: PubSub) {}

  @Subscription(() => ContributionType, {
    filter: (payload, variables) =>
      payload.onContribution?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onContribution,
  })
  onContribution(@Args("cooperativeId") cooperativeId: string) {
    return this.pubSub.asyncIterableIterator(
      `contribution.created.${cooperativeId}`,
    );
  }

  @Subscription(() => VoteUpdateType, {
    filter: (payload, variables) =>
      payload.onVote?.proposal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onVote,
  })
  onVote(@Args("cooperativeId") cooperativeId: string) {
    return this.pubSub.asyncIterableIterator(`vote.cast.${cooperativeId}`);
  }

  @Subscription(() => ProposalType, {
    filter: (payload, variables) =>
      payload.onProposal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onProposal,
  })
  onProposal(@Args("cooperativeId") cooperativeId: string) {
    return this.pubSub.asyncIterableIterator(`proposal.created.${cooperativeId}`);
  }

  @Subscription(() => PaymentEventType, {
    filter: (payload, variables) =>
      payload.onPayment?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onPayment,
  })
  onPayment(@Args("cooperativeId") cooperativeId: string) {
    return this.pubSub.asyncIterableIterator(`payment.updated.${cooperativeId}`);
  }

  @Subscription(() => WithdrawalRequestType, {
    filter: (payload, variables) =>
      payload.onWithdrawal?.cooperativeId === variables.cooperativeId,
    resolve: (payload) => payload.onWithdrawal,
  })
  onWithdrawal(@Args("cooperativeId") cooperativeId: string) {
    return this.pubSub.asyncIterableIterator(`withdrawal.disbursed.${cooperativeId}`);
  }
}
