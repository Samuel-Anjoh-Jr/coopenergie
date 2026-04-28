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
import { Proposal, ProposalStatus, Role } from "@prisma/client";

import { RelayerService } from "../../blockchain/relayer.service";
import { VaultService } from "../../blockchain/vault.service";
import { PUBSUB } from "../../graphql/graphql.tokens";
import { MailService } from "../../mail/mail.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { PubSub } from "graphql-subscriptions";

type ProposalWithVotes = Proposal & {
  votes: Array<{
    choice: boolean;
  }>;
  creator?: {
    id: string;
    email: string;
    name: string;
    celoAddress: string | null;
  };
};

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relayerService: RelayerService,
    private readonly vaultService: VaultService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    @Inject(PUBSUB) private readonly pubSub: PubSub,
  ) {}

  async create(
    userId: string,
    cooperativeId: string,
    { title, description }: CreateProposalDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }

    if (
      membership.role !== Role.COOP_ADMIN &&
      membership.role !== Role.MEMBER &&
      membership.role !== Role.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException(
        "Only cooperative members can create proposals.",
      );
    }

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        name: true,
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
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();

    let proposal = await this.prisma.proposal.create({
      data: {
        cooperativeId,
        creatorId: userId,
        title: normalizedTitle,
        description: normalizedDescription,
        status: ProposalStatus.PENDING,
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

    const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED === "true";
    const vaultReady = !!cooperative.vaultAddress;

    if (blockchainEnabled && vaultReady) {
      if (!user.celoAddress || !user.celoKeyEncrypted) {
        throw new BadRequestException(
          "User must have a CELO wallet before creating a proposal.",
        );
      }

      try {
        const relayResult = await this.relayerService.relayCreateProposal(
          cooperative.vaultAddress,
          user.celoAddress,
          user.celoKeyEncrypted,
          normalizedTitle,
          normalizedDescription,
        );
        const onChainProposalId = Number(
          await this.vaultService.getProposalCount(cooperative.vaultAddress),
        );

        const createdProposal = this.mapProposalWithCounts(
          await this.prisma.proposal.update({
            where: {
              id: proposal.id,
            },
            data: {
              txHash: relayResult.txHash,
              blockNumber: onChainProposalId,
              status: ProposalStatus.PENDING,
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
          }),
        );

        await this.notificationsService.notifyNewProposal(
          cooperativeId,
          createdProposal.title,
          createdProposal.type,
        );
        await this.mailService.sendVoteNotification(
          await this.getCooperativeMemberEmails(cooperativeId),
          cooperative.name,
          createdProposal.title,
        );
        await this.pubSub.publish(`proposal.created.${cooperativeId}`, {
          onProposal: createdProposal,
        });

        return createdProposal;
      } catch (error) {
        this.logger.error(
          `Failed to relay proposal ${proposal.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );

        await this.prisma.proposal.delete({
          where: {
            id: proposal.id,
          },
        });

        throw new InternalServerErrorException(
          "Failed to create proposal on-chain.",
        );
      }
    }

    if (blockchainEnabled && !vaultReady) {
      this.logger.warn(`Cooperative ${cooperativeId} has no vault address yet`);
    }

    const createdProposal = this.mapProposalWithCounts(
      await this.prisma.proposal.update({
        where: {
          id: proposal.id,
        },
        data: {
          txHash: this.generateFakeTxHash(
            cooperativeId,
            userId,
            normalizedTitle,
            normalizedDescription,
          ),
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
      }),
    );

    await this.notificationsService.notifyNewProposal(
      cooperativeId,
      createdProposal.title,
      createdProposal.type,
    );
    await this.mailService.sendVoteNotification(
      await this.getCooperativeMemberEmails(cooperativeId),
      cooperative.name,
      createdProposal.title,
    );
    await this.pubSub.publish(`proposal.created.${cooperativeId}`, {
      onProposal: createdProposal,
    });

    return createdProposal;
  }

  async findByCooperative(cooperativeId: string, status?: ProposalStatus) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const proposals = await this.prisma.proposal.findMany({
      where: {
        cooperativeId,
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
      orderBy: {
        createdAt: "desc",
      },
    });

    const mappedProposals = await this.attachComputedStatuses(proposals);

    if (!status) {
      return mappedProposals;
    }

    return mappedProposals.filter(
      (proposal) => proposal.computedStatus === status,
    );
  }

  async findById(id: string, userId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id,
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

    const [mappedProposal] = await this.attachComputedStatuses([proposal]);
    return mappedProposal;
  }

  async computeStatus(proposal: { votes: Array<{ choice: boolean }> }) {
    const yesVotes = proposal.votes.filter((vote) => vote.choice).length;
    const noVotes = proposal.votes.length - yesVotes;
    const totalVotes = proposal.votes.length;
    const quorum = await this.getProposalQuorum();

    if (totalVotes < quorum) {
      return ProposalStatus.PENDING;
    }

    return yesVotes > noVotes
      ? ProposalStatus.APPROVED
      : ProposalStatus.REJECTED;
  }

  private async attachComputedStatuses(proposals: ProposalWithVotes[]) {
    const quorum = await this.getProposalQuorum();

    return proposals.map((proposal) => {
      const yesVotes = proposal.votes.filter((vote) => vote.choice).length;
      const noVotes = proposal.votes.length - yesVotes;
      const totalVotes = proposal.votes.length;
      const computedStatus =
        totalVotes < quorum
          ? ProposalStatus.PENDING
          : yesVotes > noVotes
            ? ProposalStatus.APPROVED
            : ProposalStatus.REJECTED;

      return this.mapProposalWithCounts(proposal, computedStatus, quorum);
    });
  }

  private mapProposalWithCounts(
    proposal: ProposalWithVotes,
    computedStatus?: ProposalStatus,
    quorum?: number,
  ) {
    const yesVotes = proposal.votes.filter((vote) => vote.choice).length;
    const noVotes = proposal.votes.length - yesVotes;
    const totalVotes = proposal.votes.length;

    return {
      ...proposal,
      status: computedStatus ?? proposal.status,
      computedStatus: computedStatus ?? proposal.status,
      yesVotes,
      noVotes,
      totalVotes,
      quorumRequired: quorum,
    };
  }

  private async getProposalQuorum() {
    const settings = await this.prisma.platformSettings.findUnique({
      where: {
        id: "singleton",
      },
      select: {
        withdrawalQuorumMinVotes: true,
      },
    });

    return settings?.withdrawalQuorumMinVotes ?? 1;
  }

  private generateFakeTxHash(
    cooperativeId: string,
    userId: string,
    title: string,
    description: string,
  ): `0x${string}` {
    return `0x${createHash("sha256")
      .update(
        `${cooperativeId}-${userId}-${title}-${description}-${Date.now()}`,
      )
      .digest("hex")
      .slice(0, 64)}`;
  }

  private async getCooperativeMemberEmails(cooperativeId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
      },
      select: {
        user: {
          select: {
            email: true,
          },
        },
      },
    });

    return [...new Set(memberships.map((membership) => membership.user.email))];
  }
}
