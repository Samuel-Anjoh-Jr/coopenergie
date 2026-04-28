import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createRequire } from "node:module";

const rootDir = process.cwd();
const bunExecutable = process.platform === "win32" ? "bun.cmd" : "bun";

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) {
    return;
  }

  const content = readFileSync(filePath, "utf8");

  for (const rawLine of content.split(/\r?\n/)) {
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

function readArgValue(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseArgs() {
  const cooperativeId =
    readArgValue("--cooperative-id") || process.env.COOPERATIVE_ID;
  const network = readArgValue("--network") || "celoSepolia";
  const noBind = process.argv.includes("--no-bind");

  if (!cooperativeId) {
    throw new Error(
      "Missing cooperative id. Use --cooperative-id <id> or COOPERATIVE_ID env var.",
    );
  }

  if (network !== "celoSepolia" && network !== "mainnet") {
    throw new Error(
      `Invalid network: ${network}. Allowed values: celoSepolia, mainnet.`,
    );
  }

  return {
    cooperativeId,
    network,
    noBind,
  };
}

function runCommand(command, args, label, extraEnv = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env: {
      ...process.env,
      ...extraEnv,
    },
    stdio: "pipe",
    encoding: "utf8",
    maxBuffer: 50 * 1024 * 1024,
    shell: process.platform === "win32",
  });

  if (result.stdout?.trim()) {
    console.log(result.stdout.trim());
  }

  if (result.stderr?.trim()) {
    console.error(result.stderr.trim());
  }

  if (result.error) {
    throw new Error(`${label} failed: ${result.error.message}`);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed with exit code ${result.status}.`);
  }

  return result.stdout || "";
}

function resolveDeployScriptName(network) {
  return network === "mainnet"
    ? "deploy:replacement:mainnet"
    : "deploy:replacement:celoSepolia";
}

function getAdminAddress(cooperative) {
  if (cooperative.vaultAdminAddress) {
    return cooperative.vaultAdminAddress;
  }

  const membershipWithAddress = cooperative.memberships.find(
    (membership) => membership.user?.celoAddress,
  );

  if (membershipWithAddress?.user?.celoAddress) {
    return membershipWithAddress.user.celoAddress;
  }

  throw new Error(
    "Unable to determine cooperative admin CELO address from DB. Set vaultAdminAddress first or ensure COOP_ADMIN member has celoAddress.",
  );
}

function extractNewVaultAddress(output) {
  const match = output.match(/New vault address:\s*(0x[a-fA-F0-9]{40})/);
  if (!match) {
    throw new Error(
      "Could not parse new vault address from deployment output. Check deploy logs.",
    );
  }

  return match[1];
}

async function main() {
  loadEnvFile(resolve(rootDir, ".env"));
  loadEnvFile(resolve(rootDir, ".env.production"));

  const args = parseArgs();
  const backendRequire = createRequire(
    resolve(rootDir, "apps/backend/package.json"),
  );
  const { PrismaClient, Role } = backendRequire("@prisma/client");
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
        targetAmountXAF: true,
        vaultAddress: true,
        vaultAdminAddress: true,
        memberships: {
          where: {
            role: Role.COOP_ADMIN,
          },
          select: {
            role: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                celoAddress: true,
              },
            },
          },
        },
      },
    });

    if (!cooperative) {
      throw new Error(`Cooperative not found: ${args.cooperativeId}`);
    }

    const adminAddress = getAdminAddress(cooperative);
    const deployScript = resolveDeployScriptName(args.network);

    console.log("Preparing replacement vault deployment with:");
    console.log(
      JSON.stringify(
        {
          cooperativeId: cooperative.id,
          cooperativeName: cooperative.name,
          slug: cooperative.slug,
          targetAmountXAF: cooperative.targetAmountXAF,
          currentVaultAddress: cooperative.vaultAddress,
          adminAddress,
          network: args.network,
        },
        null,
        2,
      ),
    );

    const deployOutput = runCommand(
      bunExecutable,
      [
        "run",
        "--cwd",
        "contracts",
        deployScript,
      ],
      "Replacement vault deployment",
      {
        COOPERATIVE_ID: cooperative.id,
        COOPERATIVE_NAME: cooperative.name,
        TARGET_AMOUNT_XAF: String(cooperative.targetAmountXAF),
        ADMIN_ADDRESS: adminAddress,
      },
    );

    const newVaultAddress = extractNewVaultAddress(deployOutput);

    const bindCommand = [
      bunExecutable,
      "run",
      "--cwd",
      "apps/backend",
      "migrate:vault",
      "--",
      "--cooperative-id",
      cooperative.id,
      "--vault-address",
      newVaultAddress,
      "--admin-address",
      adminAddress,
    ];

    console.log("\nGenerated bind command:");
    console.log(bindCommand.join(" "));

    if (args.noBind) {
      console.log("\nSkipping DB bind because --no-bind was provided.");
      return;
    }

    console.log("\nApplying DB bind now...");
    runCommand(
      bindCommand[0],
      bindCommand.slice(1),
      "Vault binding migration",
    );

    console.log("\nReplacement vault flow completed successfully.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
