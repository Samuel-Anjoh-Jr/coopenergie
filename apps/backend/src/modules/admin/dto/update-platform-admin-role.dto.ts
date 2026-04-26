import { Type } from "class-transformer";
import { IsBoolean } from "class-validator";

export class UpdatePlatformAdminRoleDto {
  @Type(() => Boolean)
  @IsBoolean()
  isPlatformAdmin!: boolean;
}
