import { Field, ObjectType } from "@nestjs/graphql";

import { ProposalType } from "./proposal.type";
import { VoteType } from "./vote.type";

@ObjectType()
export class VoteUpdateType {
  @Field(() => VoteType)
  vote!: VoteType;

  @Field(() => ProposalType)
  proposal!: ProposalType;
}
