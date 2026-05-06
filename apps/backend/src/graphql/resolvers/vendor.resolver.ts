import {
  Args,
  Float,
  Parent,
  Query,
  registerEnumType,
  ResolveField,
  Resolver,
} from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { GetActiveVendorsQueryDto } from "../../modules/vendors/dto/get-active-vendors-query.dto";
import { VendorReviewsService } from "../../modules/vendors/vendor-reviews.service";
import { VendorsService } from "../../modules/vendors/vendors.service";
import {
  VendorContactInfoType,
  VendorReviewEligibilityType,
  VendorReviewType,
  VendorType,
} from "../types/vendor.type";

enum VendorSortBy {
  RANKING = "ranking",
  RATING = "rating",
  NAME = "name",
  NEWEST = "newest",
  PRICE_ASC = "price_asc",
  PRICE_DESC = "price_desc",
}

registerEnumType(VendorSortBy, {
  name: "VendorSortBy",
});

@Resolver(() => VendorType)
export class VendorResolver {
  constructor(
    private readonly vendorsService: VendorsService,
    private readonly vendorReviewsService: VendorReviewsService,
  ) {}

  @Query(() => [VendorType])
  vendors(
    @Args("search", { nullable: true }) search?: string,
    @Args("city", { nullable: true }) city?: string,
    @Args("minRating", { nullable: true, type: () => Float }) minRating?: number,
    @Args("maxPriceXAF", { nullable: true, type: () => Float }) maxPriceXAF?: number,
    @Args("minPriceXAF", { nullable: true, type: () => Float }) minPriceXAF?: number,
    @Args("sortBy", { nullable: true, type: () => VendorSortBy })
    sortBy?: VendorSortBy,
  ) {
    return this.vendorsService.getActiveVendors({
      search,
      city,
      minRating,
      maxPriceXAF,
      minPriceXAF,
      sortBy,
    });
  }

  @Query(() => VendorType)
  vendor(@Args("slugOrId") slugOrId: string) {
    return this.vendorsService.getPublicProfile(slugOrId);
  }

  @UseGuards(GqlJwtAuthGuard)
  @Query(() => VendorReviewEligibilityType)
  vendorReviewEligibility(
    @Args("vendorId") vendorId: string,
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.vendorReviewsService.checkReviewEligibility(
      user.userId,
      vendorId,
      cooperativeId,
    );
  }

  @ResolveField("contactInfo", () => VendorContactInfoType)
  contactInfo(@Parent() vendor: any) {
    return {
      email: vendor.email,
      whatsappNumber: vendor.whatsappNumber,
      website: vendor.website,
      facebookUrl: vendor.facebookUrl,
      instagramUrl: vendor.instagramUrl,
      twitterUrl: vendor.twitterUrl,
      linkedinUrl: vendor.linkedinUrl,
    };
  }

  @ResolveField("reviews", () => [VendorReviewType])
  reviews(@Parent() vendor: { id: string }) {
    return this.vendorReviewsService.getReviewsForVendor(vendor.id);
  }
}
