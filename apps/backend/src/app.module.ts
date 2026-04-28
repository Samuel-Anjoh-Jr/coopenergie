import { Module } from "@nestjs/common";
import { ApolloDriver, ApolloDriverConfig } from "@nestjs/apollo";
import { ConfigModule } from "@nestjs/config";
import { EventEmitterModule } from "@nestjs/event-emitter";
import { GraphQLModule } from "@nestjs/graphql";
import { ThrottlerModule } from "@nestjs/throttler";
import { GraphQLJSON } from "graphql-scalars";

import { BlockchainModule } from "./blockchain/blockchain.module";
import { CommonModule } from "./common/common.module";
import { PubSubModule } from "./graphql/pubsub.module";
import { MailModule } from "./mail/mail.module";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ContributionsModule } from "./modules/contributions/contributions.module";
import { CooperativesModule } from "./modules/cooperatives/cooperatives.module";
import { InvitationsModule } from "./modules/invitations/invitations.module";
import { HealthModule } from "./modules/health/health.module";
import { LedgerModule } from "./modules/ledger/ledger.module";
import { MembershipsModule } from "./modules/memberships/memberships.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { PlatformSettingsModule } from "./modules/platform-settings/platform-settings.module";
import { ProposalsModule } from "./modules/proposals/proposals.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { UsersModule } from "./modules/users/users.module";
import { VotesModule } from "./modules/votes/votes.module";
import { WithdrawalsModule } from "./modules/withdrawals/withdrawals.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: true,
      subscriptions: {
        "graphql-ws": true,
        "subscriptions-transport-ws": true,
      },
      playground: true,
      context: (context) => {
        const req = "req" in context ? context.req : context.extra?.request;

        return {
          ...context,
          req,
        };
      },
      resolvers: {
        JSON: GraphQLJSON,
      },
    }),
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60,
        limit: 100,
      },
    ]),
    BlockchainModule,
    CommonModule,
    PubSubModule,
    MailModule,
    NotificationsModule,
    AdminModule,
    AuthModule,
    ContributionsModule,
    CooperativesModule,
    HealthModule,
    InvitationsModule,
    LedgerModule,
    MembershipsModule,
    PaymentsModule,
    PlatformSettingsModule,
    ProposalsModule,
    ReportsModule,
    UsersModule,
    VotesModule,
    WithdrawalsModule,
    PrismaModule,
  ],
})
export class AppModule {}
