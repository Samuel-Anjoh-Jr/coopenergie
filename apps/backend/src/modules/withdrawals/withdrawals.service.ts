import { createHash } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ContributionStatus,
  ProposalType,
  Role,
  WithdrawalDestinationType,
  WithdrawalStatus,
} from "@prisma/client";

import { detectCameroonCarrier } from "../../common/phone-utils";
import { RelayerService } from "../../blockchain/relayer.service";
import { VaultService } from "../../blockchain/vault.service";
import { MailService } from "../../mail/mail.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateWithdrawalProposalDto } from "./dto/create-withdrawal-proposal.dto";
import { DisbursementService } from "./disbursement.service";

@Injectable()
export class WithdrawalsService {
  private readonly logger = new Logger(WithdrawalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly relayerService: RelayerService,
    private readonly vaultService: VaultService,
    private readonly disbursementService: DisbursementService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async createWithdrawalProposal(
    adminUserId: string,
    cooperativeId: string,
    dto: CreateWithdrawalProposalDto,
  ) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: adminUserId,
          cooperativeId,
        },
      },
      select: {
        role: true,
      },
    });

    if (membership?.role !== Role.COOP_ADMIN) {
      throw new ForbiddenException("Cooperative admin access is required.");
    }

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        name: true,
        suspended: true,
        withdrawalsLocked: true,
        confirmedBalanceXAF: true,
        vaultAddress: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    if (cooperative.suspended) {
      throw new BadRequestException(
        "This cooperative is suspended and cannot create withdrawal proposals.",
      );
    }

    if (cooperative.withdrawalsLocked) {
      throw new BadRequestException(
        "Withdrawals are currently locked for this cooperative.",
      );
    }

    if (cooperative.confirmedBalanceXAF < dto.amountXAF) {
      throw new BadRequestException(
        "Cannot withdraw more than the cooperative balance.",
      );
    }

    this.validateDestinationDetails(dto);

    const adminUser = await this.prisma.user.findUnique({
      where: {
        id: adminUserId,
      },
      select: {
        id: true,
        celoAddress: true,
        celoKeyEncrypted: true,
      },
    });

    if (!adminUser) {
      throw new NotFoundException("User not found.");
    }

    const proposalTitle = `Retrait: ${dto.amountXAF} FCFA`;

    const created = await this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.create({
        data: {
          cooperativeId,
          creatorId: adminUserId,
          title: proposalTitle,
          description: dto.reason.trim(),
          type: ProposalType.WITHDRAWAL,
        },
      });

      const withdrawalRequest = await tx.withdrawalRequest.create({
        data: {
          cooperativeId,
          proposalId: proposal.id,
          amountXAF: dto.amountXAF,
          destinationType: dto.destinationType,
          recipientPhone: dto.recipientPhone ?? null,
          recipientOperator: dto.recipientOperator ?? null,
          recipientBankName: dto.recipientBankName ?? null,
          recipientBankAccount: dto.recipientBankAccount ?? null,
          recipientName: dto.recipientName.trim(),
          status: WithdrawalStatus.PENDING_VOTE,
        },
      });

      return {
        proposal,
        withdrawalRequest,
      };
    });

    const blockchainEnabled = process.env.BLOCKCHAIN_ENABLED === "true";
    const vaultReady = !!cooperative.vaultAddress;

    if (blockchainEnabled && vaultReady) {
      if (!adminUser.celoAddress || !adminUser.celoKeyEncrypted) {
        throw new BadRequestException(
          "User must have a CELO wallet before creating a withdrawal proposal.",
        );
      }

      try {
        const relayResult = await this.relayerService.relayCreateProposal(
          cooperative.vaultAddress,
          adminUser.celoAddress,
          adminUser.celoKeyEncrypted,
          proposalTitle,
          dto.reason.trim(),
        );
        const onChainProposalId = Number(
          await this.vaultService.getProposalCount(cooperative.vaultAddress),
        );

        created.proposal = await this.prisma.proposal.update({
          where: {
            id: created.proposal.id,
          },
          data: {
            txHash: relayResult.txHash,
            blockNumber: onChainProposalId,
          },
        });
      } catch (error) {
        this.logger.error(
          `Failed to relay withdrawal proposal ${created.proposal.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        throw new InternalServerErrorException(
          "Failed to create withdrawal proposal on-chain.",
        );
      }
    } else {
      if (blockchainEnabled && !vaultReady) {
        this.logger.warn(
          `Cooperative ${cooperativeId} has no vault address yet`,
        );
      }

      created.proposal = await this.prisma.proposal.update({
        where: {
          id: created.proposal.id,
        },
        data: {
          txHash: this.generateFakeTxHash(
            cooperativeId,
            adminUserId,
            dto.amountXAF,
            dto.reason,
          ),
        },
      });
    }

    await this.notificationsService.notifyNewProposal(
      cooperativeId,
      created.proposal.title,
      created.proposal.type,
      {
        proposalId: created.proposal.id,
        withdrawalRequestId: created.withdrawalRequest.id,
        amountXAF: created.withdrawalRequest.amountXAF,
        destinationType: created.withdrawalRequest.destinationType,
        recipientName: created.withdrawalRequest.recipientName,
      },
    );
    await this.mailService.sendVoteNotification(
      await this.getCooperativeMemberEmails(cooperativeId),
      cooperative.name,
      created.proposal.title,
    );

    return created;
  }

  async getEligibleVoters(cooperativeId: string) {
    const contributionSums = await this.prisma.contribution.groupBy({
      by: ["userId"],
      where: {
        cooperativeId,
        status: ContributionStatus.CONFIRMED,
      },
      _sum: {
        amountXAF: true,
      },
    });

    if (contributionSums.length === 0) {
      return [];
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
        userId: {
          in: contributionSums.map((entry) => entry.userId),
        },
      },
      select: {
        userId: true,
      },
    });

    const memberIds = new Set(
      memberships.map((membership) => membership.userId),
    );

    return contributionSums
      .filter((entry) => memberIds.has(entry.userId))
      .map((entry) => ({
        userId: entry.userId,
        amountContributed: entry._sum.amountXAF ?? 0,
      }));
  }

  async evaluateWithdrawalThreshold(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      select: {
        id: true,
        cooperativeId: true,
        type: true,
      },
    });

    if (!proposal) {
      throw new NotFoundException("Proposal not found.");
    }

    if (proposal.type !== ProposalType.WITHDRAWAL) {
      throw new BadRequestException("Proposal is not a withdrawal proposal.");
    }

    const [cooperativeSettings, platformSettings, eligibleVoters] =
      await Promise.all([
        this.prisma.cooperativeSettings.findUnique({
          where: {
            cooperativeId: proposal.cooperativeId,
          },
          select: {
            withdrawalThreshold: true,
          },
        }),
        this.prisma.platformSettings.findUnique({
          where: {
            id: "singleton",
          },
          select: {
            withdrawalThresholdDefault: true,
            withdrawalQuorumMinVotes: true,
          },
        }),
        this.getEligibleVoters(proposal.cooperativeId),
      ]);

    const threshold =
      cooperativeSettings?.withdrawalThreshold ??
      platformSettings?.withdrawalThresholdDefault ??
      60;
    const quorumMin = platformSettings?.withdrawalQuorumMinVotes ?? 3;
    const eligibleUserIds = eligibleVoters.map((voter) => voter.userId);
    const eligibleVoterCount = eligibleUserIds.length;

    if (eligibleVoterCount === 0) {
      return {
        approved: false,
        resolved: true,
        reason: "no eligible voters",
        threshold,
        quorumMin,
        yesVotes: 0,
        noVotes: 0,
        totalEligibleVoted: 0,
        eligibleVoterCount,
      };
    }

    const [yesVotes, noVotes] = await Promise.all([
      this.prisma.vote.count({
        where: {
          proposalId,
          choice: true,
          userId: {
            in: eligibleUserIds,
          },
        },
      }),
      this.prisma.vote.count({
        where: {
          proposalId,
          choice: false,
          userId: {
            in: eligibleUserIds,
          },
        },
      }),
    ]);

    const totalEligibleVoted = yesVotes + noVotes;

    if (totalEligibleVoted < quorumMin) {
      return {
        approved: false,
        resolved: false,
        reason: "quorum not reached",
        threshold,
        quorumMin,
        yesVotes,
        noVotes,
        totalEligibleVoted,
        eligibleVoterCount,
      };
    }

    const yesPercent = (yesVotes / eligibleVoterCount) * 100;

    if (yesPercent >= threshold) {
      return {
        approved: true,
        resolved: true,
        yesPercent,
        threshold,
        quorumMin,
        yesVotes,
        noVotes,
        totalEligibleVoted,
        eligibleVoterCount,
      };
    }

    const remainingVoters = eligibleVoterCount - totalEligibleVoted;
    const maxPossibleYesPercent =
      ((yesVotes + remainingVoters) / eligibleVoterCount) * 100;

    if (maxPossibleYesPercent < threshold) {
      return {
        approved: false,
        resolved: true,
        yesPercent,
        threshold,
        quorumMin,
        yesVotes,
        noVotes,
        totalEligibleVoted,
        eligibleVoterCount,
      };
    }

    return {
      approved: false,
      resolved: false,
      yesPercent,
      threshold,
      quorumMin,
      yesVotes,
      noVotes,
      totalEligibleVoted,
      eligibleVoterCount,
    };
  }

  async processWithdrawalOnVote(proposalId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: {
        id: proposalId,
      },
      include: {
        withdrawalRequest: {
          select: {
            amountXAF: true,
            id: true,
            status: true,
          },
        },
      },
    });

    if (!proposal || proposal.type !== ProposalType.WITHDRAWAL) {
      return null;
    }

    if (!proposal.withdrawalRequest) {
      throw new NotFoundException("Withdrawal request not found.");
    }

    const evaluation = await this.evaluateWithdrawalThreshold(proposalId);

    if (evaluation.approved) {
      await this.prisma.$transaction(async (tx) => {
        await tx.proposal.update({
          where: {
            id: proposalId,
          },
          data: {
            status: "APPROVED",
          },
        });

        await tx.withdrawalRequest.update({
          where: {
            id: proposal.withdrawalRequest.id,
          },
          data: {
            status: WithdrawalStatus.APPROVED,
            failureReason: null,
          },
        });
      });

      await this.notificationsService.notifyWithdrawalApproved(
        proposal.cooperativeId,
        proposal.creatorId,
        proposal.withdrawalRequest.amountXAF,
        {
          proposalId,
          withdrawalRequestId: proposal.withdrawalRequest.id,
        },
      );

      try {
        await this.disbursementService.disburse(proposal.withdrawalRequest.id);
      } catch (error) {
        this.logger.error(
          `Withdrawal disbursement failed for ${proposal.withdrawalRequest.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      return {
        ...evaluation,
        proposalStatus: "APPROVED",
      };
    }

    if (evaluation.resolved) {
      await this.prisma.$transaction(async (tx) => {
        await tx.proposal.update({
          where: {
            id: proposalId,
          },
          data: {
            status: "REJECTED",
          },
        });

        await tx.withdrawalRequest.update({
          where: {
            id: proposal.withdrawalRequest.id,
          },
          data: {
            status: WithdrawalStatus.REJECTED,
          },
        });
      });

      return {
        ...evaluation,
        proposalStatus: "REJECTED",
      };
    }

    return evaluation;
  }

  async findByCooperative(cooperativeId: string) {
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

    return this.prisma.withdrawalRequest.findMany({
      where: {
        cooperativeId,
      },
      include: {
        proposal: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  private validateDestinationDetails(dto: CreateWithdrawalProposalDto) {
    if (dto.destinationType === WithdrawalDestinationType.BANK_TRANSFER) {
      if (!dto.recipientBankName || !dto.recipientBankAccount) {
        throw new BadRequestException(
          "Bank name and account are required for bank transfers.",
        );
      }

      return;
    }

    const detectedCarrier = dto.recipientPhone
      ? detectCameroonCarrier(dto.recipientPhone)
      : null;

    if (!detectedCarrier) {
      throw new BadRequestException(
        "A valid MTN or Orange Cameroon number is required for mobile money withdrawals.",
      );
    }

    dto.recipientPhone = detectedCarrier.normalizedPhone;
    dto.recipientOperator = detectedCarrier.carrier;
  }

  private generateFakeTxHash(
    cooperativeId: string,
    userId: string,
    amountXAF: number,
    reason: string,
  ): `0x${string}` {
    return `0x${createHash("sha256")
      .update(`${cooperativeId}-${userId}-${amountXAF}-${reason}-${Date.now()}`)
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
