export const DASHBOARD_REALTIME_POLL_INTERVAL_MS = 15000;

export const DASHBOARD_INVITATIONS_REFRESH_INTERVAL_MS = 20000;

export const DASHBOARD_LIGHTWEIGHT_FALLBACK_POLL_INTERVAL_MS = 60000;

export const DASHBOARD_REALTIME_REFETCH_THROTTLE_MS = 1000;

export function createTrailingThrottle(
  callback: () => void,
  delayMs: number = DASHBOARD_REALTIME_REFETCH_THROTTLE_MS,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger() {
      if (timeoutId) {
        return;
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback();
      }, delayMs);
    },
    cancel() {
      if (!timeoutId) {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}
