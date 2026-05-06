"use client";

import { useEffect, useRef } from "react";

import { getCachedClientToken } from "@/lib/auth/client-session";
import { API_URL } from "@/lib/config";

type RealtimeCallback = () => void;

function buildAdminEventsUrl(token: string) {
  const baseUrl = API_URL.replace(/\/+$/, "");
  const url = new URL(`${baseUrl}/api/v1/admin/events`);
  url.searchParams.set("token", token);
  return url.toString();
}

export function useAdminRealtime(onUpdate: RealtimeCallback) {
  const callbackRef = useRef(onUpdate);

  useEffect(() => {
    callbackRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let closed = false;

    const connect = async () => {
      const token = await getCachedClientToken();

      if (!token || closed) {
        return;
      }

      eventSource = new EventSource(buildAdminEventsUrl(token));

      eventSource.addEventListener("admin-update", () => {
        callbackRef.current();
      });

      eventSource.onerror = () => {
        if (eventSource?.readyState === EventSource.CLOSED) {
          eventSource.close();
        }
      };
    };

    void connect();

    return () => {
      closed = true;
      if (eventSource) {
        eventSource.close();
      }
    };
  }, []);
}
