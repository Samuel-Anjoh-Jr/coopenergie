export const gasRelayerAbi = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "whitelistedTargets",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "req",
        type: "tuple",
        components: [
          { name: "from", type: "address" },
          { name: "to", type: "address" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
          { name: "data", type: "bytes" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [
      { name: "", type: "bool" },
      { name: "", type: "bytes" },
    ],
  },
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [{ name: "from", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "addWhitelisted",
    stateMutability: "nonpayable",
    inputs: [{ name: "target", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "removeWhitelisted",
    stateMutability: "nonpayable",
    inputs: [{ name: "target", type: "address" }],
    outputs: [],
  },
  {
    type: "error",
    name: "InvalidSigner",
    inputs: [],
  },
  {
    type: "error",
    name: "InvalidNonce",
    inputs: [],
  },
  {
    type: "error",
    name: "RequestExpired",
    inputs: [],
  },
  {
    type: "error",
    name: "TargetNotWhitelisted",
    inputs: [],
  },
  {
    type: "error",
    name: "ZeroAddressTarget",
    inputs: [],
  },
] as const;

export default gasRelayerAbi;
