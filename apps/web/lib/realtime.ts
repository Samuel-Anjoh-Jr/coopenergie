export const DASHBOARD_REALTIME_POLL_INTERVAL_MS = 5000;

export const DASHBOARD_REALTIME_REFETCH_THROTTLE_MS = 350;

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
