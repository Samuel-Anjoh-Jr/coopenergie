import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { AdminController } from "./admin.controller";
import { AdminRealtimeListener } from "./admin-realtime.listener";
import { AdminRealtimeService } from "./admin-realtime.service";
import { AdminService } from "./admin.service";

@Module({
  imports: [AuthModule, CommonModule, PlatformSettingsModule],
  controllers: [AdminController],
  providers: [AdminService, AdminRealtimeService, AdminRealtimeListener],
  exports: [AdminService],
})
export class AdminModule {}
