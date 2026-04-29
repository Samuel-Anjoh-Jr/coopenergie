import { Global, Module } from "@nestjs/common";

import { CommonModule } from "../common/common.module";
import { FACTORY_ADDRESS, RELAYER_ADDRESS } from "./blockchain.constants";
import { celoChain, publicClient, walletClient } from "./celo-client";
import { coopFactoryAbi } from "./abis/coop-factory.abi";
import { cooperativeVaultAbi } from "./abis/cooperative-vault.abi";
import {
  CELO_CHAIN,
  CELO_PUBLIC_CLIENT,
  CELO_WALLET_CLIENT,
  COOP_FACTORY_ABI,
  COOPERATIVE_VAULT_ABI,
  COOP_FACTORY_ADDRESS,
  GAS_RELAYER_ABI,
  GAS_RELAYER_ADDRESS,
} from "./blockchain.tokens";
import { BlockscoutVerificationService } from "./blockscout-verification.service";
import { EventListenerService } from "./event-listener.service";
import { gasRelayerAbi } from "./abis/gas-relayer.abi";
import { FactoryService } from "./factory.service";
import { RelayerService } from "./relayer.service";
import { VaultService } from "./vault.service";
import { WalletService } from "./wallet.service";

@Global()
@Module({
  imports: [CommonModule],
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
    BlockscoutVerificationService,
    EventListenerService,
    FactoryService,
    RelayerService,
    VaultService,
    WalletService,
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
    BlockscoutVerificationService,
    EventListenerService,
    FactoryService,
    RelayerService,
    VaultService,
    WalletService,
  ],
})
export class BlockchainModule {}

export {
  CELO_CHAIN,
  CELO_PUBLIC_CLIENT,
  CELO_WALLET_CLIENT,
  COOP_FACTORY_ABI,
  COOPERATIVE_VAULT_ABI,
  COOP_FACTORY_ADDRESS,
  GAS_RELAYER_ABI,
  GAS_RELAYER_ADDRESS,
};
