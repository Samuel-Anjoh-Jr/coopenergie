import gasRelayerArtifact from "../../contracts/artifacts/src/GasRelayer.sol/GasRelayer.json";
import { createPublicClient, http } from "viem";
import { alfajores } from "viem/chains";

const client = createPublicClient({ chain: alfajores, transport: http() });
console.log(Array.isArray(gasRelayerArtifact.abi), typeof client.readContract);
