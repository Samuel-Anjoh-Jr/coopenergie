import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { invitationTokenStorage } from "@/lib/storage";
import { useMobileTranslations } from "@/lib/translations";
import { ScreenReveal } from "@/components/screen-reveal";

export default function JoinScreen() {
  const router = useRouter();
  const { t } = useMobileTranslations();
  const params = useLocalSearchParams<{ token?: string | string[] }>();
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) {
      return;
    }

    startedRef.current = true;

    const tokenParam = params.token;
    const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;

    if (!token) {
      Alert.alert(
        t("errors.invalidInvitation"),
        t("errors.missingInvitationToken"),
      );
      router.replace("/(auth)/login");
      return;
    }

    const invitationToken = token;

    async function handleJoin() {
      try {
        if (isAuthenticated()) {
          await api.post("/invitations/accept", { token: invitationToken });
          invitationTokenStorage.clear();
          router.replace("/(dashboard)/dashboard");
          return;
        }

        invitationTokenStorage.set(invitationToken);
        router.replace("/(auth)/register");
      } catch (error) {
        Alert.alert(
          t("errors.joinFailed"),
          error instanceof Error ? error.message : t("errors.unknownError"),
        );
        router.replace("/(auth)/login");
      }
    }

    void handleJoin();
  }, [params.token, router]);

  return (
    <ScreenReveal className="bg-[#F5F8F5] items-center justify-center px-6">
      <ActivityIndicator size="large" color="#1B5E20" />
      <Text className="mt-4 text-[#1B5E20] font-semibold text-base">
        {t("auth.processingInvitation")}
      </Text>
    </ScreenReveal>
  );
}
