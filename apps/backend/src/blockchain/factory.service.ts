import { Inject, Injectable } from "@nestjs/common";
import { getAddress, parseAbiItem } from "viem";

import { coopFactoryAbi } from "./abis/coop-factory.abi";
import {
  publicClient as configuredPublicClient,
  walletClient as configuredWalletClient,
} from "./celo-client";
import {
  CELO_PUBLIC_CLIENT,
  CELO_WALLET_CLIENT,
  COOP_FACTORY_ADDRESS,
} from "./blockchain.tokens";

type BlockchainPublicClient = typeof configuredPublicClient;
type BlockchainWalletClient = typeof configuredWalletClient;

type DeployCooperativeResult = {
  vaultAddress: `0x${string}`;
  txHash: `0x${string}`;
  celoScanUrl: string;
};

@Injectable()
export class FactoryService {
  constructor(
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
    @Inject(CELO_WALLET_CLIENT)
    private readonly walletClient: BlockchainWalletClient,
    @Inject(COOP_FACTORY_ADDRESS)
    private readonly factoryAddress: string,
  ) {}

  async deployCooperative(
    name: string,
    targetAmountXAF: number,
    adminAddress: string,
  ): Promise<DeployCooperativeResult> {
    const walletClient = this.getWalletClient();
    const factoryAddress = this.getConfiguredFactoryAddress();
    const admin = this.parseAddress(adminAddress, "adminAddress");

    const txHash = await walletClient.writeContract({
      address: factoryAddress,
      abi: coopFactoryAbi,
      functionName: "deployCooperative",
      args: [name, BigInt(targetAmountXAF), admin],
      account: walletClient.account,
      chain: walletClient.chain,
      kzg: undefined,
    });

    // Debug logs for explorer lookup

    console.log("[DEBUG] Factory address:", factoryAddress);

    console.log("[DEBUG] Transaction hash:", txHash);

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    // Clamp to the latest block if the receipt block is ahead
    const latestBlock = await this.publicClient.getBlockNumber();
    const safeBlock =
      receipt.blockNumber > latestBlock ? latestBlock : receipt.blockNumber;

    // Loosen block range: search up to 5 blocks before
    const fromBlock = safeBlock > 5n ? safeBlock - 5n : 0n;
    const toBlock = safeBlock;

    let deploymentLogs = await this.publicClient.getLogs({
      address: factoryAddress,
      event: parseAbiItem(
        "event CooperativeDeployed(address indexed vault, string name, address indexed admin, uint256 timestamp)",
      ),
      fromBlock,
      toBlock,
    });

    // Fallback: If no logs found, try parsing from receipt.logs using viem's decodeEventLog
    if (!deploymentLogs.length) {
      console.warn(
        "[FALLBACK] getLogs returned empty, parsing receipt.logs for CooperativeDeployed event",
      );
      const eventTopic =
        "0xb2b64c1dbc055e1c9d7a70d3d8111e859954e120b4c34ca85087eaaf713c1b7e";
      const { decodeEventLog } = await import("viem");
      for (const log of receipt.logs as any[]) {
        try {
          if (
            typeof log.topics !== "undefined" &&
            log.address.toLowerCase() === factoryAddress.toLowerCase() &&
            log.topics[0] === eventTopic &&
            log.transactionHash === txHash
          ) {
            // Use viem's decodeEventLog for robust decoding
            const decoded = decodeEventLog({
              abi: coopFactoryAbi,
              data: (log as any).data,
              topics: (log as any).topics,
            }) as { args: { vault: string } };

            console.info(
              "[FALLBACK] Decoded CooperativeDeployed event:",
              (decoded as any).args,
            );
            return {
              vaultAddress: getAddress((decoded as any).args.vault),
              txHash,
              celoScanUrl: this.buildCeloScanUrl(txHash),
              // If you want to return admin, timestamp, name, fallback, extend DeployCooperativeResult type
            };
          }
        } catch (err) {
          console.error("[FALLBACK] Error decoding log:", err, log);
        }
      }
    }

    for (const log of deploymentLogs as any[]) {
      if (log.transactionHash !== txHash) {
        continue;
      }
      // log.args may be missing type, so cast as any
      return {
        vaultAddress: getAddress((log as any).args.vault),
        txHash,
        celoScanUrl: this.buildCeloScanUrl(txHash),
      };
    }

    // Log debug info if not found
    this.publicClient
      .getTransaction({ hash: txHash })
      .then((tx) => {
        console.error("[DEBUG] Transaction:", tx);
      })
      .catch(() => {});

    console.error("[DEBUG] Receipt:", receipt);

    console.error("[DEBUG] Block range searched:", { fromBlock, toBlock });

    console.error("[DEBUG] deploymentLogs:", deploymentLogs);
    throw new Error(
      `CooperativeDeployed event not found in transaction receipt ${txHash}.`,
    );
  }

  private getWalletClient(): NonNullable<BlockchainWalletClient> {
    if (!this.walletClient?.account) {
      throw new Error(
        "Relayer wallet is not configured. Set CELO_RELAYER_PRIVATE_KEY before using FactoryService.",
      );
    }

    return this.walletClient;
  }

  private getConfiguredFactoryAddress(): `0x${string}` {
    return this.parseAddress(this.factoryAddress, "COOP_FACTORY_ADDRESS");
  }

  private parseAddress(value: string, label: string): `0x${string}` {
    try {
      return getAddress(value);
    } catch {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }

  private buildCeloScanUrl(txHash: `0x${string}`): string {
    const baseUrl =
      process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() ||
      "https://celo-sepolia.blockscout.com";

    return `${baseUrl.replace(/\/+$/, "")}/tx/${txHash}`;
  }
}
