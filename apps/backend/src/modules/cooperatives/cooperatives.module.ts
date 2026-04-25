import { Module } from "@nestjs/common";

import { CommonModule } from "../../common/common.module";
import { AuthModule } from "../auth/auth.module";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { CooperativesController } from "./cooperatives.controller";
import { CooperativesService } from "./cooperatives.service";

@Module({
  imports: [AuthModule, CommonModule, PlatformSettingsModule],
  controllers: [CooperativesController],
  providers: [CooperativesService],
  exports: [CooperativesService],
})
export class CooperativesModule {}
