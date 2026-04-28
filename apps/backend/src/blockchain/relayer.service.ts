import { Inject, Injectable, Logger } from "@nestjs/common";
import { encodeFunctionData, getAddress, Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

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
} from "./blockchain.tokens";
import { createForwardRequestDigest, ForwardRequest } from "./signature-helper";
import { WalletService } from "./wallet.service";

type BlockchainPublicClient = typeof configuredPublicClient;
type BlockchainWalletClient = typeof configuredWalletClient;

type RelayResult = {
  txHash: `0x${string}`;
  blockNumber: bigint;
};

type RelaySigningOptions = {
  signerEncryptedPrivateKey?: string | null;
  userSignature?: Hex;
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
    private readonly walletService: WalletService,
  ) {}

  async relayContribute(
    vaultAddress: string,
    userAddress: string,
    signerEncryptedPrivateKey: string,
    amountXAF: number,
  ): Promise<RelayResult> {
    const member = this.parseAddress(userAddress, "userAddress");
    const data = encodeFunctionData({
      abi: cooperativeVaultAbi,
      functionName: "contribute",
      args: [member, BigInt(amountXAF)],
    });

    const request = await this.buildForwardRequest(vaultAddress, member, data);
    return this.signAndSubmit(request, { signerEncryptedPrivateKey });
  }

  async relayCreateProposal(
    vaultAddress: string,
    creatorAddress: string,
    signerEncryptedPrivateKey: string,
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
    return this.signAndSubmit(request, { signerEncryptedPrivateKey });
  }

  async relayVote(
    vaultAddress: string,
    voterAddress: string,
    signerEncryptedPrivateKey: string,
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
    return this.signAndSubmit(request, { signerEncryptedPrivateKey });
  }

  async relayFundsReleased(
    vaultAddress: string,
    recipient: string,
    amountXAF: number,
    proposalId: number,
  ): Promise<RelayResult> {
    void vaultAddress;
    void recipient;
    void amountXAF;
    void proposalId;

    throw new Error(
      "CooperativeVault.releaseFunds is admin-only and cannot be executed through GasRelayer. Use VaultService.releaseFundsAsAdmin instead.",
    );
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
    options: RelaySigningOptions = {},
  ): Promise<RelayResult> {
    const relayerAddress = this.getConfiguredGasRelayerAddress();
    const walletClient = this.getWalletClient();

    if (!relayerAddress) {
      throw new Error(
        "GasRelayer not configured. Cannot execute meta-transactions.",
      );
    }

    await this.assertRelayerReady(relayerAddress, request.to, walletClient);

    let signature = options.userSignature;

    if (!signature && options.signerEncryptedPrivateKey) {
      signature = await this.signRequestWithUserWallet(
        request,
        options.signerEncryptedPrivateKey,
      );
    }

    if (!signature) {
      this.logger.warn(
        `Falling back to relayer signature for request from ${request.from}.`,
      );
      signature = await this.signRequestWithRelayerWallet(request);
    }

    const txHash = await this.withRetry(async () => {
      try {
        return await walletClient.writeContract({
          account: walletClient.account,
          address: relayerAddress,
          abi: gasRelayerAbi,
          functionName: "execute",
          args: [request, signature],
          chain: walletClient.chain,
        });
      } catch (error) {
        if (this.isOwnableUnauthorizedError(error)) {
          throw new Error(
            "GasRelayer execution rejected: CELO_RELAYER_PRIVATE_KEY does not match GasRelayer owner().",
          );
        }

        throw error;
      }
    });

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
    const walletClient = this.getWalletClient();
    const digest = this.createDigestForRequest(request);

    const signature = await walletClient.signMessage({
      account: walletClient.account,
      message: { raw: digest },
    });

    return signature;
  }

  private async signRequestWithUserWallet(
    request: ForwardRequest,
    encryptedPrivateKey: string,
  ): Promise<Hex> {
    const decryptedPrivateKey = this.walletService.getDecryptedPrivateKey(
      encryptedPrivateKey,
    );
    const account = privateKeyToAccount(
      this.normalizePrivateKey(decryptedPrivateKey),
    );

    if (getAddress(account.address) !== request.from) {
      throw new Error(
        "Stored CELO key does not match the authenticated user's CELO address.",
      );
    }

    const digest = this.createDigestForRequest(request);
    return account.signMessage({
      message: { raw: digest },
    });
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

    return createForwardRequestDigest(
      request,
      relayerAddress,
      this.getConfiguredChainId(),
    );
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

  private async assertRelayerReady(
    relayerAddress: `0x${string}`,
    targetAddress: `0x${string}`,
    walletClient: NonNullable<BlockchainWalletClient>,
  ) {
    const [owner, whitelisted] = await Promise.all([
      this.publicClient.readContract({
        address: relayerAddress,
        abi: gasRelayerAbi,
        functionName: "owner",
        args: [],
        authorizationList: undefined,
      }) as Promise<`0x${string}`>,
      this.publicClient.readContract({
        address: relayerAddress,
        abi: gasRelayerAbi,
        functionName: "whitelistedTargets",
        args: [targetAddress],
        authorizationList: undefined,
      }) as Promise<boolean>,
    ]);

    const callerAddress = getAddress(walletClient.account.address);
    const ownerAddress = getAddress(owner);

    if (callerAddress !== ownerAddress) {
      throw new Error(
        `GasRelayer owner mismatch. owner=${ownerAddress}, configuredRelayerSigner=${callerAddress}.`,
      );
    }

    if (!whitelisted) {
      throw new Error(
        `GasRelayer target not whitelisted: ${targetAddress}. Add it via addWhitelisted().`,
      );
    }
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

  private getConfiguredChainId(): number {
    const chainId = this.publicClient.chain?.id ?? this.walletClient?.chain?.id;

    if (!chainId) {
      throw new Error("CELO chain ID is not configured.");
    }

    return chainId;
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

  private isOwnableUnauthorizedError(error: unknown): boolean {
    const message =
      error instanceof Error ? error.message.toLowerCase() : String(error);

    return (
      message.includes("0x118cdaa7") ||
      message.includes("ownableunauthorizedaccount")
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }
}
