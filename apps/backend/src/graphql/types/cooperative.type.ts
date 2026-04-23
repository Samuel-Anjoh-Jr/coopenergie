import { Field, Float, Int, ObjectType } from "@nestjs/graphql";
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

  @Field(() => [LedgerEventType], { nullable: "itemsAndList" })
  recentActivity?: LedgerEventType[];
}
