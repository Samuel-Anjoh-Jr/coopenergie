import { Global, Module } from "@nestjs/common";
import { PubSub } from "graphql-subscriptions";
import { PrismaModule } from "../prisma/prisma.module";
import { AuthModule } from "../modules/auth/auth.module";
import { ContributionsModule } from "../modules/contributions/contributions.module";
import { CooperativesModule } from "../modules/cooperatives/cooperatives.module";
import { MembershipsModule } from "../modules/memberships/memberships.module";
import { PlatformSettingsModule } from "../modules/platform-settings/platform-settings.module";
import { ProposalsModule } from "../modules/proposals/proposals.module";
import { LedgerModule } from "../modules/ledger/ledger.module";
import { WithdrawalsModule } from "../modules/withdrawals/withdrawals.module";
import { ContributionResolver } from "./resolvers/contribution.resolver";
import { CooperativeResolver } from "./resolvers/cooperative.resolver";
import { LedgerResolver } from "./resolvers/ledger.resolver";
import { ProposalResolver } from "./resolvers/proposal.resolver";
import { ReportResolver } from "./resolvers/report.resolver";
import { SubscriptionResolver } from "./resolvers/subscription.resolver";
import { WithdrawalResolver } from "./resolvers/withdrawal.resolver";
import { GraphqlResolver } from "./graphql.resolver";

export const PUBSUB = "PUBSUB";

@Global()
@Module({
  imports: [
    PrismaModule,
    AuthModule,
    CooperativesModule,
    MembershipsModule,
    LedgerModule,
    ContributionsModule,
    ProposalsModule,
    WithdrawalsModule,
    PlatformSettingsModule,
  ],
  providers: [
    {
      provide: PUBSUB,
      useFactory: () => new PubSub(),
    },
    GraphqlResolver,
    CooperativeResolver,
    ContributionResolver,
    ProposalResolver,
    LedgerResolver,
    ReportResolver,
    WithdrawalResolver,
    SubscriptionResolver,
  ],
  exports: [PUBSUB],
})
export class PubSubModule {}
