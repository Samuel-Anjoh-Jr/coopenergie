import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ProposalsController],
  providers: [ProposalsService],
  exports: [ProposalsService],
})
export class ProposalsModule {}
