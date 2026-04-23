import {
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from "class-validator";

const WITHDRAWAL_METHODS = [
  "MTN_MOMO",
  "ORANGE_MONEY",
  "BANK_TRANSFER",
] as const;
export type WithdrawalMethod = (typeof WITHDRAWAL_METHODS)[number];

export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  celoAddress?: string;

  @IsOptional()
  @IsIn(WITHDRAWAL_METHODS)
  preferredWithdrawalMethod?: WithdrawalMethod;

  @IsOptional()
  @IsString()
  @Matches(/^6\d{8}$/, {
    message:
      "momoNumber must be a valid 9-digit Cameroonian phone number starting with 6",
  })
  withdrawalPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  withdrawalBankName?: string;

  @IsOptional()
  @IsString()
  @Matches(/^\d+$/, { message: "bankAccount must contain digits only" })
  @MaxLength(30)
  withdrawalBankAccount?: string;
}
