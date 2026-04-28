import { createHash } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ContributionStatus } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { PUBSUB } from "../../graphql/graphql.tokens";
import { RelayerService } from "../../blockchain/relayer.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateContributionDto } from "./dto/create-contribution.dto";
import { PubSub } from "graphql-subscriptions";

@Injectable()
export class ContributionsService {
  private readonly logger = new Logger(ContributionsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relayerService: RelayerService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    @Inject(PUBSUB) private readonly pubSub: PubSub,
  ) {}

  async create(
    userId: string,
    cooperativeId: string,
    amountXAF: number,
    paymentId?: string,
  ) {
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

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        vaultAddress: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        celoAddress: true,
        celoKeyEncrypted: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const contribution = await this.prisma.contribution.create({
      data: {
        userId,
        cooperativeId,
        amountXAF,
        status: ContributionStatus.PENDING,
        paymentId,
      },
    });

    const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED === "true";
    const vaultReady = !!cooperative.vaultAddress;

    let finalizedContribution;

    if (blockchainEnabled && vaultReady) {
      if (!user.celoAddress || !user.celoKeyEncrypted) {
        await this.markContributionFailed(contribution.id);
        throw new BadRequestException(
          "User must have a CELO wallet before contributing.",
        );
      }

      try {
        const relayResult = await this.relayerService.relayContribute(
          cooperative.vaultAddress,
          user.celoAddress,
          user.celoKeyEncrypted,
          amountXAF,
        );

        finalizedContribution = await this.confirmContribution(
          contribution.id,
          amountXAF,
          relayResult.txHash,
          Number(relayResult.blockNumber),
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        await this.markContributionFailed(contribution.id);
        this.logger.error(
          `Failed to relay contribution ${contribution.id}: ${
            errorMessage
          }`,
        );
        throw new InternalServerErrorException(
          `Failed to process contribution on-chain: ${errorMessage}`,
        );
      }
    } else if (blockchainEnabled && !vaultReady) {
      this.logger.warn(`Cooperative ${cooperativeId} has no vault address yet`);
      const placeholderTx = this.generateFakeTxHash(
        cooperativeId,
        userId,
        amountXAF,
      );

      finalizedContribution = await this.confirmContribution(
        contribution.id,
        amountXAF,
        placeholderTx,
      );
    } else {
      const fakeTx = this.generateFakeTxHash(cooperativeId, userId, amountXAF);

      finalizedContribution = await this.confirmContribution(
        contribution.id,
        amountXAF,
        fakeTx,
      );
    }

    this.eventEmitter.emit("contribution.created", finalizedContribution);
    await this.notificationsService.notifyContributionConfirmed(
      cooperativeId,
      user.name,
      amountXAF,
      finalizedContribution.txHash ?? "",
    );
    await this.pubSub.publish(`contribution.created.${cooperativeId}`, {
      onContribution: finalizedContribution,
    });

    return finalizedContribution;
  }

  async findByCooperative(cooperativeId: string, userId: string) {
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

    return this.prisma.contribution.findMany({
      where: {
        cooperativeId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  private async confirmContribution(
    contributionId: string,
    amountXAF: number,
    txHash: string,
    blockNumber?: number,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const confirmedContribution = await tx.contribution.update({
        where: {
          id: contributionId,
        },
        data: {
          txHash,
          blockNumber,
          status: ContributionStatus.CONFIRMED,
        },
      });

      await tx.cooperative.update({
        where: {
          id: confirmedContribution.cooperativeId,
        },
        data: {
          confirmedBalanceXAF: {
            increment: amountXAF,
          },
        },
      });

      return confirmedContribution;
    });
  }

  private async markContributionFailed(contributionId: string) {
    await this.prisma.contribution.update({
      where: {
        id: contributionId,
      },
      data: {
        status: ContributionStatus.FAILED,
      },
    });
  }

  private generateFakeTxHash(
    cooperativeId: string,
    userId: string,
    amountXAF: number,
  ): `0x${string}` {
    return `0x${createHash("sha256")
      .update(`${cooperativeId}-${userId}-${amountXAF}-${Date.now()}`)
      .digest("hex")
      .slice(0, 64)}`;
  }
}
