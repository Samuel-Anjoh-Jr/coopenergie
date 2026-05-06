import { API_URL } from "@/lib/config";
import { getCachedClientToken } from "@/lib/auth/client-session";

type RequestOptions = {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  body?: unknown;
};

const REST_REQUEST_TIMEOUT_MS = 25000;

async function getToken() {
  if (typeof window === "undefined") {
    const { auth } = await import("./auth");
    const session = await auth();
    return session?.user?.token;
  }

  return getCachedClientToken();
}

async function request<T>({ method, path, body }: RequestOptions): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, REST_REQUEST_TIMEOUT_MS);

  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/v1${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("Request timeout. Please try again.");
    }

    throw error;
  }

  clearTimeout(timeoutId);

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
