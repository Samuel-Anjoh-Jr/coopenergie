import { Query, Resolver } from "@nestjs/graphql";

import { PlatformSettingsService } from "../../modules/platform-settings/platform-settings.service";
import { MonetisationSettingsType } from "../types/monetisation-settings.type";

@Resolver(() => MonetisationSettingsType)
export class MonetisationResolver {
  constructor(
    private readonly platformSettingsService: PlatformSettingsService,
  ) {}

  @Query(() => MonetisationSettingsType)
  monetisationSettings() {
    return this.platformSettingsService.getMonetisationSettings();
  }
}
