import { Type } from "class-transformer";
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from "class-validator";

export class InitiateVendorSubscriptionDto {
  @IsString()
  @MinLength(8)
  phoneNumber!: string;

  @IsIn(["MONTHLY", "YEARLY"])
  billingCycle!: "MONTHLY" | "YEARLY";

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  durationDays?: number;
}
