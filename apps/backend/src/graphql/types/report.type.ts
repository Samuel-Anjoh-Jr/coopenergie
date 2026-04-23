import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class ReportType {
  @Field()
  cooperativeName!: string;

  @Field({ nullable: true })
  walletAddress?: string | null;

  @Field(() => Int)
  totalCollected!: number;

  @Field(() => Int)
  targetAmount!: number;

  @Field(() => Float)
  completionPercent!: number;

  @Field(() => Float, { nullable: true })
  estimatedMonthsToGoal?: number | null;

  @Field(() => Int)
  totalProposals!: number;

  @Field(() => Int)
  approvedProposals!: number;

  @Field(() => Int)
  rejectedProposals!: number;

  @Field(() => Int)
  pendingProposals!: number;

  @Field(() => Date)
  generatedAt!: Date;
}
