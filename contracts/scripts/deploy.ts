import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import hre from "hardhat";

const currentDir = dirname(fileURLToPath(import.meta.url));

async function main() {
  const { ethers, network } = hre;
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

  const outputPath = resolve(currentDir, "..", "deployed-addresses.json");
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(
    outputPath,
    `${JSON.stringify(deploymentRecord, null, 2)}\n`,
    "utf8",
  );

  console.log(`GasRelayer address: ${gasRelayer.address}`);
  console.log(`CoopFactory address: ${coopFactory.address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
