export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
export const GRAPHQL_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_URL || "http://localhost:4000/graphql";
export const GRAPHQL_WS_URL =
  process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || "ws://localhost:4000/graphql";
export const CELOSCAN_BASE =
  process.env.NEXT_PUBLIC_CELOSCAN_BASE || "https://alfajores.celoscan.io";
export const CELO_CHAIN = process.env.NEXT_PUBLIC_CELO_CHAIN || "alfajores";

export const celoScanTx = (hash: string) => `${CELOSCAN_BASE}/tx/${hash}`;
export const celoScanAddress = (addr: string) =>
  `${CELOSCAN_BASE}/address/${addr}`;
