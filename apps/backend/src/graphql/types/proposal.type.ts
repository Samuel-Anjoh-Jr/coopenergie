import { Field, Int, ObjectType } from "@nestjs/graphql";
import { WithdrawalRequestType } from "./withdrawal.type";

@ObjectType()
export class ProposalVendorProductType {
  @Field()
  id!: string;

  @Field()
  title!: string;

  @Field()
  description!: string;

  @Field(() => Int)
  priceXAF!: number;

  @Field({ nullable: true })
  unit?: string | null;
}

@ObjectType()
export class ProposalVendorType {
  @Field()
  id!: string;

  @Field()
  businessName!: string;

  @Field({ nullable: true })
  logoUrl?: string | null;
}

@ObjectType()
export class ProposalVendorLinkType {
  @Field()
  id!: string;

  @Field({ nullable: true })
  note?: string | null;

  @Field(() => ProposalVendorType)
  vendor!: ProposalVendorType;

  @Field(() => ProposalVendorProductType, { nullable: true })
  product?: ProposalVendorProductType | null;
}

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

  @Field(() => ProposalVendorLinkType, { nullable: true })
  vendorLink?: ProposalVendorLinkType | null;
}
