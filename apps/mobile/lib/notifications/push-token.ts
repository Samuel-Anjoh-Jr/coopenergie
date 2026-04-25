import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

const SOUND_FILE_BY_CHANNEL: Record<string, string> = {
  contribution: "contribution.wav",
  governance: "governance.wav",
  approval: "approval.wav",
  transfer: "transfer.wav",
  alert: "alert.wav",
  payment: "payment.wav",
  member: "member.wav",
};

async function ensureAndroidChannels() {
  if (Device.osName !== "Android") {
    return;
  }

  await Notifications.setNotificationChannelAsync("default", {
    name: "Default",
    importance: Notifications.AndroidImportance.HIGH,
    sound: "default",
  });

  await Promise.all(
    Object.entries(SOUND_FILE_BY_CHANNEL).map(([channelId, sound]) =>
      Notifications.setNotificationChannelAsync(channelId, {
        name: channelId,
        importance: Notifications.AndroidImportance.HIGH,
        sound,
      }),
    ),
  );
}

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    console.warn("Push notifications only work on physical devices");
    return null;
  }

  await ensureAndroidChannels();

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId as
    | string
    | undefined;
  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

export function configurePushHandlers() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}
