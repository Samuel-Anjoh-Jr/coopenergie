import { Link, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Image,
  Alert,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { login } from "@/lib/auth";
import { useMobileTranslations } from "@/lib/translations";
import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";

export default function LoginScreen() {
  const router = useRouter();
  const { t } = useMobileTranslations();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function onSubmit() {
    try {
      setIsSubmitting(true);
      await login(email.trim(), password);
      router.replace("/(dashboard)/dashboard");
    } catch (error) {
      Alert.alert(
        t("errors.loginFailed"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] px-6 py-10 justify-center">
      <View className="rounded-3xl bg-white border border-[#DDEBDD] p-6">
        <View className="mb-3 flex-row items-center gap-3">
          <Image
            source={require("../../assets/icon.png")}
            style={{ width: 42, height: 42 }}
            resizeMode="contain"
          />
          <Image
            source={require("../../assets/logo-full.png")}
            style={{ width: 176, height: 44 }}
            resizeMode="contain"
          />
        </View>
        <Text className="text-base text-slate-600 mb-6">
          {t("auth.loginSubtitle")}
        </Text>

        <Text className="text-[#1B5E20] font-semibold mb-2">
          {t("common.email")}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          placeholder={t("auth.emailPlaceholder")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4"
        />

        <Text className="text-[#1B5E20] font-semibold mb-2">
          {t("common.password")}
        </Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t("auth.passwordPlaceholder")}
          className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-6"
        />

        <PressableScale
          onPress={onSubmit}
          disabled={isSubmitting || !email.trim() || !password}
          className="rounded-xl bg-[#1B5E20] px-4 py-3 items-center"
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text className="text-white font-semibold">
              {t("common.login")}
            </Text>
          )}
        </PressableScale>

        <Link href="/(auth)/register" asChild>
          <PressableScale className="mt-4 rounded-xl border border-[#1B5E20] px-4 py-3 items-center">
            <Text className="text-[#1B5E20] font-medium">
              {t("auth.createAccount")}
            </Text>
          </PressableScale>
        </Link>
      </View>
    </ScreenReveal>
  );
}
