import { IsString, Matches, MaxLength, MinLength } from "class-validator";

export class RenameCooperativeSlugDto {
  @IsString()
  @MinLength(3)
  @MaxLength(64)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  slug!: string;
}
