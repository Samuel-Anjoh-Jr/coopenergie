import { API_URL } from "@/lib/config";

type RequestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};

async function getToken() {
  if (typeof window === "undefined") {
    const { auth } = await import("@/lib/auth");
    const session = await auth();
    return session?.user?.token;
  }

  const { getSession } = await import("next-auth/react");
  const session = await getSession();
  return session?.user?.token;
}

async function request<T>({ method, path, body }: RequestOptions): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const data = (await response.json().catch(() => ({}))) as {
    message?: string;
    [key: string]: unknown;
  };

  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data as T;
}

export const restClient = {
  get: <T>(path: string) => request<T>({ method: "GET", path }),
  post: <T>(path: string, body: unknown) =>
    request<T>({ method: "POST", path, body }),
  patch: <T>(path: string, body: unknown) =>
    request<T>({ method: "PATCH", path, body }),
  delete: <T>(path: string, body?: unknown) =>
    request<T>({ method: "DELETE", path, body }),
};
