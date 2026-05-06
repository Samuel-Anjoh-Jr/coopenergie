import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class MonetisationSettingsType {
  @Field()
  withdrawalFeePercent!: number;

  @Field()
  vendorPaymentModel!: string;

  @Field(() => Int)
  vendorOneTimeFeeXAF!: number;

  @Field(() => Int)
  vendorMonthlyFeeXAF!: number;

  @Field(() => Int)
  vendorYearlyFeeXAF!: number;
}
