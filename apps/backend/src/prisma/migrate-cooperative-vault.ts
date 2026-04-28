import { PrismaClient } from "@prisma/client";
import { getAddress } from "viem";

type Args = {
  cooperativeId: string;
  vaultAddress: `0x${string}`;
  adminAddress?: `0x${string}`;
  dryRun: boolean;
};

function readArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseAddress(value: string, label: string): `0x${string}` {
  try {
    return getAddress(value);
  } catch {
    throw new Error(`Invalid ${label}: ${value}`);
  }
}

function parseArgs(): Args {
  const cooperativeId =
    readArgValue("--cooperative-id") || process.env.COOPERATIVE_ID;
  const vaultAddressRaw =
    readArgValue("--vault-address") || process.env.NEW_VAULT_ADDRESS;
  const adminAddressRaw =
    readArgValue("--admin-address") || process.env.VAULT_ADMIN_ADDRESS;
  const dryRun = process.argv.includes("--dry-run");

  if (!cooperativeId) {
    throw new Error(
      "Missing cooperative id. Use --cooperative-id <id> or COOPERATIVE_ID env var.",
    );
  }

  if (!vaultAddressRaw) {
    throw new Error(
      "Missing new vault address. Use --vault-address <address> or NEW_VAULT_ADDRESS env var.",
    );
  }

  return {
    cooperativeId,
    vaultAddress: parseAddress(vaultAddressRaw, "vault address"),
    adminAddress: adminAddressRaw
      ? parseAddress(adminAddressRaw, "admin address")
      : undefined,
    dryRun,
  };
}

function buildCeloScanUrl(txHashOrAddress: string) {
  const baseUrl =
    process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() ||
    "https://celo-sepolia.blockscout.com";
  return `${baseUrl.replace(/\/+$/, "")}/address/${txHashOrAddress}`;
}

async function main() {
  const args = parseArgs();
  const prisma = new PrismaClient();

  try {
    const cooperative = await prisma.cooperative.findUnique({
      where: {
        id: args.cooperativeId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        vaultAddress: true,
        vaultAdminAddress: true,
      },
    });

    if (!cooperative) {
      throw new Error(`Cooperative not found: ${args.cooperativeId}`);
    }

    console.log("Cooperative:", cooperative);
    console.log("New vault address:", args.vaultAddress);
    if (args.adminAddress) {
      console.log("New vault admin address:", args.adminAddress);
    }

    if (args.dryRun) {
      console.log("Dry run only. No database update applied.");
      return;
    }

    const updated = await prisma.cooperative.update({
      where: {
        id: args.cooperativeId,
      },
      data: {
        vaultAddress: args.vaultAddress,
        celoScanUrl: buildCeloScanUrl(args.vaultAddress),
        vaultAdminAddress: args.adminAddress ?? cooperative.vaultAdminAddress,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        vaultAddress: true,
        vaultAdminAddress: true,
        celoScanUrl: true,
      },
    });

    console.log("Vault binding updated successfully:");
    console.log(updated);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Unknown migration error",
  );
  process.exitCode = 1;
});
