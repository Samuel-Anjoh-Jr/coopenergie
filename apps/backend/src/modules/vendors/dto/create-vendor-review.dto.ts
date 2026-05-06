import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateVendorReviewDto {
  @IsString()
  vendorId!: string;

  @IsString()
  cooperativeId!: string;

  @IsInt()
  @Min(1)
  @Max(50)
  rating!: number;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  comment?: string;
}
