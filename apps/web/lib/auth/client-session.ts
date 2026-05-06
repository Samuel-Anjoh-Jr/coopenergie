"use client";

import { getSession } from "next-auth/react";

const SESSION_CACHE_TTL_MS = 15000;
const SESSION_ERROR_RETRY_MS = 3000;

let cachedToken: string | null = null;
let cacheExpiresAt = 0;
let inflight: Promise<string | null> | null = null;

export async function getCachedClientToken(): Promise<string | null> {
  if (typeof window === "undefined") {
    return null;
  }

  const now = Date.now();
  if (now < cacheExpiresAt) {
    return cachedToken;
  }

  if (inflight) {
    return inflight;
  }

  inflight = (async () => {
    try {
      const session = await getSession();
      cachedToken = session?.user?.token ?? null;
      cacheExpiresAt = Date.now() + SESSION_CACHE_TTL_MS;
      return cachedToken;
    } catch {
      // Short retry window avoids hammering /api/auth/session on transient failures.
      cachedToken = null;
      cacheExpiresAt = Date.now() + SESSION_ERROR_RETRY_MS;
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearCachedClientToken() {
  cachedToken = null;
  cacheExpiresAt = 0;
  inflight = null;
}
