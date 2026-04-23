import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ContributionType {
  @Field()
  id!: string;

  @Field(() => Int)
  amountXAF!: number;

  @Field({ nullable: true })
  txHash?: string | null;

  @Field(() => Int, { nullable: true })
  blockNumber?: number | null;

  @Field()
  status!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field({ nullable: true })
  userName?: string | null;
}
