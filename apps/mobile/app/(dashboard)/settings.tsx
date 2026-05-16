import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { useActiveCooperative } from "@/lib/dashboard";
import { useMobileTranslations } from "@/lib/translations";
import { cooperativeStorage } from "@/lib/storage";

type CooperativeSettingsResponse = {
  threshold: number;
  source: "cooperative" | "platform_default";
};

type PlatformSettingsResponse = {
  withdrawalThresholdDefault: number;
  withdrawalThresholdMin: number;
  withdrawalThresholdMax: number;
  appStoreUrl?: string | null;
  playStoreUrl?: string | null;
};

export default function SettingsScreen() {
  const router = useRouter();
  const { t, locale, setLocale } = useMobileTranslations();
  const { cooperatives, activeCooperativeId, activeCooperative } =
    useActiveCooperative();

  const [loadingThresholds, setLoadingThresholds] = useState(false);
  const [savingCoop, setSavingCoop] = useState(false);
  const [savingPlatform, setSavingPlatform] = useState(false);
  const [coopThreshold, setCoopThreshold] = useState("");
  const [platformDefault, setPlatformDefault] = useState("");
  const [platformMin, setPlatformMin] = useState("");
  const [platformMax, setPlatformMax] = useState("");
  const [appStoreUrl, setAppStoreUrl] = useState("");
  const [playStoreUrl, setPlayStoreUrl] = useState("");

  const user = useMemo(() => getUser(), []);
  const isCoopAdmin = activeCooperative?.membership?.role === "COOP_ADMIN";
  const isPlatformAdmin = Boolean(user?.isPlatformAdmin);

  useEffect(() => {
    async function loadSettings() {
      if (!activeCooperativeId) {
        return;
      }

      setLoadingThresholds(true);
      try {
        if (isCoopAdmin || isPlatformAdmin) {
          const coop = await api.get<CooperativeSettingsResponse>(
            `/cooperatives/${activeCooperativeId}/settings`,
          );
          setCoopThreshold(String(coop.threshold || ""));
        }

        if (isPlatformAdmin) {
          const platform =
            await api.get<PlatformSettingsResponse>("/admin/settings");
          setPlatformDefault(String(platform.withdrawalThresholdDefault ?? ""));
          setPlatformMin(String(platform.withdrawalThresholdMin ?? ""));
          setPlatformMax(String(platform.withdrawalThresholdMax ?? ""));
          setAppStoreUrl(platform.appStoreUrl ?? "");
          setPlayStoreUrl(platform.playStoreUrl ?? "");
        }
      } catch (error) {
        Alert.alert(
          t("errors.error"),
          error instanceof Error ? error.message : t("settings.loadFailed"),
        );
      } finally {
        setLoadingThresholds(false);
      }
    }

    void loadSettings();
  }, [activeCooperativeId, isCoopAdmin, isPlatformAdmin, t]);

  async function onLogout() {
    await logout();
    router.replace("/(auth)/login");
  }

  async function saveCooperativeThreshold() {
    if (!activeCooperativeId || !coopThreshold.trim()) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      setSavingCoop(true);
      await api.patch(`/cooperatives/${activeCooperativeId}/settings`, {
        threshold: Number(coopThreshold),
      });
      Alert.alert(t("common.submit"), t("settings.savedCoop"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("settings.saveFailed"),
      );
    } finally {
      setSavingCoop(false);
    }
  }

  async function savePlatformThresholds() {
    if (!platformDefault.trim() || !platformMin.trim() || !platformMax.trim()) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      setSavingPlatform(true);
      await api.patch("/admin/settings", {
        withdrawalThresholdDefault: Number(platformDefault),
        withdrawalThresholdMin: Number(platformMin),
        withdrawalThresholdMax: Number(platformMax),
        appStoreUrl: appStoreUrl.trim() || null,
        playStoreUrl: playStoreUrl.trim() || null,
      });
      Alert.alert(t("common.submit"), t("settings.savedPlatform"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("settings.saveFailed"),
      );
    } finally {
      setSavingPlatform(false);
    }
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-[#1B5E20] text-xl font-bold">
            {t("settings.title")}
          </Text>
          <Text className="text-slate-600 mt-1 mb-4">
            {t("settings.subtitle")}
          </Text>

          <Text className="text-[#1B5E20] font-semibold mb-2">
            {t("settings.activeCooperative")}
          </Text>
          <View className="gap-2 mb-4">
            {cooperatives.map((coop) => {
              const selected = coop.id === activeCooperativeId;
              return (
                <PressableScale
                  key={coop.id}
                  className={`rounded-xl border px-4 py-3 ${
                    selected
                      ? "bg-[#E7F4E7] border-[#1B5E20]"
                      : "bg-white border-[#CFE3CF]"
                  }`}
                  onPress={() => {
                    cooperativeStorage.set(coop.id);
                    router.replace("/(dashboard)/dashboard");
                  }}
                >
                  <Text
                    className={`font-semibold ${selected ? "text-[#1B5E20]" : "text-slate-700"}`}
                  >
                    {coop.name}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <Text className="text-[#1B5E20] font-semibold mb-2">
            {t("settings.language")}
          </Text>
          <View className="flex-row gap-2 mb-5">
            <PressableScale
              className={`flex-1 rounded-xl border px-4 py-3 items-center ${
                locale === "en"
                  ? "bg-[#1B5E20] border-[#1B5E20]"
                  : "bg-white border-[#CFE3CF]"
              }`}
              onPress={() => {
                void setLocale("en");
              }}
            >
              <Text
                className={`font-semibold ${locale === "en" ? "text-white" : "text-[#1B5E20]"}`}
              >
                {t("settings.english")}
              </Text>
            </PressableScale>
            <PressableScale
              className={`flex-1 rounded-xl border px-4 py-3 items-center ${
                locale === "fr"
                  ? "bg-[#1B5E20] border-[#1B5E20]"
                  : "bg-white border-[#CFE3CF]"
              }`}
              onPress={() => {
                void setLocale("fr");
              }}
            >
              <Text
                className={`font-semibold ${locale === "fr" ? "text-white" : "text-[#1B5E20]"}`}
              >
                {t("settings.french")}
              </Text>
            </PressableScale>
          </View>

          {(isCoopAdmin || isPlatformAdmin) && (
            <View className="mt-1 mb-5 rounded-xl border border-[#DDEBDD] bg-[#F8FCF8] p-3">
              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("settings.coopThreshold")}
              </Text>
              <TextInput
                value={coopThreshold}
                onChangeText={setCoopThreshold}
                keyboardType="numeric"
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3"
              />
              <PressableScale
                className={`mt-3 rounded-xl px-4 py-3 items-center ${
                  savingCoop ? "bg-slate-400" : "bg-[#1B5E20]"
                }`}
                onPress={() => {
                  void saveCooperativeThreshold();
                }}
                disabled={savingCoop || loadingThresholds}
              >
                <Text className="text-white font-semibold">
                  {t("settings.saveCoop")}
                </Text>
              </PressableScale>
            </View>
          )}

          {isPlatformAdmin && (
            <View className="mb-5 rounded-xl border border-[#DDEBDD] bg-[#F8FCF8] p-3">
              <Text className="text-[#1B5E20] font-semibold mb-2">
                {t("settings.platformThresholds")}
              </Text>

              <Text className="text-[#1B5E20] text-xs mb-1">
                {t("settings.thresholdMin")}
              </Text>
              <TextInput
                value={platformMin}
                onChangeText={setPlatformMin}
                keyboardType="numeric"
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3 mb-2"
              />

              <Text className="text-[#1B5E20] text-xs mb-1">
                {t("settings.thresholdDefault")}
              </Text>
              <TextInput
                value={platformDefault}
                onChangeText={setPlatformDefault}
                keyboardType="numeric"
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3 mb-2"
              />

              <Text className="text-[#1B5E20] text-xs mb-1">
                {t("settings.thresholdMax")}
              </Text>
              <TextInput
                value={platformMax}
                onChangeText={setPlatformMax}
                keyboardType="numeric"
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3"
              />

              <Text className="text-[#1B5E20] text-xs mt-3 mb-1">
                {t("settings.appStoreUrl")}
              </Text>
              <TextInput
                value={appStoreUrl}
                onChangeText={setAppStoreUrl}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3 mb-2"
                placeholder="https://apps.apple.com/..."
              />

              <Text className="text-[#1B5E20] text-xs mb-1">
                {t("settings.playStoreUrl")}
              </Text>
              <TextInput
                value={playStoreUrl}
                onChangeText={setPlayStoreUrl}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loadingThresholds}
                className="bg-white border border-[#CFE3CF] rounded-xl px-4 py-3"
                placeholder="https://play.google.com/store/apps/details?id=..."
              />

              <PressableScale
                className={`mt-3 rounded-xl px-4 py-3 items-center ${
                  savingPlatform ? "bg-slate-400" : "bg-[#1B5E20]"
                }`}
                onPress={() => {
                  void savePlatformThresholds();
                }}
                disabled={savingPlatform || loadingThresholds}
              >
                <Text className="text-white font-semibold">
                  {t("settings.savePlatform")}
                </Text>
              </PressableScale>
            </View>
          )}

          <PressableScale
            className="rounded-xl border border-[#B42318] px-4 py-3 items-center"
            onPress={() => {
              void onLogout();
            }}
          >
            <Text className="text-[#B42318] font-semibold">
              {t("settings.logoutAction")}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </ScreenReveal>
  );
}
