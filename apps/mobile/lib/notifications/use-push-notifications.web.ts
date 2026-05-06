import { useMemo } from "react";

export function usePushNotifications() {
  return useMemo(
    () => ({
      pushToken: null as string | null,
      notificationsEnabled: false,
    }),
    [],
  );
}
