import { forwardRef, Module } from "@nestjs/common";

import { AuthModule } from "../auth/auth.module";
import { ContributionsModule } from "../contributions/contributions.module";
import { VendorsModule } from "../vendors/vendors.module";
import { CampayService } from "./campay.service";
import {
  PaymentsController,
  PaymentsWebhookController,
} from "./payments.controller";
import { PaymentsService } from "./payments.service";

@Module({
  imports: [AuthModule, ContributionsModule, forwardRef(() => VendorsModule)],
  controllers: [PaymentsController, PaymentsWebhookController],
  providers: [CampayService, PaymentsService],
  exports: [PaymentsService, CampayService],
})
export class PaymentsModule {}
