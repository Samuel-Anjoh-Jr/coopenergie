import { IsEmail, IsIn, IsOptional, IsString, MinLength } from "class-validator";

export class SendEmailInviteDto {
  @IsString()
  @MinLength(1)
  cooperativeId!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  @IsIn(["fr", "en"])
  locale?: string;
}
