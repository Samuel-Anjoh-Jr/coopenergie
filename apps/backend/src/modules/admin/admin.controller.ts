import {
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Patch,
  Query,
  Sse,
  UseGuards,
} from "@nestjs/common";
import { Observable } from "rxjs";

import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";
import { UpdatePlatformSettingsDto } from "../platform-settings/dto/update-platform-settings.dto";
import { RenameCooperativeSlugDto } from "./dto/rename-cooperative-slug.dto";
import { UpdateCooperativeSuspensionDto } from "./dto/update-cooperative-suspension.dto";
import { UpdateCooperativeWithdrawalLockDto } from "./dto/update-cooperative-withdrawal-lock.dto";
import { UpdatePlatformAdminRoleDto } from "./dto/update-platform-admin-role.dto";
import { AdminRealtimeService } from "./admin-realtime.service";
import { AdminService } from "./admin.service";

@Controller("admin")
export class AdminController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
    private readonly adminService: AdminService,
    private readonly adminRealtimeService: AdminRealtimeService,
  ) {}

  @Sse("events")
  adminEvents(
    @Query("token") token?: string,
  ): Promise<Observable<MessageEvent>> {
    return this.adminRealtimeService.streamForToken(token);
  }

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
  @Patch("cooperatives/:cooperativeId/suspend")
  suspendCooperative(
    @CurrentUser() user: { userId: string },
    @Param("cooperativeId") cooperativeId: string,
    @Body() dto: UpdateCooperativeSuspensionDto,
  ) {
    return this.adminService.setCooperativeSuspension(
      user.userId,
      cooperativeId,
      dto.suspended,
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch("cooperatives/:cooperativeId/withdrawals-lock")
  setCooperativeWithdrawalLock(
    @CurrentUser() user: { userId: string },
    @Param("cooperativeId") cooperativeId: string,
    @Body() dto: UpdateCooperativeWithdrawalLockDto,
  ) {
    return this.adminService.setCooperativeWithdrawalLock(
      user.userId,
      cooperativeId,
      dto.withdrawalsLocked,
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch("cooperatives/:cooperativeId/slug")
  renameCooperativeSlug(
    @CurrentUser() user: { userId: string },
    @Param("cooperativeId") cooperativeId: string,
    @Body() dto: RenameCooperativeSlugDto,
  ) {
    return this.adminService.renameCooperativeSlug(
      user.userId,
      cooperativeId,
      dto.slug,
    );
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("audit-logs")
  auditLogs(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("action") action?: string,
  ) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 25;

    return this.adminService.getAuditLogs(parsedPage, parsedLimit, action);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("users")
  users(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
  ) {
    const parsedPage = page ? Number(page) : 1;
    const parsedLimit = limit ? Number(limit) : 25;

    return this.adminService.getUsers(parsedPage, parsedLimit, search);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch("users/:userId/platform-admin")
  setPlatformAdminRole(
    @CurrentUser() user: { userId: string },
    @Param("userId") userId: string,
    @Body() dto: UpdatePlatformAdminRoleDto,
  ) {
    return this.adminService.setPlatformAdminRole(
      user.userId,
      userId,
      dto.isPlatformAdmin,
    );
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
  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Get("cooperatives/admin-key-health")
  async cooperativesAdminKeyHealth() {
    return this.adminService.getCooperativesAdminKeyHealth();
  }
}
