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


    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });


    // Clamp to the latest block if the receipt block is ahead
    const latestBlock = await this.publicClient.getBlockNumber();
    const safeBlock = receipt.blockNumber > latestBlock ? latestBlock : receipt.blockNumber;

    // Loosen block range: search up to 5 blocks before
    const fromBlock = safeBlock > 5n ? safeBlock - 5n : 0n;
    const toBlock = safeBlock;

    const deploymentLogs = await this.publicClient.getLogs({
      address: factoryAddress,
      event: parseAbiItem(
        "event CooperativeDeployed(address indexed vault, string name, address indexed admin, uint256 timestamp)",
      ),
      fromBlock,
      toBlock,
    });

    for (const log of deploymentLogs) {
      if (log.transactionHash !== txHash) {
        continue;
      }

      return {
        vaultAddress: getAddress(log.args.vault),
        txHash,
        celoScanUrl: this.buildCeloScanUrl(txHash),
      };
    }

    // Log debug info if not found
    this.publicClient.getTransaction({ hash: txHash }).then(tx => {
      // eslint-disable-next-line no-console
      console.error('[DEBUG] Transaction:', tx);
    }).catch(() => {});
    // eslint-disable-next-line no-console
    console.error('[DEBUG] Receipt:', receipt);
    // eslint-disable-next-line no-console
    console.error('[DEBUG] Block range searched:', { fromBlock, toBlock });
    // eslint-disable-next-line no-console
    console.error('[DEBUG] deploymentLogs:', deploymentLogs);
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
