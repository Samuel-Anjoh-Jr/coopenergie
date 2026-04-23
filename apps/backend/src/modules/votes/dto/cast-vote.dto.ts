import { IsBoolean, IsNotEmpty, IsString } from "class-validator";

export class CastVoteDto {
  @IsString()
  @IsNotEmpty()
  proposalId!: string;

  @IsBoolean()
  choice!: boolean;
}
