// hardhat.config.cjs
const { existsSync, readFileSync } = require("node:fs");
const { dirname, resolve } = require("node:path");

require("@nomicfoundation/hardhat-toolbox");
require("hardhat-celo");

// Since we are in a .cjs file, we don't have import.meta.url
// We use the standard __dirname instead.
const currentDir = __dirname;

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return;
  const contents = readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile(resolve(currentDir, "..", ".env"));

const CELO_SEPOLIA_RPC_URL = "https://forno.celo-sepolia.celo-testnet.org";
const deprecatedTestnetRpcUrls = new Set([
  "https://alfajores-forno.celo-testnet.org",
  "https://forno.celo.org/alfajores",
  "https://alfajores.drpc.org",
  "https://celo-alfajores.drpc.org",
  "https://rpc.ankr.com/celo_alfajores",
  "https://celo-alfajores-rpc.publicnode.com",
  "https://celo-alfajores.gateway.tenderly.co",
  "https://celo-alfajores.blockscout.com",
  "https://1rpc.io/celo/alfajores",
  "https://celo-alfajores.allthatnode.com",
  "https://celo-alfajores-rpc.allthatnode.com",
  "https://celo-alfajores.quiknode.pro",
  "https://celo-alfajores.g.alchemy.com/v2/demo",
]);

function getCeloTestnetRpcUrl() {
  const configuredUrl = process.env.CELO_RPC_URL?.trim();

  if (!configuredUrl) {
    return CELO_SEPOLIA_RPC_URL;
  }

  if (deprecatedTestnetRpcUrls.has(configuredUrl)) {
    console.warn(
      `[hardhat] CELO_RPC_URL ${configuredUrl} is no longer a working Celo testnet endpoint. Using ${CELO_SEPOLIA_RPC_URL} instead.`,
    );
    return CELO_SEPOLIA_RPC_URL;
  }

  return configuredUrl;
}

function getConfiguredAccounts() {
  const privateKey = process.env.CELO_RELAYER_PRIVATE_KEY?.trim();
  if (!privateKey || privateKey.startsWith("REPLACE_WITH_")) return [];
  return [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`];
}

const celoAccounts = getConfiguredAccounts();
const celoTestnetRpcUrl = getCeloTestnetRpcUrl();
const celoSepoliaNetwork = {
  url: celoTestnetRpcUrl,
  chainId: 11142220,
  accounts: celoAccounts,
  timeout: 60000,
  throwOnTransactionFailures: true,
  throwOnCallFailures: true,
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.26",
    settings: {
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      chainId: 31337,
    },
    celoSepolia: celoSepoliaNetwork,
    celo: {
      url: "https://forno.celo.org",
      chainId: 42220,
      accounts: celoAccounts,
    },
  },
  paths: {
    sources: "./src",
    tests: "./test",
    artifacts: "./artifacts",
  },
};
