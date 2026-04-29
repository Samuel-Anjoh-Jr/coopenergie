import { Inject, Injectable } from "@nestjs/common";
import { createWalletClient, getAddress } from "viem";
import { privateKeyToAccount } from "viem/accounts";

import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import {
  celoChain,
  celoTransport,
  publicClient as configuredPublicClient,
} from "./celo-client";
import { CELO_PUBLIC_CLIENT } from "./blockchain.tokens";
import { WalletService } from "./wallet.service";

type BlockchainPublicClient = typeof configuredPublicClient;
type ReleaseFundsResult = {
  txHash: `0x${string}`;
  blockNumber: bigint;
};

@Injectable()
export class VaultService {
  constructor(
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
    private readonly walletService: WalletService,
  ) {}

  async getTotalContributed(vaultAddress: string): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "totalContributedXAF",
      args: [],
      authorizationList: undefined,
    })) as bigint;
  }

  async getMemberContribution(
    vaultAddress: string,
    memberAddress: string,
  ): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "getMemberContribution",
      args: [this.parseAddress(memberAddress, "memberAddress")],
      authorizationList: undefined,
    })) as bigint;
  }

  async getProposal(vaultAddress: string, proposalId: number) {
    return this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "getProposal",
      args: [BigInt(proposalId)],
      authorizationList: undefined,
    });
  }

  async getProposalCount(vaultAddress: string): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "proposalCount",
      args: [],
      authorizationList: undefined,
    })) as bigint;
  }

  async getAdmin(vaultAddress: string): Promise<`0x${string}`> {
    return (await this.publicClient.readContract({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
      abi: cooperativeVaultAbi,
      functionName: "admin",
      args: [],
      authorizationList: undefined,
    })) as `0x${string}`;
  }

  async releaseFundsAsAdmin(
    vaultAddress: string,
    encryptedAdminPrivateKey: string,
    recipient: string,
    amountXAF: number,
    proposalId: number,
  ): Promise<ReleaseFundsResult> {
    const targetVaultAddress = this.parseAddress(vaultAddress, "vaultAddress");
    const onChainAdminAddress = getAddress(
      await this.getAdmin(targetVaultAddress),
    );
    const account = privateKeyToAccount(
      this.normalizePrivateKey(
        this.walletService.getDecryptedPrivateKey(encryptedAdminPrivateKey),
      ),
    );

    if (getAddress(account.address) !== onChainAdminAddress) {
      throw new Error(
        "Stored CELO key does not match the vault's on-chain admin address.",
      );
    }

    const walletClient = createWalletClient({
      account,
      chain: celoChain,
      transport: celoTransport,
    });

    const txHash = await this.withRetry(() =>
      walletClient.writeContract({
        address: targetVaultAddress,
        abi: cooperativeVaultAbi,
        functionName: "releaseFunds",
        args: [
          this.parseFundsRecipient(recipient),
          BigInt(amountXAF),
          BigInt(proposalId),
        ],
        account,
        chain: celoChain,
      }),
    );

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    return {
      txHash,
      blockNumber: receipt.blockNumber,
    };
  }

  async getVaultBalance(vaultAddress: string): Promise<bigint> {
    return this.publicClient.getBalance({
      address: this.parseAddress(vaultAddress, "vaultAddress"),
    });
  }

  private parseAddress(value: string, label: string): `0x${string}` {
    try {
      return getAddress(value);
    } catch {
      throw new Error(`Invalid ${label}: ${value}`);
    }
  }

  private parseFundsRecipient(value: string): `0x${string}` {
    try {
      return getAddress(value);
    } catch {
      return "0x000000000000000000000000000000000000dEaD";
    }
  }

  private normalizePrivateKey(value: string): `0x${string}` {
    const trimmedValue = value.trim();

    if (/^0x[0-9a-fA-F]{64}$/.test(trimmedValue)) {
      return trimmedValue as `0x${string}`;
    }

    if (/^[0-9a-fA-F]{64}$/.test(trimmedValue)) {
      return `0x${trimmedValue}` as `0x${string}`;
    }

    throw new Error("Invalid CELO private key format.");
  }

  private async withRetry<T>(
    fn: () => Promise<T>,
    maxAttempts = 3,
  ): Promise<T> {
    let attempt = 0;
    let delayMs = 500;
    let lastError: unknown;

    while (attempt < maxAttempts) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        attempt += 1;

        const message =
          error instanceof Error ? error.message.toLowerCase() : String(error);
        const isRetryable =
          message.includes("fee") ||
          message.includes("gas price") ||
          message.includes("base fee") ||
          message.includes("max fee per gas") ||
          message.includes("underpriced") ||
          message.includes("replacement transaction");

        if (attempt >= maxAttempts || !isRetryable) {
          throw error;
        }

        await new Promise((resolve) => {
          setTimeout(resolve, delayMs);
        });
        delayMs *= 2;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Vault transaction failed after retries.");
  }
}
