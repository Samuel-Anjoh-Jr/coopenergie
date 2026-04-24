import { Body, Controller, Get, Patch, Query, UseGuards } from "@nestjs/common";

import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { UpdatePlatformSettingsDto } from "../platform-settings/dto/update-platform-settings.dto";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly adminService: AdminService,
  ) {}

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("metrics")
  metrics() {
    return this.adminService.getPlatformMetrics();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("cooperatives")
  cooperatives(@Query("page") page?: string, @Query("limit") limit?: string) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 20;

    return this.adminService.getAllCooperatives(parsedPage, parsedLimit);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("settings")
  getSettings() {
    return this.platformSettingsService.getSettings();
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch("settings")
  updateSettings(
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdatePlatformSettingsDto,
  ) {
    return this.platformSettingsService.updateSettings(user.userId, dto);
  }
}
