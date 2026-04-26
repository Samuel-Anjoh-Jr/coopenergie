import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import hre from "hardhat";

const currentDir = __dirname;

async function main() {
  const { ethers, network } = hre as any;
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured. Set CELO_RELAYER_PRIVATE_KEY in the root .env before running this script.",
    );
  }

  const gasRelayerFactory = await ethers.getContractFactory(
    "GasRelayer",
    deployer,
  );
  const gasRelayer = await gasRelayerFactory.deploy();
  await gasRelayer.deployed();

  const coopFactoryFactory = await ethers.getContractFactory(
    "CoopFactory",
    deployer,
  );
  const coopFactory = await coopFactoryFactory.deploy(gasRelayer.address);
  await coopFactory.deployed();

  const transferOwnershipTx = await gasRelayer.transferOwnership(
    coopFactory.address,
  );
  await transferOwnershipTx.wait();

  const deploymentRecord = {
    network: network.name,
    GasRelayer: gasRelayer.address,
    CoopFactory: coopFactory.address,
    deployedAt: new Date().toISOString(),
  };

  // Write to deployments/<network>.json — committed source of truth per network.
  // Also write deployed-addresses.json as a local scratch file (gitignored).
  const deploymentsDir = resolve(currentDir, "..", "deployments");
  await mkdir(deploymentsDir, { recursive: true });
  const networkFile = resolve(deploymentsDir, `${network.name}.json`);
  const scratchFile = resolve(currentDir, "..", "deployed-addresses.json");
  const payload = `${JSON.stringify(deploymentRecord, null, 2)}\n`;
  await writeFile(networkFile, payload, "utf8");
  await writeFile(scratchFile, payload, "utf8");

  console.log(`\nDeployed to: ${network.name}`);
  console.log(`GasRelayer address:  ${gasRelayer.address}`);
  console.log(`CoopFactory address: ${coopFactory.address}`);
  console.log(`\n# Copy these into Railway / Vercel env vars:`);
  console.log(`COOP_FACTORY_ADDRESS=${coopFactory.address}`);
  console.log(`GAS_RELAYER_ADDRESS=${gasRelayer.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
