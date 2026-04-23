import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { ActivityIndicator, Alert, Text, View } from "react-native";

import { api } from "@/lib/api";
import { isAuthenticated } from "@/lib/auth";
import { invitationTokenStorage } from "@/lib/storage";

export default function JoinScreen() {
  const router = useRouter();
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
      Alert.alert("Invitation invalide", "Le token d'invitation est manquant.");
      router.replace("/(auth)/login");
      return;
    }

    async function handleJoin() {
      try {
        if (isAuthenticated()) {
          await api.post("/invitations/accept", { token });
          invitationTokenStorage.clear();
          router.replace("/(dashboard)/dashboard");
          return;
        }

        invitationTokenStorage.set(token);
        router.replace("/(auth)/register");
      } catch (error) {
        Alert.alert(
          "Invitation impossible",
          error instanceof Error ? error.message : "Une erreur est survenue.",
        );
        router.replace("/(auth)/login");
      }
    }

    void handleJoin();
  }, [params.token, router]);

  return (
    <View className="flex-1 bg-[#F5F8F5] items-center justify-center px-6">
      <ActivityIndicator size="large" color="#1B5E20" />
      <Text className="mt-4 text-[#1B5E20] font-semibold text-base">
        Traitement de votre invitation...
      </Text>
    </View>
  );
}
