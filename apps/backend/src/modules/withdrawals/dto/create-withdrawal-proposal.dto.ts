import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { WithdrawalDestinationType } from "@prisma/client";

export class CreateWithdrawalProposalDto {
  @IsString()
  @IsNotEmpty()
  cooperativeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountXAF!: number;

  @IsString()
  reason!: string;

  @IsEnum(WithdrawalDestinationType)
  destinationType!: WithdrawalDestinationType;

  @ValidateIf(
    (dto: CreateWithdrawalProposalDto) =>
      dto.destinationType !== WithdrawalDestinationType.BANK_TRANSFER,
  )
  @IsString()
  recipientPhone?: string;

  @ValidateIf(
    (dto: CreateWithdrawalProposalDto) =>
      dto.destinationType !== WithdrawalDestinationType.BANK_TRANSFER,
  )
  @IsString()
  recipientOperator?: string;

  @ValidateIf(
    (dto: CreateWithdrawalProposalDto) =>
      dto.destinationType === WithdrawalDestinationType.BANK_TRANSFER,
  )
  @IsString()
  recipientBankName?: string;

  @ValidateIf(
    (dto: CreateWithdrawalProposalDto) =>
      dto.destinationType === WithdrawalDestinationType.BANK_TRANSFER,
  )
  @IsString()
  recipientBankAccount?: string;

  @IsString()
  recipientName!: string;
}
