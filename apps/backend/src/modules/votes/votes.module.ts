import { Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { WithdrawalsModule } from "../withdrawals/withdrawals.module";
import { VotesController } from "./votes.controller";
import { VotesService } from "./votes.service";

@Module({
  imports: [AuthModule, ProposalsModule, WithdrawalsModule],
  controllers: [VotesController],
  providers: [VotesService],
  exports: [VotesService],
})
export class VotesModule {}
