import * as Notifications from "expo-notifications";
import { useRouter } from "expo-router";
import { Platform } from "react-native";
import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import {
  configurePushHandlers,
  registerForPushNotifications,
} from "@/lib/notifications/push-token";
import { storage } from "@/lib/storage";

type NotificationData = {
  type?: string;
  [key: string]: unknown;
};

export function usePushNotifications() {
  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    configurePushHandlers();

    let mounted = true;

    async function setup() {
      const token = await registerForPushNotifications();

      if (!mounted) {
        return;
      }

      if (!token) {
        setNotificationsEnabled(false);
        return;
      }

      setPushToken(token);
      setNotificationsEnabled(true);
      storage.set("push_token", token);

      try {
        await api.post("/users/device-token", {
          token,
          platform: Platform.OS === "ios" ? "IOS" : "ANDROID",
        });
      } catch {
        // Ignore backend registration failure and keep local token.
      }
    }

    void setup();

    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content
          .data as NotificationData;

        if (data.type === "CONTRIBUTION") {
          router.push("/(dashboard)/contributions");
        }

        if (data.type === "PROPOSAL") {
          router.push("/(dashboard)/proposals");
        }

        if (data.type === "WITHDRAWAL") {
          router.push("/(dashboard)/proposals");
        }
      },
    );

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [router]);

  return {
    pushToken,
    notificationsEnabled,
  };
}
