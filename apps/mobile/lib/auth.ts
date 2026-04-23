import { api } from "@/lib/api";
import { storage, tokenStorage } from "@/lib/storage";

type AuthUser = {
  id: string;
  email: string;
  name: string;
};

type LoginResponse = {
  user: AuthUser;
  token: string;
};

const AUTH_USER_KEY = "auth_user";

export async function login(email: string, password: string) {
  const data = await api.post<LoginResponse>("/auth/login", {
    email,
    password,
  });

  tokenStorage.set(data.token);
  storage.set(AUTH_USER_KEY, JSON.stringify(data.user));

  return data;
}

export async function logout() {
  const pushToken = storage.getString("push_token");

  if (pushToken) {
    try {
      await api.delete("/users/device-token", { token: pushToken });
    } catch {
      // Ignore backend failures during local logout.
    }

    storage.delete("push_token");
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
