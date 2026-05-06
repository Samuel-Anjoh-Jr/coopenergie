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
import {
  LedgerEventType,
  Prisma,
  Proposal,
  ProposalStatus,
  ProposalType,
  Role,
  VendorAccountStatus,
} from "@prisma/client";

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
  vendorLink?: {
    id: string;
    note: string | null;
    vendor: {
      id: string;
      businessName: string;
      logoUrl: string | null;
    };
    product: {
      id: string;
      title: string;
      description: string;
      priceXAF: number;
      unit: string | null;
      images: Array<{
        id: string;
        url: string;
        altText: string | null;
        sortOrder: number;
      }>;
    } | null;
  } | null;
};

const proposalInclude = {
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
  vendorLink: {
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          logoUrl: true,
        },
      },
      product: {
        select: {
          id: true,
          title: true,
          description: true,
          priceXAF: true,
          unit: true,
          images: {
            select: {
              id: true,
              url: true,
              altText: true,
              sortOrder: true,
            },
            orderBy: {
              sortOrder: "asc",
            },
          },
        },
      },
    },
  },
} satisfies Prisma.ProposalInclude;

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
    { title, description, vendorId, productId, vendorNote }: CreateProposalDto,
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
    const normalizedVendorNote = vendorNote?.trim() || null;

    let resolvedVendorId: string | null = null;
    let resolvedProductId: string | null = null;

    if (productId && !vendorId) {
      throw new BadRequestException(
        "vendorId is required when productId is provided.",
      );
    }

    if (vendorId) {
      const vendor = await this.prisma.vendor.findUnique({
        where: {
          id: vendorId,
        },
        select: {
          id: true,
          status: true,
        },
      });

      if (!vendor) {
        throw new NotFoundException("Vendor not found.");
      }

      if (vendor.status !== VendorAccountStatus.ACTIVE) {
        throw new BadRequestException("Vendor must be active.");
      }

      resolvedVendorId = vendor.id;

      if (productId) {
        const product = await this.prisma.vendorProduct.findFirst({
          where: {
            id: productId,
            vendorId: vendor.id,
          },
          select: {
            id: true,
          },
        });

        if (!product) {
          throw new BadRequestException(
            "Product does not belong to the selected vendor.",
          );
        }

        resolvedProductId = product.id;
      }
    }

    const proposalType = resolvedVendorId
      ? ProposalType.VENDOR_PURCHASE
      : ProposalType.STANDARD;

    let proposal = await this.prisma.proposal.create({
      data: {
        cooperativeId,
        creatorId: userId,
        title: normalizedTitle,
        description: normalizedDescription,
        type: proposalType,
        status: ProposalStatus.PENDING,
      },
      include: proposalInclude,
    });

    if (resolvedVendorId) {
      proposal = await this.prisma.proposal.update({
        where: {
          id: proposal.id,
        },
        data: {
          vendorLink: {
            create: {
              vendorId: resolvedVendorId,
              productId: resolvedProductId,
              note: normalizedVendorNote,
            },
          },
        },
        include: proposalInclude,
      });
    }

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
            include: proposalInclude,
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

        if (createdProposal.txHash) {
          await this.prisma.ledgerEvent.upsert({
            where: { txHash: createdProposal.txHash },
            update: {
              type: LedgerEventType.PROPOSAL,
              payload: {
                title: createdProposal.title,
                creator:
                  createdProposal.creator?.celoAddress ??
                  createdProposal.creatorId,
                proposalId: createdProposal.id,
              },
              blockNumber: createdProposal.blockNumber ?? 0,
              cooperativeId,
            },
            create: {
              type: LedgerEventType.PROPOSAL,
              payload: {
                title: createdProposal.title,
                creator:
                  createdProposal.creator?.celoAddress ??
                  createdProposal.creatorId,
                proposalId: createdProposal.id,
              },
              txHash: createdProposal.txHash,
              blockNumber: createdProposal.blockNumber ?? 0,
              cooperativeId,
            },
          });
        }

        return createdProposal;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        this.logger.error(
          `Failed to relay proposal ${proposal.id}: ${errorMessage}`,
        );

        await this.prisma.proposal.delete({
          where: {
            id: proposal.id,
          },
        });

        throw new InternalServerErrorException(
          `Failed to create proposal on-chain: ${errorMessage}`,
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
        include: proposalInclude,
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

    if (createdProposal.txHash) {
      await this.prisma.ledgerEvent.upsert({
        where: { txHash: createdProposal.txHash },
        update: {
          type: LedgerEventType.PROPOSAL,
          payload: {
            title: createdProposal.title,
            creator:
              createdProposal.creator?.celoAddress ?? createdProposal.creatorId,
            proposalId: createdProposal.id,
          },
          blockNumber: createdProposal.blockNumber ?? 0,
          cooperativeId,
        },
        create: {
          type: LedgerEventType.PROPOSAL,
          payload: {
            title: createdProposal.title,
            creator:
              createdProposal.creator?.celoAddress ?? createdProposal.creatorId,
            proposalId: createdProposal.id,
          },
          txHash: createdProposal.txHash,
          blockNumber: createdProposal.blockNumber ?? 0,
          cooperativeId,
        },
      });
    }

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
        ...proposalInclude,
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
        ...proposalInclude,
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

  async getVendorProposalsForCooperative(cooperativeId: string) {
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

    return this.prisma.proposal.findMany({
      where: {
        cooperativeId,
        type: ProposalType.VENDOR_PURCHASE,
        status: ProposalStatus.APPROVED,
      },
      include: {
        ...proposalInclude,
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  }

  async computeStatus(proposal: {
    cooperativeId: string;
    votes: Array<{ choice: boolean }>;
  }) {
    const { threshold, totalMembers } = await this.getCoopVoteSettings(
      proposal.cooperativeId,
    );
    const yesVotes = proposal.votes.filter((v) => v.choice).length;

    if (totalMembers === 0) return ProposalStatus.PENDING;

    const yesPercent = (yesVotes / totalMembers) * 100;
    if (yesPercent >= threshold) return ProposalStatus.APPROVED;

    const remainingVoters = totalMembers - proposal.votes.length;
    const maxPossibleYesPercent =
      ((yesVotes + remainingVoters) / totalMembers) * 100;
    if (maxPossibleYesPercent < threshold) return ProposalStatus.REJECTED;

    return ProposalStatus.PENDING;
  }

  private async attachComputedStatuses(proposals: ProposalWithVotes[]) {
    // Batch: collect unique cooperativeIds then fetch settings once per coop
    const coopIds = [...new Set(proposals.map((p) => p.cooperativeId))];
    const settingsMap = new Map<
      string,
      { threshold: number; totalMembers: number }
    >();
    await Promise.all(
      coopIds.map(async (id) => {
        settingsMap.set(id, await this.getCoopVoteSettings(id));
      }),
    );

    return proposals.map((proposal) => {
      const { threshold, totalMembers } = settingsMap.get(
        proposal.cooperativeId,
      ) ?? { threshold: 60, totalMembers: 0 };
      const yesVotes = proposal.votes.filter((v) => v.choice).length;

      let computedStatus: ProposalStatus;
      if (totalMembers === 0) {
        computedStatus = ProposalStatus.PENDING;
      } else {
        const yesPercent = (yesVotes / totalMembers) * 100;
        if (yesPercent >= threshold) {
          computedStatus = ProposalStatus.APPROVED;
        } else {
          const remainingVoters = totalMembers - proposal.votes.length;
          const maxPossible =
            ((yesVotes + remainingVoters) / totalMembers) * 100;
          computedStatus =
            maxPossible < threshold
              ? ProposalStatus.REJECTED
              : ProposalStatus.PENDING;
        }
      }

      return this.mapProposalWithCounts(proposal, computedStatus, threshold);
    });
  }

  private mapProposalWithCounts(
    proposal: ProposalWithVotes,
    computedStatus?: ProposalStatus,
    threshold?: number,
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
      thresholdRequired: threshold,
    };
  }

  private async getCoopVoteSettings(
    cooperativeId: string,
  ): Promise<{ threshold: number; totalMembers: number }> {
    const [coopSettings, platformSettings, memberCount] = await Promise.all([
      this.prisma.cooperativeSettings.findUnique({
        where: { cooperativeId },
        select: { withdrawalThreshold: true },
      }),
      this.prisma.platformSettings.findUnique({
        where: { id: "singleton" },
        select: { withdrawalThresholdDefault: true },
      }),
      this.prisma.membership.count({
        where: { cooperativeId },
      }),
    ]);

    return {
      threshold:
        coopSettings?.withdrawalThreshold ??
        platformSettings?.withdrawalThresholdDefault ??
        60,
      totalMembers: memberCount,
    };
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

  private async getCooperativeMemberEmails(
    cooperativeId: string,
  ): Promise<{ email: string; locale: string }[]> {
    const memberships = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
      },
      select: {
        user: {
          select: {
            email: true,
            preferredLocale: true,
          },
        },
      },
    });

    const recipients = memberships
      .map((membership) => ({
        email: membership.user.email,
        locale: membership.user.preferredLocale ?? "fr",
      }))
      .filter((recipient): recipient is { email: string; locale: string } =>
        Boolean(recipient.email),
      );

    return [
      ...new Map<string, { email: string; locale: string }>(
        recipients.map((recipient) => [recipient.email, recipient]),
      ).values(),
    ];
  }
}
