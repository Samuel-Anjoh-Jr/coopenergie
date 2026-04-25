import { useEffect, useRef, useState } from "react";
import * as Network from "expo-network";

import { processQueue } from "@/lib/sync/sync-engine";

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const previousOnlineRef = useRef<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadInitialState() {
      const state = await Network.getNetworkStateAsync();

      if (!mounted) {
        return;
      }

      const online = !!state.isConnected && !!state.isInternetReachable;
      previousOnlineRef.current = online;
      setIsOnline(online);
    }

    void loadInitialState();

    const subscription = Network.addNetworkStateListener((state) => {
      const online = !!state.isConnected && !!state.isInternetReachable;
      const previous = previousOnlineRef.current;
      previousOnlineRef.current = online;
      setIsOnline(online);

      if (previous === false && online) {
        void processQueue();
      }
    });

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, []);

  return {
    isOnline,
  };
}
