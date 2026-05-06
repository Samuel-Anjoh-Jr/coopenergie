import { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import PressableScale from "@/components/pressable-scale";
import { API_URL } from "@/lib/constants";
import { useMobileTranslations } from "@/lib/translations";

type ReachabilityState = "checking" | "reachable" | "unreachable";

function resolveHealthUrl() {
  return `${API_URL.replace(/\/+$/, "")}/health`;
}

export default function BackendPreflightBanner() {
  const { t } = useMobileTranslations();
  const [state, setState] = useState<ReachabilityState>("checking");
  const [lastError, setLastError] = useState<string | null>(null);

  const healthUrl = useMemo(() => resolveHealthUrl(), []);

  const runCheck = useCallback(async () => {
    setState("checking");
    setLastError(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(healthUrl, {
        method: "GET",
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error(`Health endpoint responded with ${response.status}`);
      }
      setState("reachable");
    } catch (error) {
      setState("unreachable");
      const errorMessage =
        error instanceof Error && error.name === "AbortError"
          ? "Health check timed out"
          : error instanceof Error
            ? error.message
            : "Network error";
      setLastError(errorMessage);
    } finally {
      clearTimeout(timeout);
    }
  }, [healthUrl]);

  useEffect(() => {
    void runCheck();
  }, [runCheck]);

  if (state === "reachable") {
    return null;
  }

  return (
    <View className="mb-4 rounded-xl border border-[#F3C7C7] bg-[#FFF1F1] px-4 py-3">
      {state === "checking" ? (
        <View className="flex-row items-center gap-2">
          <ActivityIndicator size="small" color="#B42318" />
          <Text className="flex-1 text-sm text-[#7A271A]">
            {t("auth.checkingBackend")}
          </Text>
        </View>
      ) : (
        <>
          <Text className="text-sm font-semibold text-[#B42318]">
            {t("auth.backendUnreachableTitle")}
          </Text>
          <Text className="mt-1 text-xs text-[#7A271A]">
            {t("auth.backendUnreachableMessage")}
          </Text>
          {lastError ? (
            <Text className="mt-1 text-[11px] text-[#9A3412]">{lastError}</Text>
          ) : null}
          <Text className="mt-1 text-[11px] text-[#9A3412]">{healthUrl}</Text>
          <PressableScale
            className="mt-3 self-start rounded-lg border border-[#B42318] px-3 py-2"
            onPress={() => {
              void runCheck();
            }}
          >
            <Text className="text-xs font-semibold text-[#B42318]">{t("common.retry")}</Text>
          </PressableScale>
        </>
      )}
    </View>
  );
}
