"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { toast } from "sonner";

import {
  onForegroundMessage,
  requestNotificationPermission,
} from "@/lib/firebase/client";
import { restClient } from "@/lib/rest-client";

const SERVICE_WORKER_PATH = "/api/firebase-messaging-sw";
const SOUND_FILENAME_PATTERN = /^[a-z0-9_-]+\.wav$/i;

function getSoundFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const data = (payload as { data?: Record<string, unknown> }).data;
  const sound = data?.sound;

  if (typeof sound !== "string") {
    return null;
  }

  return SOUND_FILENAME_PATTERN.test(sound) ? sound : null;
}

function playNotificationSound(soundFile: string | null) {
  if (!soundFile || typeof window === "undefined") {
    return;
  }

  try {
    const audio = new Audio(`/sounds/${soundFile}`);
    audio.volume = 1;
    void audio.play().catch(() => {
      // Ignore autoplay restrictions and keep notification UX non-blocking.
    });
  } catch {
    // Ignore playback failures and still surface the toast.
  }
}

async function registerNotificationServiceWorker() {
  if (typeof window === "undefined") return null;
  if (!("serviceWorker" in navigator)) return null;

  return navigator.serviceWorker.register(SERVICE_WORKER_PATH, { scope: "/" });
}

export function useNotifications() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const tokenRef = useRef<string | null>(null);

  const syncToken = useCallback(async (token: string) => {
    if (!token || tokenRef.current === token) {
      setNotificationsEnabled(Boolean(token));
      return token;
    }

    await restClient.post("/users/device-token", {
      token,
      platform: "WEB",
    });

    tokenRef.current = token;
    setNotificationsEnabled(true);
    return token;
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      await registerNotificationServiceWorker();
      const token = await requestNotificationPermission();

      if (!token) {
        setNotificationsEnabled(false);
        return null;
      }

      await syncToken(token);
      return token;
    } catch (error) {
      setNotificationsEnabled(false);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to enable web notifications",
      );
      return null;
    }
  }, [syncToken]);

  useEffect(() => {
    let unsubscribe = () => {};

    void (async () => {
      try {
        await registerNotificationServiceWorker();
        const token = await requestNotificationPermission();

        if (token) {
          await syncToken(token);
        } else {
          setNotificationsEnabled(false);
        }
      } catch {
        setNotificationsEnabled(false);
      }
    })();

    unsubscribe = onForegroundMessage((payload) => {
      const title = payload?.notification?.title ?? "CoopEnergie";
      const description = payload?.notification?.body;
      playNotificationSound(getSoundFromPayload(payload));
      toast(title, { description });
    });

    return () => {
      unsubscribe();

      const token = tokenRef.current;
      tokenRef.current = null;
      setNotificationsEnabled(false);

      if (token) {
        void restClient.delete("/users/device-token", { token });
      }
    };
  }, [syncToken]);

  return { notificationsEnabled, requestPermission };
}
