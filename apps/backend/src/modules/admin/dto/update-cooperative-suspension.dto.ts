import { Type } from "class-transformer";
import { IsBoolean } from "class-validator";

export class UpdateCooperativeSuspensionDto {
  @Type(() => Boolean)
  @IsBoolean()
  suspended!: boolean;
}
