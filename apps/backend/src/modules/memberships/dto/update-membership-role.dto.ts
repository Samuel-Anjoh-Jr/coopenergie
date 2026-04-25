import { Role } from "@prisma/client";
import { IsEnum } from "class-validator";

export class UpdateMembershipRoleDto {
  @IsEnum(Role)
  role!: Role;
}
