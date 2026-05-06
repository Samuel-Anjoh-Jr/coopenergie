import { IsOptional, IsString, MaxLength, MinLength } from "class-validator";

export class UpdateVendorProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(160)
  businessName?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  logoUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  coverImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4)
  country?: string;
}