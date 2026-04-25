import { Field, Int, ObjectType } from "@nestjs/graphql";
import { WithdrawalRequestType } from "./withdrawal.type";

@ObjectType()
export class ProposalType {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field()
  status!: string;

  @Field()
  type!: string;

  @Field({ nullable: true })
  txHash?: string | null;

  @Field(() => Int)
  yesVotes!: number;

  @Field(() => Int)
  noVotes!: number;

  @Field()
  hasUserVoted!: boolean;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => WithdrawalRequestType, { nullable: true })
  withdrawalRequest?: WithdrawalRequestType | null;
}
