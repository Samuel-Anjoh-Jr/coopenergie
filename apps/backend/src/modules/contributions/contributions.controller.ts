import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";

import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ContributionsService } from "./contributions.service";
import { CreateContributionDto } from "./dto/create-contribution.dto";

@Controller("contributions")
export class ContributionsController {
  constructor(private readonly contributionsService: ContributionsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() createContributionDto: CreateContributionDto,
  ) {
    return this.contributionsService.create(
      user.userId,
      createContributionDto.cooperativeId,
      createContributionDto.amountXAF,
    );
  }

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("cooperative/:cooperativeId")
  findByCooperative(
    @Param("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.contributionsService.findByCooperative(
      cooperativeId,
      user.userId,
    );
  }
}
