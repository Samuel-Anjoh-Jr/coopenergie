import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { InvitationsController } from "./invitations.controller";
import { InvitationsService } from "./invitations.service";

@Module({
  imports: [AuthModule, CommonModule],
  controllers: [InvitationsController],
  providers: [InvitationsService],
  exports: [InvitationsService],
})
export class InvitationsModule {}
