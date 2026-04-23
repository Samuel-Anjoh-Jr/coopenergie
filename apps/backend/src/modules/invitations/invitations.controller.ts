import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";

import { CoopAdminGuard } from "../../common/guards/coop-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AcceptInvitationDto } from "./dto/accept-invitation.dto";
import { CreateShareableLinkDto } from "./dto/create-shareable-link.dto";
import { GetInvitationByTokenDto } from "./dto/get-invitation-by-token.dto";
import { SendEmailInviteDto } from "./dto/send-email-invite.dto";
import { InvitationsService } from "./invitations.service";

@Controller("invitations")
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @UseGuards(CoopAdminGuard)
  @Post("email")
  sendEmailInvite(
    @CurrentUser() user: { userId: string },
    @Body() dto: SendEmailInviteDto,
  ) {
    return this.invitationsService.sendEmailInvite(
      user.userId,
      dto.cooperativeId,
      dto.email,
      dto.locale,
    );
  }

  @UseGuards(CoopAdminGuard)
  @Post("link")
  createShareableLink(
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateShareableLinkDto,
  ) {
    return this.invitationsService.createShareableLink(
      user.userId,
      dto.cooperativeId,
      dto.locale,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Post("accept")
  acceptInvitation(
    @CurrentUser() user: { userId: string },
    @Body() dto: AcceptInvitationDto,
  ) {
    return this.invitationsService.acceptInvitation(dto.token, user.userId);
  }

  @Post("lookup")
  getInvitationByToken(@Body() dto: GetInvitationByTokenDto) {
    return this.invitationsService.findByToken(dto.token);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  revokeInvitation(
    @CurrentUser() user: { userId: string },
    @Param("id") id: string,
  ) {
    return this.invitationsService.revokeInvitation(user.userId, id);
  }

  @UseGuards(CoopAdminGuard)
  @Get("cooperative/:cooperativeId")
  getPendingInvitations(@Param("cooperativeId") cooperativeId: string) {
    return this.invitationsService.getPendingInvitations(cooperativeId);
  }
}
