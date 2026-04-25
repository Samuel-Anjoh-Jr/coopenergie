import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ProposalStatus } from "@prisma/client";

import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { ProposalsService } from "./proposals.service";

@Controller("proposals")
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() createProposalDto: CreateProposalDto,
  ) {
    return this.proposalsService.create(
      user.userId,
      createProposalDto.cooperativeId,
      createProposalDto,
    );
  }

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("cooperative/:cooperativeId")
  findByCooperative(
    @Param("cooperativeId") cooperativeId: string,
    @Query("status") status?: ProposalStatus,
  ) {
    return this.proposalsService.findByCooperative(cooperativeId, status);
  }

  @UseGuards(JwtAuthGuard)
  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: { userId: string }) {
    return this.proposalsService.findById(id, user.userId);
  }
}
