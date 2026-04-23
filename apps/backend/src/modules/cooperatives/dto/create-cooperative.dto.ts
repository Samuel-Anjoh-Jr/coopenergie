import { Type } from "class-transformer";
import {
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class CreateCooperativeDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name!: string;

  @Type(() => Number)
  @IsInt()
  @Min(10000)
  targetAmountXAF!: number;
}
