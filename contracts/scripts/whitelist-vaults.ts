import hre from "hardhat";

type ParsedArgs = {
  vaults: string[];
  relayerAddress?: string;
};

function parseArgs(argv: string[]): ParsedArgs {
  const vaults: string[] = [];
  let relayerAddress: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (current === "--relayer") {
      relayerAddress = argv[index + 1];
      index += 1;
      continue;
    }

    vaults.push(current);
  }

  const envVaults = process.env.VAULT_ADDRESSES
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return {
    vaults: vaults.length > 0 ? vaults : envVaults || [],
    relayerAddress: relayerAddress || process.env.GAS_RELAYER_ADDRESS,
  };
}

async function main() {
  const { ethers } = hre as any;
  const [deployer] = await ethers.getSigners();

  if (!deployer) {
    throw new Error(
      "No deployer account configured. Set CELO_RELAYER_PRIVATE_KEY in .env or .env.production before running this script.",
    );
  }

  const { vaults, relayerAddress } = parseArgs(process.argv.slice(2));

  if (!relayerAddress) {
    throw new Error(
      "Missing relayer address. Provide --relayer <address> or set GAS_RELAYER_ADDRESS.",
    );
  }

  if (vaults.length === 0) {
    throw new Error(
      "No vault addresses provided. Pass them as CLI args or set VAULT_ADDRESSES=0x...,0x....",
    );
  }

  const gasRelayer = await ethers.getContractAt("GasRelayer", relayerAddress, deployer);
  const owner = await gasRelayer.owner();

  console.log(`Network: ${hre.network.name}`);
  console.log(`Relayer: ${relayerAddress}`);
  console.log(`Signer:  ${deployer.address}`);
  console.log(`Owner:   ${owner}`);

  if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
    throw new Error(
      `Signer ${deployer.address} is not the GasRelayer owner ${owner}.`,
    );
  }

  for (const vaultAddress of vaults) {
    const normalizedVault = ethers.utils.getAddress(vaultAddress);
    const alreadyWhitelisted = await gasRelayer.whitelistedTargets(normalizedVault);

    if (alreadyWhitelisted) {
      console.log(`Already whitelisted: ${normalizedVault}`);
      continue;
    }

    const tx = await gasRelayer.addWhitelisted(normalizedVault);
    console.log(`Whitelisting ${normalizedVault} with tx ${tx.hash}`);
    await tx.wait();
    console.log(`Whitelisted: ${normalizedVault}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});