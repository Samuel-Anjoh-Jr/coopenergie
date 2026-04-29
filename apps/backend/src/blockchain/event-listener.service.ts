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
import { getEventLogsRobust } from "./getEventLogsRobust";

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
    const pollInterval = process.env.BLOCKCHAIN_POLL_INTERVAL
      ? parseInt(process.env.BLOCKCHAIN_POLL_INTERVAL, 10)
      : 15000;
    const isTestnet =
      (this.publicClient.chain?.id?.toString() || "").includes("44787") ||
      (this.publicClient.transport?.url || "").includes("sepolia");

    // Helper to poll logs for an event
    const pollEvent = (
      abi: any,
      eventName: string,
      ledgerType: LedgerEventType,
      payloadMapper: (args: any, log: any) => any,
    ) => {
      let lastBlock = fromBlock;
      let stopped = false;
      const poll = async () => {
        while (!stopped) {
          try {
            const latestBlock = await this.publicClient.getBlockNumber();
            if (latestBlock > lastBlock) {
              const logs = await getEventLogsRobust({
                publicClient: this.publicClient as any, // Cast to fix viem type error
                address: normalizedVaultAddress,
                abi,
                eventName,
                fromBlock: lastBlock + 1n,
                toBlock: latestBlock,
                txHash: undefined,
                receipt: undefined,
              });
              for (const log of logs) {
                const logWithArgs = log as any;
                await this.createLedgerEvent({
                  type: ledgerType,
                  payload: payloadMapper(logWithArgs.args, logWithArgs),
                  txHash: logWithArgs.transactionHash,
                  blockNumber: logWithArgs.blockNumber,
                  cooperativeId: cooperative.id,
                });
              }
              lastBlock = latestBlock;
            }
          } catch (err) {
            this.logger.error(`[Polling] Error polling ${eventName}: ${err}`);
          }
          await new Promise((res) => setTimeout(res, pollInterval));
        }
      };
      poll();
      return () => {
        stopped = true;
      };
    };

    let unwatchers: Unwatch[] = [];

    if (isTestnet) {
      // Use polling for testnet
      unwatchers = [
        pollEvent(
          contributionEventAbi,
          "ContributionMade",
          LedgerEventType.CONTRIBUTION,
          (args) => ({
            member: args.member,
            amountXAF: Number(args.amountXAF),
            totalXAF: Number(args.totalXAF),
          }),
        ),
        pollEvent(
          proposalCreatedEventAbi,
          "ProposalCreated",
          LedgerEventType.PROPOSAL,
          (args) => ({
            proposalId: Number(args.proposalId),
            creator: args.creator,
            title: args.title,
            timestamp: Number(args.timestamp),
          }),
        ),
        pollEvent(
          voteCastEventAbi,
          "VoteCast",
          LedgerEventType.VOTE,
          (args, log) => ({
            proposalId: Number(args.proposalId),
            voter: args.voter,
            choice: args.choice,
            yesVotes: Number(args.yesVotes),
            noVotes: Number(args.noVotes),
            timestamp: Number(args.timestamp),
            vaultAddress: normalizedVaultAddress,
          }),
        ),
        pollEvent(
          fundsReleasedEventAbi,
          "FundsReleased",
          LedgerEventType.PAYMENT,
          (args) => ({
            recipient: args.recipient,
            amountXAF: Number(args.amountXAF),
            proposalId: Number(args.proposalId),
            timestamp: Number(args.timestamp),
          }),
        ),
      ];
    } else {
      // Use watchContractEvent for mainnet, with error handling and fallback
      const makeWatcher = (
        abi: any,
        eventName: string,
        ledgerType: LedgerEventType,
        payloadMapper: (args: any, log: any) => any,
      ) => {
        let watcher: any;
        let stopped = false;
        const startWatcher = () => {
          watcher = this.publicClient.watchContractEvent({
            address: normalizedVaultAddress,
            abi,
            eventName,
            fromBlock,
            poll: true,
            strict: true,
            onError: (error: Error) => {
              this.logger.error(
                `[Watcher] Error for ${eventName}: ${error.message}`,
              );
              if (
                error.message.includes("filter not found") ||
                error.message.includes("Missing or invalid parameters")
              ) {
                this.logger.warn(
                  `[Watcher] Restarting watcher for ${eventName} due to filter error.`,
                );
                if (watcher && typeof watcher === "function") watcher();
                if (!stopped) setTimeout(startWatcher, pollInterval);
              }
            },
            onLogs: (logs) => {
              void Promise.all(
                logs.map((log) => {
                  const logWithArgs = log as any;
                  return this.createLedgerEvent({
                    type: ledgerType,
                    payload: payloadMapper(logWithArgs.args, logWithArgs),
                    txHash: logWithArgs.transactionHash,
                    blockNumber: logWithArgs.blockNumber,
                    cooperativeId: cooperative.id,
                  });
                }),
              );
            },
          });
        };
        startWatcher();
        return () => {
          stopped = true;
          if (watcher && typeof watcher === "function") watcher();
        };
      };
      unwatchers = [
        makeWatcher(
          contributionEventAbi,
          "ContributionMade",
          LedgerEventType.CONTRIBUTION,
          (args) => ({
            member: args.member,
            amountXAF: Number(args.amountXAF),
            totalXAF: Number(args.totalXAF),
          }),
        ),
        makeWatcher(
          proposalCreatedEventAbi,
          "ProposalCreated",
          LedgerEventType.PROPOSAL,
          (args) => ({
            proposalId: Number(args.proposalId),
            creator: args.creator,
            title: args.title,
            timestamp: Number(args.timestamp),
          }),
        ),
        makeWatcher(
          voteCastEventAbi,
          "VoteCast",
          LedgerEventType.VOTE,
          (args, log) => ({
            proposalId: Number(args.proposalId),
            voter: args.voter,
            choice: args.choice,
            yesVotes: Number(args.yesVotes),
            noVotes: Number(args.noVotes),
            timestamp: Number(args.timestamp),
            vaultAddress: normalizedVaultAddress,
          }),
        ),
        makeWatcher(
          fundsReleasedEventAbi,
          "FundsReleased",
          LedgerEventType.PAYMENT,
          (args) => ({
            recipient: args.recipient,
            amountXAF: Number(args.amountXAF),
            proposalId: Number(args.proposalId),
            timestamp: Number(args.timestamp),
          }),
        ),
      ];
    }

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

  private async getStartingBlock(cooperativeId: string): Promise<bigint> {
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

    // If no ledger event, use the latest block number from the chain
    return await this.publicClient.getBlockNumber();
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
