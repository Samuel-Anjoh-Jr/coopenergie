import { FaqAudience } from "@prisma/client";
import { IsEnum, IsInt, IsOptional, IsString, Min } from "class-validator";
import { Type } from "class-transformer";

export class UpsertFaqDto {
  @IsString()
  question!: string;

  @IsString()
  answer!: string;

  @IsEnum(FaqAudience)
  audience!: FaqAudience;

  @IsString()
  locale!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}
