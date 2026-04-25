import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

import { auth } from "@/lib/auth";
import { GRAPHQL_URL } from "@/lib/config";

export async function createAuthenticatedApolloClient() {
  const session = await auth();
  const token = session?.user?.token;

  return new ApolloClient({
    ssrMode: true,
    link: new HttpLink({
      uri: GRAPHQL_URL,
      headers: token
        ? {
            authorization: `Bearer ${token}`,
          }
        : undefined,
    }),
    cache: new InMemoryCache(),
  });
}
