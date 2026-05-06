import { IsEmail, IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateVendorContactDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  whatsappNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  website?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  facebookUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  instagramUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  twitterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  linkedinUrl?: string;
}