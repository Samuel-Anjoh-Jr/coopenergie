import { Field, Int, ObjectType } from "@nestjs/graphql";
import { GraphQLJSON } from "graphql-scalars";

@ObjectType()
export class LedgerEventType {
  @Field()
  id!: string;

  @Field()
  type!: string;

  @Field(() => GraphQLJSON)
  payload!: Record<string, unknown>;

  @Field()
  txHash!: string;

  @Field(() => Int)
  blockNumber!: number;

  @Field({ nullable: true })
  celoScanUrl?: string | null;

  @Field(() => Date)
  createdAt!: Date;
}
