import { Args, Query, Resolver } from "@nestjs/graphql";
import { UseGuards } from "@nestjs/common";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { ContributionsService } from "../../modules/contributions/contributions.service";
import { ContributionType } from "../types/contribution.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver(() => ContributionType)
export class ContributionResolver {
  constructor(private readonly contributionsService: ContributionsService) {}

  @Query(() => [ContributionType])
  async contributions(
    @Args("cooperativeId") cooperativeId: string,
    @CurrentUser() user: { userId: string },
  ) {
    const contributions = await this.contributionsService.findByCooperative(
      cooperativeId,
      user.userId,
    );

    return contributions.map((contribution) => ({
      ...contribution,
      userName: contribution.user?.name ?? null,
    }));
  }
}
