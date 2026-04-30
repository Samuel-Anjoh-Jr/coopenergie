export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000/api/v1";

export const GRAPHQL_URL =
  process.env.EXPO_PUBLIC_GRAPHQL_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_URL ||
  "http://localhost:4000/graphql";

export const GRAPHQL_WS_URL =
  process.env.EXPO_PUBLIC_GRAPHQL_WS_URL ||
  process.env.NEXT_PUBLIC_GRAPHQL_WS_URL ||
  "ws://localhost:4000/graphql";

export const CELOSCAN_BASE =
  process.env.EXPO_PUBLIC_CELOSCAN_BASE ||
  process.env.NEXT_PUBLIC_CELOSCAN_BASE ||
  "https://celo-sepolia.blockscout.com";

export const celoScanTx = (hash: string) => {
  const baseUrl = CELOSCAN_BASE.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/tx/${hash}`);
  url.searchParams.set("tab", "logs");
  return url.toString();
};

export const withCeloScanLogsTab = (txUrl: string) => {
  try {
    const url = new URL(txUrl);
    if (url.pathname.includes("/tx/")) {
      url.searchParams.set("tab", "logs");
      return url.toString();
    }
    return txUrl;
  } catch {
    return txUrl;
  }
};
