import { api } from "@/lib/api";
import { storage, tokenStorage } from "@/lib/storage";

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  isPlatformAdmin: boolean;
  vendor?: {
    id?: string;
    status?: string;
    paymentModel?: "ONE_TIME" | "SUBSCRIPTION";
  };
};

type LoginResponse = {
  user: AuthUser;
  token: string;
  isPlatformAdmin?: boolean;
};

const AUTH_USER_KEY = "auth_user";

export async function login(email: string, password: string) {
  const data = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  let vendorInfo:
    | {
        id?: string;
        status?: string;
        paymentModel?: "ONE_TIME" | "SUBSCRIPTION";
      }
    | undefined;

  try {
    const vendorLogin = await api.post<{
      vendor?: {
        id: string;
        status: string;
        paymentModel: "ONE_TIME" | "SUBSCRIPTION";
      };
    }>("/vendors/login", {
      email,
      password,
    });

    vendorInfo = {
      id: vendorLogin.vendor?.id,
      status: vendorLogin.vendor?.status,
      paymentModel: vendorLogin.vendor?.paymentModel,
    };
  } catch {
    // Ignore vendor metadata lookup errors for non-vendor users.
  }

  const normalizedUser: AuthUser = {
    ...data.user,
    role: vendorInfo?.id
      ? "VENDOR"
      : data.isPlatformAdmin
        ? "PLATFORM_ADMIN"
        : "MEMBER",
    isPlatformAdmin: Boolean(data.isPlatformAdmin),
    vendor: vendorInfo,
  };

  tokenStorage.set(data.token);
  storage.set(AUTH_USER_KEY, JSON.stringify(normalizedUser));

  return {
    ...data,
    user: normalizedUser,
  };
}

export async function logout() {
  const pushToken = storage.getString("push_token");

  if (pushToken) {
    try {
      await api.delete("/users/device-token", { token: pushToken });
    } catch {
      // Ignore backend failures during local logout.
    }

    storage.remove("push_token");
  }

  storage.clearAll();
}

export function getUser(): AuthUser | null {
  const raw = storage.getString(AUTH_USER_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function isAuthenticated() {
  return !!tokenStorage.get();
}

export function getPostLoginPath(user: AuthUser | null) {
  if (!user) {
    return "/(auth)/login";
  }

  if (user.role === "VENDOR") {
    return "/vendor-dashboard/overview";
  }

  if (user.isPlatformAdmin || user.role === "PLATFORM_ADMIN") {
    return "/admin-dashboard";
  }

  return "/(dashboard)/dashboard";
}
