import { IsString, MinLength } from "class-validator";

export class InitiateVendorRegistrationPaymentDto {
  @IsString()
  @MinLength(8)
  phoneNumber!: string;
}
