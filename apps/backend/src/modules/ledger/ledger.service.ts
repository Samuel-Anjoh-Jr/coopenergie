import { Injectable } from "@nestjs/common";
import { LedgerEventType as PrismaLedgerEventType } from "@prisma/client";

import { buildCeloScanTxUrl } from "../../common/celoscan.util";
import { PrismaService } from "../../prisma/prisma.service";

type FindLedgerOptions = {
  type?: PrismaLedgerEventType;
  limit?: number;
  offset?: number;
};

type EventPayload = Record<string, unknown>;

function extractWalletAddress(
  payload: EventPayload,
  type: string,
): string | null {
  const t = type.toUpperCase();
  if (t === "PROPOSAL") return (payload.creator as string) || null;
  if (t === "CONTRIBUTION") return (payload.member as string) || null;
  if (t === "VOTE") return (payload.voter as string) || null;
  if (t === "PAYMENT") return (payload.recipient as string) || null;
  return null;
}

@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  async findByCooperative(cooperativeId: string, options: FindLedgerOptions) {
    const events = await this.prisma.ledgerEvent.findMany({
      where: {
        cooperativeId,
        ...(options.type ? { type: options.type } : {}),
      },
      orderBy: {
        createdAt: "desc",
      },
      take: options.limit ?? 20,
      skip: options.offset ?? 0,
    });

    // Collect all wallet addresses to resolve performer names in one query
    const walletAddresses = events
      .map((e) => extractWalletAddress(e.payload as EventPayload, e.type))
      .filter((addr): addr is string => !!addr);

    const walletToName = new Map<string, string>();
    if (walletAddresses.length > 0) {
      const users = await this.prisma.user.findMany({
        where: { celoAddress: { in: walletAddresses } },
        select: { celoAddress: true, name: true },
      });
      for (const user of users) {
        if (user.celoAddress) {
          walletToName.set(user.celoAddress.toLowerCase(), user.name);
        }
      }
    }

    return events.map((event) => {
      const payload = event.payload as EventPayload;
      const walletAddr = extractWalletAddress(payload, event.type);
      const performerName = walletAddr
        ? (walletToName.get(walletAddr.toLowerCase()) ?? null)
        : null;

      return {
        ...event,
        payload: { ...payload, performerName },
        celoScanUrl: buildCeloScanTxUrl(event.txHash),
      };
    });
  }

  async getStats(cooperativeId: string) {
    const [totalTransactions, distinctBlocks] = await Promise.all([
      this.prisma.ledgerEvent.count({
        where: {
          cooperativeId,
        },
      }),
      this.prisma.ledgerEvent.findMany({
        where: {
          cooperativeId,
        },
        distinct: ["blockNumber"],
        select: {
          blockNumber: true,
        },
      }),
    ]);

    return {
      totalTransactions,
      blockCount: distinctBlocks.length,
      verifiedCount: totalTransactions,
      modificationsCount: 0,
    };
  }
}
