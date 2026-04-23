import { Inject, Injectable } from "@nestjs/common";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  Hex,
  keccak256,
} from "viem";

import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import { gasRelayerAbi } from "./abis/gas-relayer.abi";
import {
  publicClient as configuredPublicClient,
  walletClient as configuredWalletClient,
} from "./celo-client";
import {
  CELO_PUBLIC_CLIENT,
  CELO_WALLET_CLIENT,
  GAS_RELAYER_ADDRESS,
} from "./blockchain.module";

type BlockchainPublicClient = typeof configuredPublicClient;
type BlockchainWalletClient = typeof configuredWalletClient;
type ForwardRequest = {
  from: `0x${string}`;
  to: `0x${string}`;
  nonce: bigint;
  deadline: bigint;
  data: Hex;
};

type RelayResult = {
  txHash: `0x${string}`;
  blockNumber: bigint;
};

@Injectable()
export class RelayerService {
  constructor(
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
    @Inject(CELO_WALLET_CLIENT)
    private readonly walletClient: BlockchainWalletClient,
    @Inject(GAS_RELAYER_ADDRESS)
    private readonly gasRelayerAddress: string,
  ) {}

  async relayContribute(
    vaultAddress: string,
    userAddress: string,
    amountXAF: number,
  ): Promise<RelayResult> {
    const member = this.parseAddress(userAddress, "userAddress");
    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "contribute",
      args: [member, BigInt(amountXAF)],
    });

    const request = await this.buildForwardRequest(vaultAddress, member, data);
    return this.signAndSubmit(request);
  }

  async relayCreateProposal(
    vaultAddress: string,
    creatorAddress: string,
    title: string,
    description: string,
  ): Promise<RelayResult> {
    const creator = this.parseAddress(creatorAddress, "creatorAddress");
    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "createProposal",
      args: [creator, title, description],
    });

    const request = await this.buildForwardRequest(vaultAddress, creator, data);
    return this.signAndSubmit(request);
  }

  async relayVote(
    vaultAddress: string,
    voterAddress: string,
    proposalId: number,
    choice: boolean,
  ): Promise<RelayResult> {
    const voter = this.parseAddress(voterAddress, "voterAddress");
    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "vote",
      args: [voter, BigInt(proposalId), choice],
    });

    const request = await this.buildForwardRequest(vaultAddress, voter, data);
    return this.signAndSubmit(request);
  }

  async relayFundsReleased(
    vaultAddress: string,
    recipient: string,
    amountXAF: number,
    proposalId: number,
  ): Promise<RelayResult> {
    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "releaseFunds",
      args: [
        this.parseFundsRecipient(recipient),
        BigInt(amountXAF),
        BigInt(proposalId),
      ],
    });

    const walletClient = this.getWalletClient();
    const txHash = await this.withRetry(() =>
      walletClient.sendTransaction({
        account: walletClient.account,
        to: this.parseAddress(vaultAddress, "vaultAddress"),
        data,
        chain: walletClient.chain,
        kzg: undefined,
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

  private async buildForwardRequest(
    to: string,
    from: string,
    data: Hex,
  ): Promise<ForwardRequest> {
    const target = this.parseAddress(to, "vaultAddress");
    const sender = this.parseAddress(from, "userAddress");
    const gasRelayerAddress = this.getConfiguredGasRelayerAddress();

    let nonce = 0n;
    if (gasRelayerAddress) {
      nonce = (await this.publicClient.readContract({
        address: gasRelayerAddress,
        abi: gasRelayerAbi,
        functionName: "getNonce",
        args: [sender],
        authorizationList: undefined,
      })) as bigint;
    }

    return {
      from: sender,
      to: target,
      nonce,
      deadline: BigInt(Math.floor(Date.now() / 1000) + 300),
      data,
    };
  }

  private async signAndSubmit(request: ForwardRequest): Promise<RelayResult> {
    const walletClient = this.getWalletClient();

    const requestDigest = keccak256(
      encodeAbiParameters(
        [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
        [
          request.from,
          request.to,
          request.nonce,
          request.deadline,
          request.data,
        ],
      ),
    );

    await walletClient.signMessage({
      account: walletClient.account,
      message: { raw: requestDigest },
    });

    const txHash = await this.withRetry(() =>
      walletClient.sendTransaction({
        account: walletClient.account,
        to: request.to,
        data: request.data,
        chain: walletClient.chain,
        kzg: undefined,
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

        if (attempt >= maxAttempts || !this.isRetryableError(error)) {
          throw error;
        }

        await this.sleep(delayMs);
        delayMs *= 2;
      }
    }

    throw lastError instanceof Error
      ? lastError
      : new Error("Relay transaction failed after retries.");
  }

  private getWalletClient(): NonNullable<BlockchainWalletClient> {
    if (!this.walletClient?.account) {
      throw new Error(
        "Relayer wallet is not configured. Set CELO_RELAYER_PRIVATE_KEY before using RelayerService.",
      );
    }

    return this.walletClient;
  }

  private getConfiguredGasRelayerAddress(): `0x${string}` | undefined {
    try {
      return getAddress(this.gasRelayerAddress);
    } catch {
      return undefined;
    }
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

  private isRetryableError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    return (
      message.includes("fee") ||
      message.includes("gas price") ||
      message.includes("base fee") ||
      message.includes("max fee per gas") ||
      message.includes("underpriced") ||
      message.includes("replacement transaction")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
