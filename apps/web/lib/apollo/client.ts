import { ApolloClient, HttpLink, InMemoryCache, split } from "@apollo/client";
import { setContext } from "@apollo/client/link/context";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { getMainDefinition } from "@apollo/client/utilities";
import { createClient } from "graphql-ws";

import { GRAPHQL_URL, GRAPHQL_WS_URL } from "@/lib/config";
import { getCachedClientToken } from "@/lib/auth/client-session";

async function getAuthToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return getCachedClientToken();
}

const httpLink = new HttpLink({
  uri: GRAPHQL_URL,
});

const authLink = setContext(async (_, { headers }) => {
  const token = await getAuthToken();

  return {
    headers: {
      ...headers,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  };
});

const authedHttpLink = authLink.concat(httpLink);

const wsLink =
  typeof window !== "undefined"
    ? new GraphQLWsLink(
        createClient({
          url: GRAPHQL_WS_URL,
          connectionParams: async () => {
            const token = await getAuthToken();

            return token
              ? {
                  authorization: `Bearer ${token}`,
                }
              : {};
          },
        }),
      )
    : null;

const splitLink = wsLink
  ? split(
      ({ query }) => {
        const definition = getMainDefinition(query);
        return (
          definition.kind === "OperationDefinition" &&
          definition.operation === "subscription"
        );
      },
      wsLink,
      authedHttpLink,
    )
  : authedHttpLink;

export const apolloClient = new ApolloClient({
  ssrMode: typeof window === "undefined",
  link: splitLink,
  cache: new InMemoryCache(),
});
