import { IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class CreateShareableLinkDto {
  @IsString()
  @MinLength(1)
  cooperativeId!: string;

  @IsOptional()
  @IsString()
  @IsIn(["fr", "en"])
  locale?: string;
}
