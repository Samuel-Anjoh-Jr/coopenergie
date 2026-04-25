import { API_URL } from "@/lib/constants";
import { tokenStorage } from "@/lib/storage";

type HttpMethod = "GET" | "POST" | "DELETE";

type RequestOptions = {
  headers?: Record<string, string>;
};

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers || {}),
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

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, undefined, options),
  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>("POST", path, body, options),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("DELETE", path, body, options),
};
