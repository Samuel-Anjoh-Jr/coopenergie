import { Field, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class VoteType {
  @Field()
  id!: string;

  @Field()
  choice!: boolean;

  @Field({ nullable: true })
  txHash?: string | null;

  @Field(() => Int, { nullable: true })
  blockNumber?: number | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field({ nullable: true })
  userName?: string | null;
}
