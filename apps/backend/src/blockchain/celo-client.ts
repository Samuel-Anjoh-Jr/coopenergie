import { createPublicClient, createWalletClient, fallback, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { celo, celoSepolia } from "viem/chains";

const defaultCeloSepoliaRpcUrl = "https://forno.celo-sepolia.celo-testnet.org";
const defaultMainnetRpcUrl = "https://forno.celo.org";

// Fallback RPC URLs used when the primary is unavailable
const celoSepoliaFallbackUrls = [
  "https://rpc.ankr.com/celo_alfajores",
  "https://celo-alfajores.drpc.org",
];
const celoMainnetFallbackUrls = [
  "https://rpc.ankr.com/celo",
  "https://celo.drpc.org",
];

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
    "celosepolia"
  ).toLowerCase();
}

function isMainnetNetwork() {
  const networkName = getNetworkName();
  return networkName === "celo" || networkName === "mainnet";
}

function getRpcUrls(): string[] {
  const primary = process.env.CELO_RPC_URL?.trim();
  const fallbacks = isMainnetNetwork()
    ? celoMainnetFallbackUrls
    : celoSepoliaFallbackUrls;

  const defaultPrimary = isMainnetNetwork()
    ? defaultMainnetRpcUrl
    : defaultCeloSepoliaRpcUrl;

  const primaryUrl = primary || defaultPrimary;

  // De-duplicate: keep primary first, then any fallbacks not equal to primary
  return [primaryUrl, ...fallbacks.filter((u) => u !== primaryUrl)];
}

const rpcUrls = getRpcUrls();
const primaryRpcUrl = rpcUrls[0];

const transport = fallback(
  rpcUrls.map((url) => http(url)),
  { rank: false },
);

const chain = isMainnetNetwork()
  ? {
      ...celo,
      rpcUrls: {
        default: { http: rpcUrls },
        public: { http: rpcUrls },
      },
    }
  : {
      ...celoSepolia,
      rpcUrls: {
        default: { http: rpcUrls },
        public: { http: rpcUrls },
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
  transport,
});

export const walletClient = relayerAccount
  ? createWalletClient({
      account: relayerAccount,
      chain,
      transport,
    })
  : undefined;

export { chain as celoChain };
export const celoRpcUrl = primaryRpcUrl;
export { transport as celoTransport };
