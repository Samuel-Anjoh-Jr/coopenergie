export const coopFactoryAbi = [
  {
    type: "function",
    name: "deployCooperative",
    stateMutability: "nonpayable",
    inputs: [
      { name: "name", type: "string" },
      { name: "targetAmountXAF", type: "uint256" },
      { name: "admin", type: "address" },
    ],
    outputs: [{ name: "vault", type: "address" }],
  },
  {
    type: "function",
    name: "getAllVaults",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "function",
    name: "getVaultCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "CooperativeDeployed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "vault", type: "address" },
      { indexed: false, name: "name", type: "string" },
      { indexed: true, name: "admin", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export default coopFactoryAbi;
