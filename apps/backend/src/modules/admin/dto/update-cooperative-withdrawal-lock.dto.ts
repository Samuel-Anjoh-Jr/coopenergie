import { Type } from "class-transformer";
import { IsBoolean } from "class-validator";

export class UpdateCooperativeWithdrawalLockDto {
  @Type(() => Boolean)
  @IsBoolean()
  withdrawalsLocked!: boolean;
}
