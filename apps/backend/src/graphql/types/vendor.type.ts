import { Field, Float, Int, ObjectType } from "@nestjs/graphql";

@ObjectType()
export class VendorImageType {
  @Field()
  id!: string;

  @Field()
  url!: string;

  @Field({ nullable: true })
  altText?: string | null;

  @Field(() => Int)
  sortOrder!: number;
}

@ObjectType()
export class VendorProductType {
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

  @Field(() => [VendorImageType])
  images!: VendorImageType[];
}

@ObjectType()
export class VendorReviewType {
  @Field()
  id!: string;

  @Field(() => Float)
  rating!: number;

  @Field({ nullable: true })
  comment?: string | null;

  @Field(() => Date)
  createdAt!: Date;

  @Field()
  reviewerName!: string;
}

@ObjectType()
export class VendorContactInfoType {
  @Field({ nullable: true })
  email?: string | null;

  @Field({ nullable: true })
  whatsappNumber?: string | null;

  @Field({ nullable: true })
  website?: string | null;

  @Field({ nullable: true })
  facebookUrl?: string | null;

  @Field({ nullable: true })
  instagramUrl?: string | null;

  @Field({ nullable: true })
  twitterUrl?: string | null;

  @Field({ nullable: true })
  linkedinUrl?: string | null;
}

@ObjectType()
export class VendorType {
  @Field()
  id!: string;

  @Field()
  slug!: string;

  @Field()
  businessName!: string;

  @Field()
  description!: string;

  @Field({ nullable: true })
  city?: string | null;

  @Field({ nullable: true })
  logoUrl?: string | null;

  @Field({ nullable: true })
  coverImageUrl?: string | null;

  @Field(() => Float)
  avgRating!: number;

  @Field(() => Int)
  totalReviews!: number;

  @Field(() => Float)
  rankScore!: number;

  @Field()
  status!: string;

  @Field()
  paymentModel!: string;

  @Field(() => VendorContactInfoType)
  contactInfo!: VendorContactInfoType;

  @Field(() => [VendorProductType])
  products!: VendorProductType[];

  @Field(() => [VendorReviewType])
  reviews!: VendorReviewType[];
}

@ObjectType()
export class VendorReviewEligibilityType {
  @Field()
  eligible!: boolean;

  @Field({ nullable: true })
  proposalId?: string;

  @Field({ nullable: true })
  reason?: string;
}
