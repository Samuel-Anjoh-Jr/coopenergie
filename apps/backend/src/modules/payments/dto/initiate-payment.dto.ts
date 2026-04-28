import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, MaxLength, Min } from "class-validator";

export class InitiatePaymentDto {
  @IsString()
  @IsNotEmpty()
  cooperativeId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  idempotencyKey!: string;

  @Type(() => Number)
  @IsInt()
  @Min(25)
  amountXAF!: number;

  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;
}
