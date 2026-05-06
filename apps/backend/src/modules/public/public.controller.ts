import { Controller, Get } from "@nestjs/common";
import { PlatformSettingsService } from "../platform-settings/platform-settings.service";

@Controller("public")
export class PublicController {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Get("monetisation")
  getPublicMonetisationSettings() {
    return this.platformSettingsService.getMonetisationSettings();
  }
}
