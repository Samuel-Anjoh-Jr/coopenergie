import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";

import { CoopAdminGuard } from "../../common/guards/coop-admin.guard";
import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateMembershipRoleDto } from "./dto/update-membership-role.dto";
import { MembershipsService } from "./memberships.service";

@Controller("memberships")
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("cooperative/:cooperativeId")
  getMembers(@Param("cooperativeId") cooperativeId: string) {
    return this.membershipsService.getMembers(cooperativeId);
  }

  @UseGuards(CoopAdminGuard)
  @Patch("cooperative/:cooperativeId/user/:userId/role")
  updateMemberRole(
    @Param("cooperativeId") cooperativeId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateMembershipRoleDto,
  ) {
    return this.membershipsService.changeRole(
      cooperativeId,
      userId,
      dto.role,
      user.userId,
    );
  }

  @UseGuards(CoopAdminGuard)
  @Delete("cooperative/:cooperativeId/user/:userId")
  removeMember(
    @Param("cooperativeId") cooperativeId: string,
    @Param("userId") userId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.membershipsService.removeMember(
      cooperativeId,
      userId,
      user.userId,
    );
  }
}
