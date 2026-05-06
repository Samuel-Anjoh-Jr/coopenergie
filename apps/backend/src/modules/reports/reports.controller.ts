import { Controller, Get, Param, Query, Res, UseGuards } from "@nestjs/common";

import { CooperativeScopeGuard } from "../../common/guards/cooperative-scope.guard";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { ReportsService } from "./reports.service";

type HeaderWritableResponse = {
  setHeader(name: string, value: string): void;
};

@Controller("reports")
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @UseGuards(JwtAuthGuard, CooperativeScopeGuard)
  @Get("cooperative/:cooperativeId/csv")
  async exportCsv(
    @Param("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
    @Query("locale") locale: "fr" | "en" | undefined,
    @Res({ passthrough: true }) response: HeaderWritableResponse,
  ) {
    const normalizedLocale = locale === "en" ? "en" : "fr";
    const csv = await this.reportsService.generateCsv(
      cooperativeId,
      user.userId,
      normalizedLocale,
    );

    const date = new Date().toISOString().slice(0, 10);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename=coopenergie-${
        normalizedLocale === "fr" ? "rapport" : "report"
      }-${date}.csv`,
    );

    return csv;
  }
}
