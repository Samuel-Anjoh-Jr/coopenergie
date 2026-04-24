import { Inject, Injectable } from "@nestjs/common";
import { getAddress } from "viem";

import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import { publicClient as configuredPublicClient } from "./celo-client";
import { CELO_PUBLIC_CLIENT } from "./blockchain.tokens";

type BlockchainPublicClient = typeof configuredPublicClient;

@Injectable()
export class VaultService {
  constructor(
    @Inject(CELO_PUBLIC_CLIENT)
    private readonly publicClient: BlockchainPublicClient,
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
}
