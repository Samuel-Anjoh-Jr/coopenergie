import { Exclude, Expose } from "class-transformer";

@Exclude()
export class UserResponseDto {
  @Expose()
  id!: string;

  @Expose()
  email!: string;

  @Expose()
  name!: string;

  @Expose()
  celoAddress?: string | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  withdrawalPhone?: string | null;

  @Expose()
  withdrawalOperator?: string | null;

  @Expose()
  withdrawalBankName?: string | null;

  @Expose()
  withdrawalBankAccount?: string | null;
}
