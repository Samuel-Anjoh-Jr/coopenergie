import { Args, Int, Query, Resolver } from "@nestjs/graphql";
import {
  BadRequestException,
  ForbiddenException,
  UseGuards,
} from "@nestjs/common";
import { LedgerEventType as PrismaLedgerEventType } from "@prisma/client";

import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { CurrentUser } from "../../modules/auth/decorators/current-user.decorator";
import { LedgerService } from "../../modules/ledger/ledger.service";
import { PrismaService } from "../../prisma/prisma.service";
import { LedgerEventType } from "../types/ledger-event.type";

@UseGuards(GqlJwtAuthGuard)
@Resolver()
export class LedgerResolver {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledgerService: LedgerService,
  ) {}

  @Query(() => [LedgerEventType])
  async ledger(
    @Args("cooperativeId") cooperativeId: string,
    @Args("type", { nullable: true }) type: string | undefined,
    @Args("limit", { type: () => Int, nullable: true }) limit = 20,
    @Args("offset", { type: () => Int, nullable: true }) offset = 0,
    @CurrentUser() user: { userId: string },
  ) {
    await this.assertMembership(user.userId, cooperativeId);

    if (
      type &&
      !Object.values(PrismaLedgerEventType).includes(
        type as PrismaLedgerEventType,
      )
    ) {
      throw new BadRequestException("Invalid ledger event type.");
    }

    return this.ledgerService.findByCooperative(cooperativeId, {
      type: type as PrismaLedgerEventType | undefined,
      limit,
      offset,
    });
  }

  private async assertMembership(userId: string, cooperativeId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }
  }
}
