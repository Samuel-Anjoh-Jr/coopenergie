import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { Roles } from "../../common/decorators/roles.decorator";
import { CoopAdminGuard } from "../../common/guards/coop-admin.guard";
import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { SetCooperativeThresholdDto } from "../platform-settings/dto/set-cooperative-threshold.dto";
import { CooperativesService } from "./cooperatives.service";
import { CreateCooperativeDto } from "./dto/create-cooperative.dto";

@Controller("cooperatives")
export class CooperativesController {
  constructor(
    private readonly cooperativesService: CooperativesService,
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @CurrentUser() user: { userId: string },
    @Body() createCooperativeDto: CreateCooperativeDto,
  ) {
    return this.cooperativesService.create(user.userId, createCooperativeDto);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findByUser(@CurrentUser() user: { userId: string }) {
    return this.cooperativesService.findByUser(user.userId);
  }

  @Roles(Role.COOP_ADMIN, Role.PLATFORM_ADMIN)
  @UseGuards(JwtAuthGuard, CooperativeScopeGuard, RolesGuard)
  @Get(":id/settings")
  getSettings(@Param("id") id: string) {
    return this.platformSettingsService.getCooperativeThreshold(id);
  }

  @UseGuards(CoopAdminGuard)
  @Patch(":id/settings")
  setSettings(
    @Param("id") id: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: SetCooperativeThresholdDto,
  ) {
    return this.platformSettingsService.setCooperativeThreshold(
      user.userId,
      id,
      dto.threshold,
    );
  }

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get(":id")
  findById(@Param("id") id: string, @CurrentUser() user: { userId: string }) {
    return this.cooperativesService.findById(id, user.userId);
  }
}
