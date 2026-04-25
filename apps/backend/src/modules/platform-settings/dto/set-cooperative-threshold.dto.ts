import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";

export class SetCooperativeThresholdDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  threshold!: number;
}
