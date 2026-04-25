import { IsString, MinLength } from "class-validator";

export class GetInvitationByTokenDto {
  @IsString()
  @MinLength(1)
  token!: string;
}
