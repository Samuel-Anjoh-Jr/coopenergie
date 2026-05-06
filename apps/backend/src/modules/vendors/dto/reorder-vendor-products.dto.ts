import { ArrayMinSize, IsArray, IsString } from "class-validator";

export class ReorderVendorProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  orderedIds!: string[];
}