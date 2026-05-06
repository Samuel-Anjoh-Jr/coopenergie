import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      token: string;
      isPlatformAdmin: boolean;
      role: string;
      vendor?: {
        id?: string;
        status?: string;
        paymentModel?: "ONE_TIME" | "SUBSCRIPTION";
      };
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    accessToken?: string;
    isPlatformAdmin?: boolean;
    role?: string;
    vendorId?: string;
    vendorStatus?: string;
  }
}
