import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";

import { API_URL } from "@/lib/config";

function deriveAuthUrlFromVercelUrl() {
  const hasAuthUrl = Boolean(process.env.AUTH_URL || process.env.NEXTAUTH_URL);
  if (hasAuthUrl) {
    return;
  }

  const vercelUrl = process.env.VERCEL_URL?.trim();
  if (!vercelUrl) {
    return;
  }

  const derivedUrl =
    vercelUrl.startsWith("http://") || vercelUrl.startsWith("https://")
      ? vercelUrl
      : `https://${vercelUrl}`;

  process.env.AUTH_URL = derivedUrl;
  process.env.NEXTAUTH_URL = derivedUrl;
}

deriveAuthUrlFromVercelUrl();

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
            role?: string;
          };
          token?: string;
          isPlatformAdmin?: boolean;
        };

        if (
          !data.user?.id ||
          !data.user.email ||
          !data.user.name ||
          !data.token
        ) {
          return null;
        }

        let role = data.user.role;
        let vendor: { id?: string; status?: string } | undefined;

        try {
          const vendorLoginResponse = await fetch(`${API_URL}/api/v1/vendors/login`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
          });

          if (vendorLoginResponse.ok) {
            const vendorLoginData = (await vendorLoginResponse.json()) as {
              vendor?: {
                id?: string;
                status?: string;
              };
            };
            if (vendorLoginData.vendor?.id) {
              role = "VENDOR";
              vendor = {
                id: vendorLoginData.vendor.id,
                status: vendorLoginData.vendor.status,
              };
            }
          }
        } catch {
          // Ignore vendor login lookup failures and keep base auth data.
        }

        if (data.token && !vendor) {
          try {
            const vendorResponse = await fetch(`${API_URL}/api/v1/vendors/dashboard/me`, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${data.token}`,
              },
            });

            if (vendorResponse.ok) {
              const vendorDashboard = (await vendorResponse.json()) as {
                accountStatus?: string;
              };
              role = "VENDOR";
              vendor = {
                id: data.user.id,
                status: vendorDashboard.accountStatus,
              };
            }
          } catch {
            // Ignore vendor metadata enrichment failures so login can proceed.
          }
        }

        return {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          token: data.token,
          isPlatformAdmin: data.isPlatformAdmin ?? false,
          role: role ?? (data.isPlatformAdmin ? "PLATFORM_ADMIN" : "MEMBER"),
          vendor,
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
        token.isPlatformAdmin =
          (user as { isPlatformAdmin?: boolean }).isPlatformAdmin ?? false;
        token.role =
          (user as { role?: string }).role ??
          ((user as { isPlatformAdmin?: boolean }).isPlatformAdmin
            ? "PLATFORM_ADMIN"
            : "MEMBER");
        token.vendorId = (user as { vendor?: { id?: string } }).vendor?.id;
        token.vendorStatus = (user as { vendor?: { status?: string } }).vendor
          ?.status;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user) {
        session.user.id = (token.id as string) || "";
        session.user.email = (token.email as string) || "";
        session.user.name = (token.name as string) || "";
        session.user.token = (token.accessToken as string) || "";
        session.user.isPlatformAdmin = token.isPlatformAdmin ?? false;
        session.user.role = token.role ?? "MEMBER";
        session.user.vendor = {
          id: token.vendorId,
          status: token.vendorStatus,
        };
      }

      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authOptions);
