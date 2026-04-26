export const cooperativeVaultAbi = [
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "member", type: "address" },
      { name: "amountXAF", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "createProposal",
    stateMutability: "nonpayable",
    inputs: [
      { name: "creator", type: "address" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "vote",
    stateMutability: "nonpayable",
    inputs: [
      { name: "voter", type: "address" },
      { name: "proposalId", type: "uint256" },
      { name: "choice", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "releaseFunds",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "amountXAF", type: "uint256" },
      { name: "proposalId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "totalContributedXAF",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMemberContribution",
    stateMutability: "view",
    inputs: [{ name: "member", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getProposal",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "id", type: "uint256" },
          { name: "title", type: "string" },
          { name: "description", type: "string" },
          { name: "yesVotes", type: "uint256" },
          { name: "noVotes", type: "uint256" },
          { name: "resolved", type: "bool" },
          { name: "approved", type: "bool" },
          { name: "createdAt", type: "uint256" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "proposalCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ContributionMade",
    anonymous: false,
    inputs: [
      { indexed: true, name: "member", type: "address" },
      { indexed: false, name: "amountXAF", type: "uint256" },
      { indexed: false, name: "totalXAF", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ProposalCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
      { indexed: false, name: "title", type: "string" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "VoteCast",
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: true, name: "voter", type: "address" },
      { indexed: false, name: "choice", type: "bool" },
      { indexed: false, name: "yesVotes", type: "uint256" },
      { indexed: false, name: "noVotes", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "FundsReleased",
    anonymous: false,
    inputs: [
      { indexed: true, name: "recipient", type: "address" },
      { indexed: false, name: "amountXAF", type: "uint256" },
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: false, name: "timestamp", type: "uint256" },
    ],
  },
] as const;

export default cooperativeVaultAbi;
