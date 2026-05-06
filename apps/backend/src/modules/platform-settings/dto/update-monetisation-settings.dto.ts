import { Type } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from "class-validator";
import { VendorPaymentModel } from "@prisma/client";

export class UpdateMonetisationSettingsDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(50)
  withdrawalFeePercent?: number;

  @IsOptional()
  @IsEnum(VendorPaymentModel)
  vendorPaymentModel?: VendorPaymentModel;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vendorOneTimeFeeXAF?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vendorMonthlyFeeXAF?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  vendorYearlyFeeXAF?: number;
}
