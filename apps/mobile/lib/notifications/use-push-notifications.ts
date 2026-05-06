import Constants from "expo-constants";
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

function readString(value: unknown) {
  return typeof value === "string" ? value : undefined;
}

function isExpoGo() {
  return (
    Constants.executionEnvironment === "storeClient" ||
    Constants.appOwnership === "expo"
  );
}

function getNotificationsModule() {
  return require("expo-notifications") as typeof import("expo-notifications");
}

export function usePushNotifications() {
  const router = useRouter();
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (Platform.OS === "web" || isExpoGo()) {
      return;
    }

    configurePushHandlers();
    const Notifications = getNotificationsModule();

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
        const proposalType = readString(data.proposalType);
        const proposalId = readString(data.proposalId);
        const withdrawalRequestId = readString(data.withdrawalRequestId);
        const amountXAF = readString(data.amountXAF);
        const destinationType = readString(data.destinationType);
        const recipientName = readString(data.recipientName);
        const reason = readString(data.reason);
        const cooperativeId = readString(data.cooperativeId);

        if (data.type === "CONTRIBUTION") {
          router.push("/(dashboard)/contributions");
        }

        if (data.type === "PROPOSAL" && proposalType === "WITHDRAWAL") {
          router.push({
            pathname: "/(dashboard)/proposals",
            params: {
              focusProposalId: proposalId,
              withdrawalRequestId,
              cooperativeId,
            },
          });
          return;
        }

        if (data.type === "PROPOSAL") {
          router.push("/(dashboard)/proposals");
        }

        if (
          data.type === "WITHDRAWAL" ||
          data.type === "WITHDRAWAL_APPROVED" ||
          data.type === "WITHDRAWAL_DISBURSED" ||
          data.type === "WITHDRAWAL_FAILED"
        ) {
          router.push({
            pathname: "/(dashboard)/report",
            params: {
              source: "push",
              proposalId,
              withdrawalRequestId,
              amountXAF,
              destinationType,
              recipientName,
              reason,
              cooperativeId,
            },
          });
          return;
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
