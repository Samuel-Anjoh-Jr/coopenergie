import {
  ContributionStatus,
  LedgerEventType,
  Prisma,
  ProposalStatus,
} from "@prisma/client";
import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { getAddress, parseAbi } from "viem";

import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import { publicClient as configuredPublicClient } from "./celo-client";
import { CELO_PUBLIC_CLIENT } from "./blockchain.tokens";
import { PrismaService } from "../prisma/prisma.service";

type BlockchainPublicClient = typeof configuredPublicClient;
type Unwatch = () => void;
type WatchRegistration = {
  cooperativeId: string;
  unwatchers: Unwatch[];
};

type LedgerEventInput = {
  type: LedgerEventType;
  payload: Prisma.InputJsonObject;
  txHash: `0x${string}`;
  blockNumber: bigint;
  cooperativeId: string;
};

const contributionEventAbi = parseAbi([
  "event ContributionMade(address indexed member, uint256 amountXAF, uint256 totalXAF, uint256 timestamp)",
]);

const proposalCreatedEventAbi = parseAbi([
  "event ProposalCreated(uint256 indexed proposalId, address indexed creator, string title, uint256 timestamp)",
]);

const voteCastEventAbi = parseAbi([
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool choice, uint256 yesVotes, uint256 noVotes, uint256 timestamp)",
]);

const fundsReleasedEventAbi = parseAbi([
  "event FundsReleased(address indexed recipient, uint256 amountXAF, uint256 indexed proposalId, uint256 timestamp)",
]);

