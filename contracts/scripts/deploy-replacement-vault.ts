import hre from "hardhat";

type Args = {
  cooperativeId?: string;
  cooperativeName: string;
  targetAmountXAF: number;
  adminAddress: string;
  factoryAddress?: string;
};

function readArgValue(flag: string): string | undefined {
  const index = process.argv.indexOf(flag);

  if (index === -1) {
    return undefined;
  }

  return process.argv[index + 1];
}

function parseArgs(): Args {
  const cooperativeName =
    readArgValue("--name") || process.env.COOPERATIVE_NAME;
  const targetAmountRaw =
    readArgValue("--target-xaf") || process.env.TARGET_AMOUNT_XAF;
  const adminAddress = readArgValue("--admin") || process.env.ADMIN_ADDRESS;
  const cooperativeId =
    readArgValue("--cooperative-id") || process.env.COOPERATIVE_ID;
  const factoryAddress =
    readArgValue("--factory") || process.env.COOP_FACTORY_ADDRESS;

  if (!cooperativeName) {
    throw new Error(
      "Missing cooperative name. Use --name <value> or COOPERATIVE_NAME env var.",
    );
  }

  if (!targetAmountRaw) {
    throw new Error(
      "Missing target amount. Use --target-xaf <integer> or TARGET_AMOUNT_XAF env var.",
    );
  }

  const targetAmountXAF = Number(targetAmountRaw);
  if (!Number.isInteger(targetAmountXAF) || targetAmountXAF <= 0) {
    throw new Error(`Invalid target amount: ${targetAmountRaw}`);
  }

  if (!adminAddress) {
    throw new Error(
      "Missing admin address. Use --admin <0x...> or ADMIN_ADDRESS env var.",
    );
  }

  return {
    cooperativeId,
    cooperativeName,
    targetAmountXAF,
    adminAddress,
    factoryAddress,
  };
}

async function main() {
  const { ethers, network } = hre as any;
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured. Set CELO_RELAYER_PRIVATE_KEY in .env/.env.production.",
    );
  }

  const args = parseArgs();
  if (!args.factoryAddress) {
    throw new Error(
      "Missing factory address. Use --factory <0x...> or set COOP_FACTORY_ADDRESS.",
    );
  }

  const normalizedFactoryAddress = ethers.utils.getAddress(args.factoryAddress);
  const normalizedAdminAddress = ethers.utils.getAddress(args.adminAddress);
  const factory = await ethers.getContractAt(
    "CoopFactory",
    normalizedFactoryAddress,
    deployer,
  );

  console.log(`Network: ${network.name}`);
  console.log(`Factory: ${normalizedFactoryAddress}`);
  console.log(`Signer:  ${deployer.address}`);
  console.log(`Name:    ${args.cooperativeName}`);
  console.log(`Target:  ${args.targetAmountXAF} XAF`);
  console.log(`Admin:   ${normalizedAdminAddress}`);

  const tx = await factory.deployCooperative(
    args.cooperativeName,
    args.targetAmountXAF,
    normalizedAdminAddress,
  );

  console.log(`Deploy tx: ${tx.hash}`);
  const receipt = await tx.wait();

  const deployedEvent = receipt.events?.find(
    (event: any) => event.event === "CooperativeDeployed",
  );

  if (!deployedEvent?.args?.vault) {
    throw new Error(
      `CooperativeDeployed event not found for tx ${tx.hash}. Cannot determine new vault address.`,
    );
  }

  const newVaultAddress = ethers.utils.getAddress(deployedEvent.args.vault);
  console.log(`New vault address: ${newVaultAddress}`);

  if (args.cooperativeId) {
    console.log("\nRun this to bind the cooperative in backend DB:");
    console.log(
      `bun run --cwd apps/backend migrate:vault -- --cooperative-id ${args.cooperativeId} --vault-address ${newVaultAddress} --admin-address ${normalizedAdminAddress}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
