import { Stack } from "expo-router";
import { Pressable, Text } from "react-native";

import { useMobileTranslations } from "@/lib/translations";

export default function AuthLayout() {
  const { t, locale, setLocale } = useMobileTranslations();

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#1B5E20" },
        headerTintColor: "#F4FBF4",
        headerRight: () => (
          <Pressable
            onPress={() => {
              void setLocale(locale === "en" ? "fr" : "en");
            }}
            className="mr-4 rounded-full border border-[#D9E8D9] px-3 py-1"
          >
            <Text className="text-xs font-semibold text-[#F4FBF4]">
              {locale.toUpperCase()}
            </Text>
          </Pressable>
        ),
        contentStyle: { backgroundColor: "#F5F8F5" },
        animation: "fade_from_bottom",
        gestureEnabled: true,
      }}
    >
      <Stack.Screen name="login" options={{ title: t("auth.loginTitle") }} />
      <Stack.Screen
        name="register"
        options={{ title: t("auth.registerTitle") }}
      />
      <Stack.Screen
        name="vendor-register"
        options={{ title: t("auth.vendorRegisterTitle") }}
      />
      <Stack.Screen
        name="join"
        options={{ title: t("auth.invitationTitle") }}
      />
      <Stack.Screen name="terms" options={{ title: t("auth.termsTitle") }} />
      <Stack.Screen
        name="privacy"
        options={{ title: t("auth.privacyTitle") }}
      />
    </Stack>
  );
}
