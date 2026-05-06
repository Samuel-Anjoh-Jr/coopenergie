import { API_URL } from "@/lib/constants";
import { tokenStorage } from "@/lib/storage";

type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";

type RequestOptions = {
  headers?: Record<string, string>;
  rawBody?: BodyInit;
  isMultipart?: boolean;
};

const DEFAULT_REQUEST_TIMEOUT_MS = 15000;

function getRequestTimeoutMs() {
  const configuredTimeout = Number.parseInt(
    process.env.EXPO_PUBLIC_API_TIMEOUT_MS || "",
    10,
  );

  if (Number.isFinite(configuredTimeout) && configuredTimeout > 0) {
    return configuredTimeout;
  }

  return DEFAULT_REQUEST_TIMEOUT_MS;
}

function toRequestUrl(path: string) {
  return `${API_URL}${path}`;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  const token = tokenStorage.get();
  const timeoutMs = getRequestTimeoutMs();
  const requestUrl = toRequestUrl(path);
  const headers: Record<string, string> = {
    ...(options?.isMultipart ? {} : { "Content-Type": "application/json" }),
    ...(options?.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers,
      signal: controller.signal,
      body:
        options?.rawBody ??
        (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch (error) {
    const isAbortError =
      error instanceof Error &&
      (error.name === "AbortError" || /aborted|timeout/i.test(error.message));

    if (isAbortError) {
      throw new Error(
        `Request timed out after ${timeoutMs}ms. Verify backend reachability at ${API_URL}.`,
      );
    }

    const isLocalhostUrl = /\/\/(localhost|127\.0\.0\.1)(?=[:/]|$)/i.test(API_URL);
    const deviceHint = isLocalhostUrl
      ? " On Expo Go device, use your LAN IP in EXPO_PUBLIC_API_URL instead of localhost."
      : "";

    const reason = error instanceof Error ? error.message : "Network error";
    throw new Error(
      `Unable to reach API (${requestUrl}): ${reason}.${deviceHint}`,
    );
  } finally {
    clearTimeout(timeoutHandle);
  }

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
  patch: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, body, options),
  postMultipart: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>("POST", path, undefined, {
      ...options,
      rawBody: formData,
      isMultipart: true,
    }),
  patchMultipart: <T>(path: string, formData: FormData, options?: RequestOptions) =>
    request<T>("PATCH", path, undefined, {
      ...options,
      rawBody: formData,
      isMultipart: true,
    }),
  delete: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("DELETE", path, body, options),
};
