import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { FaqController } from "./faq.controller";
import { FaqService } from "./faq.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [FaqController],
  providers: [FaqService],
})
export class FaqModule {}
