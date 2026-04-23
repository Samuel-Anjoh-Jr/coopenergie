export const graphqlClientConfig = {
  httpUrl: process.env.EXPO_PUBLIC_GRAPHQL_URL ?? "",
  wsUrl: process.env.EXPO_PUBLIC_GRAPHQL_WS_URL ?? "",
};