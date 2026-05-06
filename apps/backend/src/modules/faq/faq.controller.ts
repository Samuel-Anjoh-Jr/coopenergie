import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { FaqAudience } from "@prisma/client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PlatformAdminGuard } from "../../common/guards/platform-admin.guard";
import { FaqService } from "./faq.service";
import { UpsertFaqDto } from "./dto/upsert-faq.dto";

@Controller("faq")
export class FaqController {
  constructor(private readonly faqService: FaqService) {}

  @Get()
  list(
    @Query("audience") audience?: FaqAudience,
    @Query("locale") locale?: string,
  ) {
    return this.faqService.list(audience, locale);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Post()
  create(@Body() dto: UpsertFaqDto) {
    return this.faqService.create(dto);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: Partial<UpsertFaqDto>) {
    return this.faqService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, PlatformAdminGuard)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.faqService.remove(id);
  }
}
