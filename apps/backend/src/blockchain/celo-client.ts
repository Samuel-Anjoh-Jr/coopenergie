import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoAlfajores } from "viem/chains";

const defaultAlfajoresRpcUrl = "https://alfajores-forno.celo-testnet.org";
const defaultMainnetRpcUrl = "https://forno.celo.org";

function normalizePrivateKey(value?: string): `0x${string}` | undefined {
  const trimmedValue = value?.trim();

  if (!trimmedValue || trimmedValue.startsWith("REPLACE_WITH_")) {
    return undefined;
  }

  return trimmedValue.startsWith("0x")
    ? (trimmedValue as `0x${string}`)
    : (`0x${trimmedValue}` as `0x${string}`);
}

function getNetworkName() {
  return (
    process.env.CELO_CHAIN ||
    process.env.NEXT_PUBLIC_CELO_CHAIN ||
    process.env.CELO_NETWORK ||
    "alfajores"
  ).toLowerCase();
}

function isMainnetNetwork() {
  const networkName = getNetworkName();
  return networkName === "celo" || networkName === "mainnet";
}

function getRpcUrl() {
  if (process.env.CELO_RPC_URL?.trim()) {
    return process.env.CELO_RPC_URL.trim();
  }

  return isMainnetNetwork() ? defaultMainnetRpcUrl : defaultAlfajoresRpcUrl;
}

const rpcUrl = getRpcUrl();
const chain = isMainnetNetwork()
  ? {
      ...celo,
      rpcUrls: {
        default: { http: [rpcUrl] },
        public: { http: [rpcUrl] },
      },
    }
  : {
      ...celoAlfajores,
      rpcUrls: {
        default: { http: [rpcUrl] },
        public: { http: [rpcUrl] },
      },
    };

const relayerPrivateKey = normalizePrivateKey(
  process.env.CELO_RELAYER_PRIVATE_KEY,
);

export const relayerAccount = relayerPrivateKey
  ? privateKeyToAccount(relayerPrivateKey)
  : undefined;

export const publicClient = createPublicClient({
  chain,
  transport: http(rpcUrl),
});

export const walletClient = relayerAccount
  ? createWalletClient({
      account: relayerAccount,
      chain,
      transport: http(rpcUrl),
    })
  : undefined;

export { chain as celoChain };
