import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  encodeAbiParameters,
  encodeFunctionData,
  getAddress,
  Hex,
  keccak256,
  publicActions,
  walletActions,
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
import { createForwardRequestDigest, ForwardRequest } from "./signature-helper";

type BlockchainPublicClient = typeof configuredPublicClient;
type BlockchainWalletClient = typeof configuredWalletClient;

type RelayResult = {
  txHash: `0x${string}`;
  blockNumber: bigint;
};

@Injectable()
export class RelayerService {
  private readonly logger = new Logger(RelayerService.name);

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
    const relayerAddress = this.getConfiguredGasRelayerAddress();
    if (!relayerAddress) {
      throw new Error(
        "GasRelayer not configured. Cannot execute funds release via meta-transaction.",
      );
    }

    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "releaseFunds",
      args: [
        this.parseFundsRecipient(recipient),
        BigInt(amountXAF),
        BigInt(proposalId),
      ],
    });

    // Use relayer wallet as the sender for funds release (backend operation)
    const walletClient = this.getWalletClient();
    const request = await this.buildForwardRequest(
      vaultAddress,
      walletClient.account.address,
      data,
    );

    return this.signAndSubmit(request);
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

  /**
   * Generate the message digest that should be signed by the user.
   * This is used for meta-transaction signature verification.
   */
  getMessageForSigning(
    vaultAddress: string,
    userAddress: string,
    functionData: Hex,
  ): Promise<{ digest: Hex; nonce: bigint; deadline: bigint }> {
    return this.buildForwardRequest(
      vaultAddress,
      userAddress,
      functionData,
    ).then((request) => ({
      digest: this.createDigestForRequest(request),
      nonce: request.nonce,
      deadline: request.deadline,
    }));
  }

  private async signAndSubmit(
    request: ForwardRequest,
    userSignature?: Hex,
  ): Promise<RelayResult> {
    const relayerAddress = this.getConfiguredGasRelayerAddress();

    if (!relayerAddress) {
      throw new Error(
        "GasRelayer not configured. Cannot execute meta-transactions.",
      );
    }

    // If no user signature provided, use relayer wallet to sign (for backward compatibility)
    let signature = userSignature;
    if (!signature) {
      signature = await this.signRequestWithRelayerWallet(request);
    }

    const txHash = await this.withRetry(() =>
      this.walletClient.writeContract({
        account: this.walletClient.account,
        address: relayerAddress,
        abi: gasRelayerAbi,
        functionName: "execute",
        args: [request, signature],
        chain: this.walletClient.chain,
      }),
    );

    const receipt = await this.publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    this.logger.log(
      `Meta-transaction executed: from=${request.from}, to=${request.to}, nonce=${request.nonce}, txHash=${txHash}`,
    );

    return {
      txHash,
      blockNumber: receipt.blockNumber,
    };
  }

  /**
   * Sign a ForwardRequest with the relayer wallet (backend signing).
   * In production, users should sign this on the frontend with their private key.
   */
  private async signRequestWithRelayerWallet(
    request: ForwardRequest,
  ): Promise<Hex> {
    const digest = this.createDigestForRequest(request);

    // Sign with relayer wallet
    const signature = await this.walletClient.signMessage({
      account: this.walletClient.account,
      message: { raw: digest },
    });

    return signature;
  }

  /**
   * Create the message digest for a ForwardRequest.
   * Matches GasRelayer._hash() computation on-chain.
   */
  private createDigestForRequest(request: ForwardRequest): Hex {
    const relayerAddress = this.getConfiguredGasRelayerAddress();
    if (!relayerAddress) {
      throw new Error("GasRelayer address not configured.");
    }

    return createForwardRequestDigest(request, relayerAddress, 42220); // 42220 is Celo mainnet
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
