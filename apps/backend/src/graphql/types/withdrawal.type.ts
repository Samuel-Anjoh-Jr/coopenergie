import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class WithdrawalRequestType {
  @Field()
  id!: string;

  @Field(() => Int)
  amountXAF!: number;

  @Field()
  destinationType!: string;

  @Field()
  recipientName!: string;

  @Field()
  status!: string;

  @Field(() => Date, { nullable: true })
  disbursedAt?: Date | null;

  @Field({ nullable: true })
  campayReference?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field({ nullable: true })
  celoTxUrl?: string | null;
}

@ObjectType()
export class PlatformSettingsType {
  @Field(() => Int)
  withdrawalThresholdDefault!: number;

  @Field(() => Int)
  withdrawalThresholdMin!: number;

  @Field(() => Int)
  withdrawalThresholdMax!: number;

  @Field(() => Int)
  withdrawalQuorumMinVotes!: number;

  @Field()
  maintenanceMode!: boolean;
}

@ObjectType()
export class CooperativeSettingsType {
  @Field()
  cooperativeId!: string;

  @Field(() => Int)
  withdrawalThreshold!: number;
}

@ObjectType()
export class WithdrawalEligibilityType {
  @Field()
  canVote!: boolean;

  @Field()
  reason!: string;

  @Field(() => Int)
  eligibleVoterCount!: number;

  @Field(() => Int)
  currentYesVotes!: number;

  @Field(() => Int)
  currentNoVotes!: number;

  @Field(() => Int)
  threshold!: number;

  @Field(() => Float)
  yesPercent!: number;

  @Field()
  quorumReached!: boolean;
}
