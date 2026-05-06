import { Injectable, NotFoundException } from "@nestjs/common";
import { FaqAudience } from "@prisma/client";
import { PrismaService } from "../../prisma/prisma.service";
import { UpsertFaqDto } from "./dto/upsert-faq.dto";

@Injectable()
export class FaqService {
  constructor(private readonly prisma: PrismaService) {}

  list(audience?: FaqAudience, locale?: string) {
    return this.prisma.faq.findMany({
      where: {
        ...(audience ? { audience } : {}),
        ...(locale ? { locale } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  }

  create(dto: UpsertFaqDto) {
    return this.prisma.faq.create({ data: dto });
  }

  async update(id: string, dto: Partial<UpsertFaqDto>) {
    await this.findOrThrow(id);
    return this.prisma.faq.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOrThrow(id);
    return this.prisma.faq.delete({ where: { id } });
  }

  private async findOrThrow(id: string) {
    const faq = await this.prisma.faq.findUnique({ where: { id } });
    if (!faq) throw new NotFoundException("FAQ not found.");
    return faq;
  }
}
