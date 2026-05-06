import { forwardRef, Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { VendorExpiryTask } from "../../tasks/vendor-expiry.task";
import { AuthModule } from "../auth/auth.module";
import { PaymentsModule } from "../payments/payments.module";
import { ProposalsModule } from "../proposals/proposals.module";
import { VendorAuthService } from "./vendor-auth.service";
import { VendorPaymentsService } from "./vendor-payments.service";
import { VendorProductsService } from "./vendor-products.service";
import { VendorReviewsService } from "./vendor-reviews.service";
import { VendorsController } from "./vendors.controller";
import { VendorsService } from "./vendors.service";

@Module({
  imports: [
    AuthModule,
    CommonModule,
    forwardRef(() => PaymentsModule),
    ProposalsModule,
  ],
  controllers: [VendorsController],
  providers: [
    VendorAuthService,
    VendorsService,
    VendorProductsService,
    VendorReviewsService,
    VendorPaymentsService,
    VendorExpiryTask,
  ],
  exports: [
    VendorAuthService,
    VendorsService,
    VendorProductsService,
    VendorReviewsService,
    VendorPaymentsService,
  ],
})
export class VendorsModule {}