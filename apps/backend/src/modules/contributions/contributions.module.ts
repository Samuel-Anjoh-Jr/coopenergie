import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { ContributionsController } from "./contributions.controller";
import { ContributionsService } from "./contributions.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [ContributionsController],
  providers: [ContributionsService],
  exports: [ContributionsService],
})
export class ContributionsModule {}
