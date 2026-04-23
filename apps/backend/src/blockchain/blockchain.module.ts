import { Global, Module } from "@nestjs/common";

import { FACTORY_ADDRESS, RELAYER_ADDRESS } from "./blockchain.constants";
import { celoChain, publicClient, walletClient } from "./celo-client";
import { coopFactoryAbi } from "./abis/coop-factory.abi";
import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import { EventListenerService } from "./event-listener.service";
import { gasRelayerAbi } from "./abis/gas-relayer.abi";
import { FactoryService } from "./factory.service";
import { RelayerService } from "./relayer.service";
import { VaultService } from "./vault.service";

export const CELO_CHAIN = "CELO_CHAIN";
export const CELO_PUBLIC_CLIENT = "CELO_PUBLIC_CLIENT";
export const CELO_WALLET_CLIENT = "CELO_WALLET_CLIENT";
export const COOP_FACTORY_ABI = "COOP_FACTORY_ABI";
export const COOPERATIVE_VAULT_ABI = "COOPERATIVE_VAULT_ABI";
export const GAS_RELAYER_ABI = "GAS_RELAYER_ABI";
export const COOP_FACTORY_ADDRESS = "COOP_FACTORY_ADDRESS";
export const GAS_RELAYER_ADDRESS = "GAS_RELAYER_ADDRESS";

@Global()
@Module({
  providers: [
    {
      provide: CELO_CHAIN,
      useValue: celoChain,
    },
    {
      provide: CELO_PUBLIC_CLIENT,
      useValue: publicClient,
    },
    {
      provide: CELO_WALLET_CLIENT,
      useValue: walletClient,
    },
    {
      provide: COOP_FACTORY_ABI,
      useValue: coopFactoryAbi,
    },
    {
      provide: COOPERATIVE_VAULT_ABI,
      useValue: cooperativeVaultAbi,
    },
    {
      provide: GAS_RELAYER_ABI,
      useValue: gasRelayerAbi,
    },
    {
      provide: COOP_FACTORY_ADDRESS,
      useValue: FACTORY_ADDRESS,
    },
    {
      provide: GAS_RELAYER_ADDRESS,
      useValue: RELAYER_ADDRESS,
    },
    EventListenerService,
    FactoryService,
    RelayerService,
    VaultService,
  ],
  exports: [
    CELO_CHAIN,
    CELO_PUBLIC_CLIENT,
    CELO_WALLET_CLIENT,
    COOP_FACTORY_ABI,
    COOPERATIVE_VAULT_ABI,
    GAS_RELAYER_ABI,
    COOP_FACTORY_ADDRESS,
    GAS_RELAYER_ADDRESS,
    EventListenerService,
    FactoryService,
    RelayerService,
    VaultService,
  ],
})
export class BlockchainModule {}
