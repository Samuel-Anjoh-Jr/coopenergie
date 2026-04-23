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
  "https://alfajores.celoscan.io";
