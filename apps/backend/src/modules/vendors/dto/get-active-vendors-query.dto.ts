import { Transform } from "class-transformer";
import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class GetActiveVendorsQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minRating?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  minPriceXAF?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  maxPriceXAF?: number;

  @IsOptional()
  @IsIn([
    "ranking",
    "rating",
    "name",
    "newest",
    "price_asc",
    "price_desc",
  ])
  sortBy?:
    | "ranking"
    | "rating"
    | "name"
    | "newest"
    | "price_asc"
    | "price_desc";
}