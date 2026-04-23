import { IsNotEmpty, IsString, MinLength } from "class-validator";

export class CreateProposalDto {
  @IsString()
  @IsNotEmpty()
  cooperativeId!: string;

  @IsString()
  @MinLength(5)
  title!: string;

  @IsString()
  @MinLength(10)
  description!: string;
}