@Injectable()
export class EventListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventListenerService.name);
  private readonly activeWatchers = new Map<string, WatchRegistration>();

  constructor(
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async onModuleInit() {
    if (process.env.BLOCKCHAIN_ENABLED !== "true") {
      this.logger.log(
        "Blockchain event listener disabled (BLOCKCHAIN_ENABLED is not 'true').",
      );
      return;
    }

    try {
      await this.startListening();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Failed to start blockchain event listeners: ${message}`,
      );
      this.logger.warn(
        "Continuing startup without blockchain event listeners. Check DATABASE_URL and blockchain-related env vars.",
      );
    }
  }

  onModuleDestroy() {
    for (const { unwatchers } of this.activeWatchers.values()) {
      for (const unwatch of unwatchers) {
        unwatch();
      }
    }

    this.activeWatchers.clear();
  }

  async startListening() {
    const cooperatives = await this.prisma.cooperative.findMany({
      where: {
        vaultAddress: {
          not: null,
        },
      },
      select: {
        id: true,
        vaultAddress: true,
      },
    });

    for (const cooperative of cooperatives) {
      if (!cooperative.vaultAddress) {
        continue;
      }

      await this.addVaultToWatch(cooperative.vaultAddress, cooperative.id);
    }
  }

  async watchVaultEvents(vaultAddress: string) {
    const normalizedVaultAddress = this.parseAddress(
      vaultAddress,
      "vaultAddress",
    );
    const watcherKey = normalizedVaultAddress.toLowerCase();

    if (this.activeWatchers.has(watcherKey)) {
      return;
    }

    const cooperative = await this.prisma.cooperative.findFirst({
      where: {
        vaultAddress: normalizedVaultAddress,
      },
      select: {
        id: true,
      },
    });

    if (!cooperative) {
      throw new Error(
        `No cooperative found for vault address ${normalizedVaultAddress}.`,
      );
    }

    const fromBlock = await this.getStartingBlock(cooperative.id);
    const onError = (error: Error) => {
      this.logger.error(
        `Vault watcher error for ${normalizedVaultAddress}: ${error.message}`,
      );
    };

    const unwatchers: Unwatch[] = [
      this.publicClient.watchContractEvent({
        address: normalizedVaultAddress,
        abi: contributionEventAbi,
        eventName: "ContributionMade",
        fromBlock,
        poll: true,
        strict: true,
        onError,
        onLogs: (logs) => {
          void Promise.all(
            logs.map((log) =>
              this.createLedgerEvent({
                type: LedgerEventType.CONTRIBUTION,
                payload: {
                  member: log.args.member,
                  amountXAF: Number(log.args.amountXAF),
                  totalXAF: Number(log.args.totalXAF),
                },
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                cooperativeId: cooperative.id,
              }),
            ),
          );
        },
      }),
      this.publicClient.watchContractEvent({
        address: normalizedVaultAddress,
        abi: proposalCreatedEventAbi,
        eventName: "ProposalCreated",
        fromBlock,
        poll: true,
        strict: true,
        onError,
        onLogs: (logs) => {
          void Promise.all(
            logs.map((log) =>
              this.createLedgerEvent({
                type: LedgerEventType.PROPOSAL,
                payload: {
                  proposalId: Number(log.args.proposalId),
                  creator: log.args.creator,
                  title: log.args.title,
                  timestamp: Number(log.args.timestamp),
                },
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                cooperativeId: cooperative.id,
              }),
            ),
          );
        },
      }),
      this.publicClient.watchContractEvent({
        address: normalizedVaultAddress,
        abi: voteCastEventAbi,
        eventName: "VoteCast",
        fromBlock,
        poll: true,
        strict: true,
        onError,
        onLogs: (logs) => {
          void Promise.all(
            logs.map((log) =>
              this.createLedgerEvent({
                type: LedgerEventType.VOTE,
                payload: {
                  proposalId: Number(log.args.proposalId),
                  voter: log.args.voter,
                  choice: log.args.choice,
                  yesVotes: Number(log.args.yesVotes),
                  noVotes: Number(log.args.noVotes),
                  timestamp: Number(log.args.timestamp),
                  vaultAddress: normalizedVaultAddress,
                },
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                cooperativeId: cooperative.id,
              }),
            ),
          );
        },
      }),
      this.publicClient.watchContractEvent({
        address: normalizedVaultAddress,
        abi: fundsReleasedEventAbi,
        eventName: "FundsReleased",
        fromBlock,
        poll: true,
        strict: true,
        onError,
        onLogs: (logs) => {
          void Promise.all(
            logs.map((log) =>
              this.createLedgerEvent({
                type: LedgerEventType.PAYMENT,
                payload: {
                  recipient: log.args.recipient,
                  amountXAF: Number(log.args.amountXAF),
                  proposalId: Number(log.args.proposalId),
                  timestamp: Number(log.args.timestamp),
                },
                txHash: log.transactionHash,
                blockNumber: log.blockNumber,
                cooperativeId: cooperative.id,
              }),
            ),
          );
        },
      }),
    ];

    this.activeWatchers.set(watcherKey, {
      cooperativeId: cooperative.id,
      unwatchers,
    });

    this.logger.log(
      `Watching vault events for ${normalizedVaultAddress} (${cooperative.id}).`,
    );
  }

  async addVaultToWatch(vaultAddress: string, cooperativeId: string) {
    const normalizedVaultAddress = this.parseAddress(
      vaultAddress,
      "vaultAddress",
    );
    const watcherKey = normalizedVaultAddress.toLowerCase();
    const existing = this.activeWatchers.get(watcherKey);

    if (existing) {
      if (existing.cooperativeId !== cooperativeId) {
        this.logger.warn(
          `Vault ${normalizedVaultAddress} is already watched for cooperative ${existing.cooperativeId}.`,
        );
      }

      return;
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
      throw new Error(`Cooperative ${cooperativeId} not found.`);
    }

    if (
      !cooperative.vaultAddress ||
      cooperative.vaultAddress.toLowerCase() !== watcherKey
    ) {
      await this.prisma.cooperative.update({
        where: {
          id: cooperativeId,
        },
        data: {
          vaultAddress: normalizedVaultAddress,
        },
      });
    }

    await this.watchVaultEvents(normalizedVaultAddress);
  }

  async createLedgerEvent(data: LedgerEventInput) {
    const existing = await this.prisma.ledgerEvent.findUnique({
      where: {
        txHash: data.txHash,
      },
    });

    const ledgerEvent = await this.prisma.ledgerEvent.upsert({
      where: {
        txHash: data.txHash,
      },
      update: {
        type: data.type,
        payload: data.payload,
        blockNumber: Number(data.blockNumber),
        cooperativeId: data.cooperativeId,
      },
      create: {
        type: data.type,
        payload: data.payload,
        txHash: data.txHash,
        blockNumber: Number(data.blockNumber),
        cooperativeId: data.cooperativeId,
      },
    });

    await this.syncDomainRecords(data);

    if (!existing) {
      this.eventEmitter.emit("blockchain.ledger-event", ledgerEvent);
    }

    return ledgerEvent;
  }

  private async syncDomainRecords(data: LedgerEventInput) {
    switch (data.type) {
      case LedgerEventType.CONTRIBUTION:
        await this.syncContributionRecord(data);
        return;
      case LedgerEventType.PROPOSAL:
        await this.syncProposalRecord(data);
        return;
      case LedgerEventType.VOTE:
        await this.syncVoteRecord(data);
        return;
      case LedgerEventType.PAYMENT:
      case LedgerEventType.MEMBERSHIP:
        return;
    }
  }

  private async syncContributionRecord(data: LedgerEventInput) {
    const member = this.readString(data.payload.member);
    const amountXAF = this.readNumber(data.payload.amountXAF);

    if (!member || amountXAF === undefined) {
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        celoAddress: {
          equals: member,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return;
    }

    const contribution = await this.prisma.contribution.findFirst({
      where: {
        cooperativeId: data.cooperativeId,
        userId: user.id,
        amountXAF,
        txHash: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!contribution) {
      return;
    }

    await this.prisma.contribution.update({
      where: {
        id: contribution.id,
      },
      data: {
        txHash: data.txHash,
        blockNumber: Number(data.blockNumber),
        status: ContributionStatus.CONFIRMED,
      },
    });
  }

  private async syncProposalRecord(data: LedgerEventInput) {
    const creator = this.readString(data.payload.creator);
    const title = this.readString(data.payload.title);
    const proposalId = this.readNumber(data.payload.proposalId);

    if (!creator || !title || proposalId === undefined) {
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        celoAddress: {
          equals: creator,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return;
    }

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        cooperativeId: data.cooperativeId,
        creatorId: user.id,
        title,
        txHash: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (!proposal) {
      return;
    }

    await this.prisma.proposal.update({
      where: {
        id: proposal.id,
      },
      data: {
        txHash: data.txHash,
        blockNumber: proposalId,
      },
    });
  }

  private async syncVoteRecord(data: LedgerEventInput) {
    const voter = this.readString(data.payload.voter);
    const proposalNumber = this.readNumber(data.payload.proposalId);
    const choice = this.readBoolean(data.payload.choice);
    const vaultAddress = this.readString(data.payload.vaultAddress);
    const yesVotes = this.readNumber(data.payload.yesVotes);
    const noVotes = this.readNumber(data.payload.noVotes);

    if (
      !voter ||
      proposalNumber === undefined ||
      choice === undefined ||
      !vaultAddress
    ) {
      return;
    }

    const user = await this.prisma.user.findFirst({
      where: {
        celoAddress: {
          equals: voter,
          mode: "insensitive",
        },
      },
      select: {
        id: true,
      },
    });

    if (!user) {
      return;
    }

    const onChainProposal = (await this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "getProposal",
      args: [BigInt(proposalNumber)],
      authorizationList: undefined,
    })) as {
      id: bigint;
      title: string;
      description: string;
      yesVotes: bigint;
      noVotes: bigint;
      resolved: boolean;
      approved: boolean;
      createdAt: bigint;
    };

    const proposal = await this.prisma.proposal.findFirst({
      where: {
        cooperativeId: data.cooperativeId,
        title: onChainProposal.title,
      },
      orderBy: {
        createdAt: "asc",
      },
      select: {
        id: true,
      },
    });

    if (!proposal) {
      return;
    }

    const vote = await this.prisma.vote.findFirst({
      where: {
        proposalId: proposal.id,
        userId: user.id,
        choice,
        txHash: null,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
      },
    });

    if (vote) {
      await this.prisma.vote.update({
        where: {
          id: vote.id,
        },
        data: {
          txHash: data.txHash,
          blockNumber: Number(data.blockNumber),
        },
      });
    }

    const resolved =
      onChainProposal.resolved ||
      ((yesVotes ?? Number(onChainProposal.yesVotes)) +
        (noVotes ?? Number(onChainProposal.noVotes)) >
        5 &&
        (yesVotes ?? Number(onChainProposal.yesVotes)) !==
          (noVotes ?? Number(onChainProposal.noVotes)));

    await this.prisma.proposal.update({
      where: {
        id: proposal.id,
      },
      data: {
        status: resolved
          ? onChainProposal.approved
            ? ProposalStatus.APPROVED
            : ProposalStatus.REJECTED
          : ProposalStatus.PENDING,
      },
    });
  }

  private async getStartingBlock(
    cooperativeId: string,
  ): Promise<bigint | undefined> {
    const latestLedgerEvent = await this.prisma.ledgerEvent.findFirst({
      where: {
        cooperativeId,
      },
      orderBy: {
        blockNumber: "desc",
      },
      select: {
        blockNumber: true,
      },
    });

    if (latestLedgerEvent) {
      return BigInt(latestLedgerEvent.blockNumber + 1);
    }

    return undefined;
  }

  private parseAddress(value: string, label: string): `0x${string}` {
    try {
      return getAddress(value);
    } catch {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }

  private readString(value: unknown): string | undefined {
    return typeof value === "string" ? value : undefined;
  }

  private readNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value)
      ? value
      : undefined;
  }

  private readBoolean(value: unknown): boolean | undefined {
    return typeof value === "boolean" ? value : undefined;
  }
}
