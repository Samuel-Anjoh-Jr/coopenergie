import { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, TextInput, View } from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { detectCameroonMobileMoney } from "@/lib/phone-utils";
import { useMobileTranslations } from "@/lib/translations";

type WithdrawalMethod = "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER";

type MeResponse = {
  name?: string;
  email?: string;
  withdrawalOperator?: WithdrawalMethod | null;
  withdrawalPhone?: string | null;
  withdrawalBankName?: string | null;
  withdrawalBankAccount?: string | null;
};

const METHODS: WithdrawalMethod[] = [
  "MTN_MOMO",
  "ORANGE_MONEY",
  "BANK_TRANSFER",
];

export default function ProfileScreen() {
  const { t } = useMobileTranslations();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [withdrawalMethod, setWithdrawalMethod] =
    useState<WithdrawalMethod>("MTN_MOMO");
  const [withdrawalPhone, setWithdrawalPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccount, setBankAccount] = useState("");

  useEffect(() => {
    async function loadProfile() {
      try {
        const me = await api.get<MeResponse>("/users/me");
        setName(me.name || "");
        setEmail(me.email || "");
        setWithdrawalMethod(me.withdrawalOperator || "MTN_MOMO");
        setWithdrawalPhone(me.withdrawalPhone || "");
        setBankName(me.withdrawalBankName || "");
        setBankAccount(me.withdrawalBankAccount || "");
      } catch (error) {
        Alert.alert(
          t("errors.error"),
          error instanceof Error ? error.message : t("profile.loadFailed"),
        );
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [t]);

  const detected = useMemo(
    () => detectCameroonMobileMoney(withdrawalPhone),
    [withdrawalPhone],
  );

  async function onSave() {
    if (!name.trim()) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    if (withdrawalMethod !== "BANK_TRANSFER" && !detected) {
      Alert.alert(t("errors.error"), t("errors.withdrawalRecipientRequired"));
      return;
    }

    if (
      withdrawalMethod === "BANK_TRANSFER" &&
      (!bankName.trim() || !bankAccount.trim())
    ) {
      Alert.alert(t("errors.error"), t("errors.withdrawalRecipientRequired"));
      return;
    }

    try {
      setSaving(true);
      await api.patch("/users/me", {
        name: name.trim(),
        preferredWithdrawalMethod: withdrawalMethod,
        withdrawalPhone:
          withdrawalMethod === "BANK_TRANSFER"
            ? undefined
            : detected?.normalizedPhone,
        withdrawalBankName:
          withdrawalMethod === "BANK_TRANSFER" ? bankName.trim() : undefined,
        withdrawalBankAccount:
          withdrawalMethod === "BANK_TRANSFER" ? bankAccount.trim() : undefined,
      });

      Alert.alert(t("common.submit"), t("profile.saved"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("profile.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View className="rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-[#1B5E20] text-xl font-bold">
            {t("profile.title")}
          </Text>
          <Text className="text-slate-600 mt-1 mb-4">
            {t("profile.subtitle")}
          </Text>

          <Text className="text-[#1B5E20] font-semibold mb-1">
            {t("profile.nameLabel")}
          </Text>
          <TextInput
            value={name}
            onChangeText={setName}
            editable={!loading}
            className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
          />

          <Text className="text-[#1B5E20] font-semibold mb-1">
            {t("profile.emailLabel")}
          </Text>
          <TextInput
            value={email}
            editable={false}
            className="bg-[#EDF4ED] border border-[#DAE9DA] rounded-xl px-4 py-3 mb-3 text-slate-500"
          />

          <Text className="text-[#1B5E20] font-semibold mb-2">
            {t("profile.withdrawalMethod")}
          </Text>
          <View className="flex-row flex-wrap gap-2 mb-3">
            {METHODS.map((method) => {
              const selected = withdrawalMethod === method;
              const label =
                method === "MTN_MOMO"
                  ? t("profile.methodMtn")
                  : method === "ORANGE_MONEY"
                    ? t("profile.methodOrange")
                    : t("profile.methodBank");

              return (
                <PressableScale
                  key={method}
                  className={`rounded-full px-4 py-2 border ${
                    selected
                      ? "bg-[#1B5E20] border-[#1B5E20]"
                      : "bg-white border-[#CFE3CF]"
                  }`}
                  onPress={() => setWithdrawalMethod(method)}
                >
                  <Text
                    className={`text-xs font-semibold ${selected ? "text-white" : "text-[#1B5E20]"}`}
                  >
                    {label}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          {withdrawalMethod === "BANK_TRANSFER" ? (
            <>
              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("profile.bankName")}
              </Text>
              <TextInput
                value={bankName}
                onChangeText={setBankName}
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
              />

              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("profile.bankAccount")}
              </Text>
              <TextInput
                value={bankAccount}
                onChangeText={setBankAccount}
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
              />
            </>
          ) : (
            <>
              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("profile.withdrawalPhone")}
              </Text>
              <TextInput
                value={withdrawalPhone}
                onChangeText={setWithdrawalPhone}
                keyboardType="phone-pad"
                placeholder="6XXXXXXXX"
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
              />
            </>
          )}

          <PressableScale
            className={`rounded-xl px-4 py-3 items-center ${saving ? "bg-slate-400" : "bg-[#1B5E20]"}`}
            onPress={() => {
              void onSave();
            }}
            disabled={saving || loading}
          >
            <Text className="text-white font-semibold">
              {t("profile.save")}
            </Text>
          </PressableScale>
        </View>
      </ScrollView>
    </ScreenReveal>
  );
}
