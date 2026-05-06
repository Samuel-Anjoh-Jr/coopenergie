import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
import { CooperativeMembershipType } from "./cooperative-membership.type";
import { LedgerEventType } from "./ledger-event.type";
import { MemberType } from "./member.type";

@ObjectType()
export class CooperativeType {
  @Field()
  id!: string;

  @Field()
  name!: string;

  @Field()
  slug!: string;

  @Field(() => Int)
  targetAmountXAF!: number;

  @Field(() => Int)
  baseTargetXAF!: number;

  @Field(() => Int)
  confirmedBalanceXAF!: number;

  @Field({ nullable: true })
  vaultAddress?: string | null;

  @Field({ nullable: true })
  celoScanUrl?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Float)
  progress!: number;

  @Field(() => Int)
  totalCollected!: number;

  @Field(() => Int)
  memberCount!: number;

  @Field(() => [MemberType], { nullable: "itemsAndList" })
  members?: MemberType[];

  @Field(() => CooperativeMembershipType, { nullable: true })
  membership?: CooperativeMembershipType | null;

  @Field(() => [LedgerEventType], { nullable: "itemsAndList" })
  recentActivity?: LedgerEventType[];
}
