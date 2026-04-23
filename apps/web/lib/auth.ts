import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { API_URL } from "@/lib/config";

export const authOptions: NextAuthConfig = {
  session: {
    strategy: "jwt",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email;
        const password = credentials?.password;

        if (!email || !password) {
          return null;
        }

        const response = await fetch(`${API_URL}/api/v1/auth/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
          return null;
        }

        const data = (await response.json()) as {
          user?: {
            id?: string;
            email?: string;
            name?: string;
          };
          token?: string;
        };

        if (!data.user?.id || !data.user.email || !data.user.name || !data.token) {
          return null;
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          token: data.token,
        };
      },
    }),
  ],
  callbacks: {
    jwt: async ({ token, user }) => {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.accessToken = (user as { token?: string }).token;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.email = (token.email as string) || "";
        session.user.name = (token.name as string) || "";
        session.user.token = (token.accessToken as string) || "";
      }

      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
