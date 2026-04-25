import "@nomicfoundation/hardhat-toolbox";
import "hardhat-celo";

import type { HardhatUserConfig } from "hardhat/config";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath: string) {
  if (!existsSync(filePath)) {
    return;
  }

  const contents = readFileSync(filePath, "utf8");

  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(resolve(currentDir, "..", ".env"));

function getConfiguredAccounts() {
  const privateKey = process.env.CELO_RELAYER_PRIVATE_KEY?.trim();

  if (!privateKey || privateKey.startsWith("REPLACE_WITH_")) {
    return [];
  }

  return [privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`];
}

const celoAccounts = getConfiguredAccounts();

const config: HardhatUserConfig = {
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
    alfajores: {
      url: "https://alfajores-forno.celo-testnet.org",
      chainId: 44787,
      accounts: celoAccounts,
    },
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

export default config;
