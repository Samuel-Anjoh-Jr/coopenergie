import { Type } from "class-transformer";
import { IsInt, IsNotEmpty, IsString, Min } from "class-validator";

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  cooperativeId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(100)
  amountXAF!: number;
}
