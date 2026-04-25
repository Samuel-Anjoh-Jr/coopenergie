import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { MembershipsController } from "./memberships.controller";
import { MembershipsService } from "./memberships.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
  exports: [MembershipsService],
})
export class MembershipsModule {}
