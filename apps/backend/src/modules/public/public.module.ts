import { Module } from "@nestjs/common";
import { PlatformSettingsModule } from "../platform-settings/platform-settings.module";
import { PublicController } from "./public.controller";

@Module({
  imports: [PlatformSettingsModule],
  controllers: [PublicController],
})
export class PublicModule {}
