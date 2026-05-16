import { Type } from "class-transformer";
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
} from "class-validator";

export class UpdatePlatformSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  withdrawalThresholdDefault?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  withdrawalThresholdMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  withdrawalThresholdMax?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  appStoreUrl?: string;

  @IsOptional()
  @IsString()
  @IsUrl({ require_protocol: true })
  playStoreUrl?: string;
}
