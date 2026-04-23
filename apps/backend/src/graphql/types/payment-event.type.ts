import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class PaymentEventType {
  @Field()
  id!: string;

  @Field(() => Int)
  amountXAF!: number;

  @Field()
  status!: string;

  @Field()
  reference!: string;

  @Field()
  cooperativeId!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date)
  updatedAt!: Date;
}
