import { Injectable } from "@nestjs/common";
import { LedgerEventType as PrismaLedgerEventType } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

type FindLedgerOptions = {
  type?: PrismaLedgerEventType;
  limit?: number;
  offset?: number;
};

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

    const celoscanBase =
      process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() ||
      "https://alfajores.celoscan.io";

    return events.map((event) => ({
      ...event,
      celoScanUrl: `${celoscanBase.replace(/\/+$/, "")}/tx/${event.txHash}`,
    }));
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
