import { createHash } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, ProposalStatus } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { RelayerService } from "../../blockchain/relayer.service";
import { PUBSUB } from "../../graphql/graphql.tokens";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { ProposalsService } from "../proposals/proposals.service";
import { WithdrawalsService } from "../withdrawals/withdrawals.service";
import { PubSub } from "graphql-subscriptions";

@Injectable()
export class VotesService {
  private readonly logger = new Logger(VotesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relayerService: RelayerService,
    private readonly proposalsService: ProposalsService,
    private readonly withdrawalsService: WithdrawalsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsService: NotificationsService,
    @Inject(PUBSUB) private readonly pubSub: PubSub,
  ) {}

  async cast(userId: string, proposalId: string, choice: boolean) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      include: {
        votes: {
          select: {
            choice: true,
          },
        },
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposal not found.");
    }

    if (proposal.status !== ProposalStatus.PENDING) {
      throw new BadRequestException("Only pending proposals can be voted on.");
    }

    const existingVote = await this.prisma.vote.findUnique({
      where: {
        userId_proposalId: {
          userId,
          proposalId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingVote) {
      throw new ConflictException("You have already voted on this proposal.");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId: proposal.cooperativeId,
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
        id: proposal.cooperativeId,
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
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    let vote;

    try {
      vote = await this.prisma.vote.create({
        data: {
          userId,
          proposalId,
          choice,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("You have already voted on this proposal.");
      }

      throw error;
    }

    const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED === "true";
    const vaultReady = !!cooperative.vaultAddress;

    try {
      let updatedVote;

      if (blockchainEnabled && vaultReady) {
        if (!user.celoAddress) {
          throw new BadRequestException(
            "User must have a CELO address before casting a vote.",
          );
        }

        if (!proposal.blockNumber || proposal.blockNumber < 1) {
          throw new BadRequestException(
            "Proposal is not ready for on-chain voting yet.",
          );
        }

        const relayResult = await this.relayerService.relayVote(
          cooperative.vaultAddress,
          user.celoAddress,
          proposal.blockNumber,
          choice,
        );

        updatedVote = await this.prisma.vote.update({
          where: {
            id: vote.id,
          },
          data: {
            txHash: relayResult.txHash,
            blockNumber: Number(relayResult.blockNumber),
          },
        });
      } else if (blockchainEnabled && !vaultReady) {
        this.logger.warn(
          `Cooperative ${proposal.cooperativeId} has no vault address yet`,
        );

        updatedVote = await this.prisma.vote.update({
          where: {
            id: vote.id,
          },
          data: {
            txHash: this.generateFakeTxHash(
              proposal.cooperativeId,
              userId,
              proposalId,
              choice,
            ),
          },
        });
      } else {
        updatedVote = await this.prisma.vote.update({
          where: {
            id: vote.id,
          },
          data: {
            txHash: this.generateFakeTxHash(
              proposal.cooperativeId,
              userId,
              proposalId,
              choice,
            ),
          },
        });
      }

      const proposalWithVotes = await this.prisma.proposal.findUnique({
        where: {
          id: proposalId,
        },
        include: {
          creator: {
            select: {
              id: true,
              email: true,
              name: true,
              celoAddress: true,
            },
          },
          votes: {
            select: {
              choice: true,
            },
          },
        },
      });

      if (!proposalWithVotes) {
        throw new NotFoundException("Proposal not found.");
      }

      const computedStatus =
        await this.proposalsService.computeStatus(proposalWithVotes);

      await this.prisma.proposal.update({
        where: {
          id: proposalId,
        },
        data: {
          status: computedStatus,
        },
      });

      const updatedProposal = await this.proposalsService.findById(
        proposalId,
        userId,
      );

      let proposalForSubscription = updatedProposal;

      const result = {
        vote: updatedVote,
        updatedProposal: proposalForSubscription,
      };

      const coopAdminId =
        (await this.notificationsService.getPrimaryCoopAdminId(
          proposal.cooperativeId,
        )) ?? proposal.creatorId;

      await this.notificationsService.notifyVoteCast(
        proposal.cooperativeId,
        coopAdminId,
        updatedProposal.yesVotes,
        updatedProposal.noVotes,
      );

      if (proposal.type === "WITHDRAWAL") {
        try {
          await this.withdrawalsService.processWithdrawalOnVote(proposalId);
          proposalForSubscription = await this.proposalsService.findById(
            proposalId,
            userId,
          );
          result.updatedProposal = proposalForSubscription;
        } catch (error) {
          this.logger.error(
            `Withdrawal vote post-processing failed for ${proposalId}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          );
        }
      }

      this.eventEmitter.emit("vote.cast", result);
      await this.pubSub.publish(`vote.cast.${proposal.cooperativeId}`, {
        onVote: {
          vote: updatedVote,
          proposal: proposalForSubscription,
        },
      });

      return result;
    } catch (error) {
      await this.prisma.vote.delete({
        where: {
          id: vote.id,
        },
      });

      if (
        error instanceof BadRequestException ||
        error instanceof ForbiddenException ||
        error instanceof NotFoundException ||
        error instanceof ConflictException
      ) {
        throw error;
      }

      this.logger.error(
        `Failed to cast vote ${vote.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw new InternalServerErrorException("Failed to cast vote.");
    }
  }

  async getByProposal(proposalId: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      select: {
        id: true,
        cooperativeId: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposal not found.");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId: proposal.cooperativeId,
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

    return this.prisma.vote.findMany({
      where: {
        proposalId,
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
        createdAt: "asc",
      },
    });
  }

  private generateFakeTxHash(
    cooperativeId: string,
    userId: string,
    proposalId: string,
    choice: boolean,
  ): `0x${string}` {
    return `0x${createHash("sha256")
      .update(
        `${cooperativeId}-${userId}-${proposalId}-${choice}-${Date.now()}`,
      )
      .digest("hex")
      .slice(0, 64)}`;
  }
}
