import { Inject, Injectable } from "@nestjs/common";
import { getAddress } from "viem";

import { gasRelayerAbi } from "../../blockchain/abis/gas-relayer.abi";
import {
  publicClient as configuredPublicClient,
  walletClient as configuredWalletClient,
} from "../../blockchain/celo-client";
import {
  CELO_PUBLIC_CLIENT,
  CELO_WALLET_CLIENT,
  GAS_RELAYER_ADDRESS,
} from "../../blockchain/blockchain.tokens";
import { MailService } from "../../mail/mail.service";
import { PrismaService } from "../../prisma/prisma.service";
import { CampayService } from "../payments/campay.service";

type BlockchainPublicClient = typeof configuredPublicClient;
type BlockchainWalletClient = typeof configuredWalletClient;

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly campayService: CampayService,
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
    @Inject(CELO_WALLET_CLIENT)
    private readonly walletClient: BlockchainWalletClient,
    @Inject(GAS_RELAYER_ADDRESS)
    private readonly gasRelayerAddress: string,
  ) {}

  async getStartupHealth() {
    const [relayer, smtp, campay] = await Promise.all([
      this.getRelayerHealth(),
      this.mailService.getHealthStatus(),
      this.campayService.getHealthStatus(),
    ]);

    const checks = { relayer, smtp, campay };
    const failedChecks = Object.entries(checks)
      .filter(([, value]) => !value.ready)
      .map(([key]) => key);

    return {
      status: failedChecks.length === 0 ? "ok" : "degraded",
      timestamp: new Date(),
      failedChecks,
      checks,
    };
  }

  private async getRelayerHealth() {
    const normalizedRelayerAddress = this.parseAddress(this.gasRelayerAddress);
    const signerAddress = this.walletClient?.account?.address
      ? getAddress(this.walletClient.account.address)
      : null;

    if (!normalizedRelayerAddress) {
      return {
        ready: false,
        configured: false,
        relayerAddress: null,
        signerAddress,
        ownerAddress: null,
        ownerMatchesSigner: false,
        totalVaults: 0,
        whitelistedVaults: 0,
        missingVaultWhitelists: [],
        error: "GAS_RELAYER_ADDRESS is missing or invalid.",
      };
    }

    if (!signerAddress) {
      return {
        ready: false,
        configured: false,
        relayerAddress: normalizedRelayerAddress,
        signerAddress: null,
        ownerAddress: null,
        ownerMatchesSigner: false,
        totalVaults: 0,
        whitelistedVaults: 0,
        missingVaultWhitelists: [],
        error: "CELO_RELAYER_PRIVATE_KEY is missing or invalid.",
      };
    }

    try {
      const [ownerAddress, vaults] = await Promise.all([
        this.publicClient.readContract({
          address: normalizedRelayerAddress,
          abi: gasRelayerAbi,
          functionName: "owner",
          args: [],
          authorizationList: undefined,
        }) as Promise<`0x${string}`>,
        this.prisma.cooperative.findMany({
          where: {
            vaultAddress: {
              not: null,
            },
          },
          select: {
            id: true,
            slug: true,
            name: true,
            vaultAddress: true,
          },
          orderBy: {
            createdAt: "asc",
          },
        }),
      ]);

      const normalizedOwnerAddress = getAddress(ownerAddress);
      const whitelistResults = await Promise.all(
        vaults.map(async (vault) => {
          const normalizedVaultAddress = getAddress(vault.vaultAddress!);
          const whitelisted = (await this.publicClient.readContract({
            address: normalizedRelayerAddress,
            abi: gasRelayerAbi,
            functionName: "whitelistedTargets",
            args: [normalizedVaultAddress],
            authorizationList: undefined,
          })) as boolean;

          return {
            id: vault.id,
            slug: vault.slug,
            name: vault.name,
            vaultAddress: normalizedVaultAddress,
            whitelisted,
          };
        }),
      );

      const whitelistedVaults = whitelistResults.filter(
        (vault) => vault.whitelisted,
      ).length;

      return {
        ready: whitelistResults.every((vault) => vault.whitelisted),
        configured: true,
        relayerAddress: normalizedRelayerAddress,
        signerAddress,
        ownerAddress: normalizedOwnerAddress,
        ownerMatchesSigner: normalizedOwnerAddress === signerAddress,
        totalVaults: whitelistResults.length,
        whitelistedVaults,
        missingVaultWhitelists: whitelistResults.filter(
          (vault) => !vault.whitelisted,
        ),
        error: null,
      };
    } catch (error) {
      return {
        ready: false,
        configured: true,
        relayerAddress: normalizedRelayerAddress,
        signerAddress,
        ownerAddress: null,
        ownerMatchesSigner: false,
        totalVaults: 0,
        whitelistedVaults: 0,
        missingVaultWhitelists: [],
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  private parseAddress(value: string | undefined) {
    if (!value) {
      return null;
    }

    try {
      return getAddress(value);
    } catch {
      return null;
    }
  }
}