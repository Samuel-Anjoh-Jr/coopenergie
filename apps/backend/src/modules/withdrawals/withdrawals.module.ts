import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { DisbursementService } from "./disbursement.service";
import { WithdrawalsController } from "./withdrawals.controller";
import { WithdrawalsService } from "./withdrawals.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [WithdrawalsController],
  providers: [WithdrawalsService, DisbursementService],
  exports: [WithdrawalsService, DisbursementService],
})
export class WithdrawalsModule {}
