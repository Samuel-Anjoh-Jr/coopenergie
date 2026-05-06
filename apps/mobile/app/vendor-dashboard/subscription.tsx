import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { formatXaf, getSubscriptionHistory, VendorSubscriptionRecord } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";

export default function VendorSubscriptionScreen() {
  const { t } = useMobileTranslations();
  const user = getUser();
  const paymentModel = user?.vendor?.paymentModel;

  const [records, setRecords] = useState<VendorSubscriptionRecord[]>([]);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getSubscriptionHistory();
      setRecords(data);
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const pay = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        t("vendorDashboard.overview.phoneRequired"),
      );
      return;
    }

    setProcessing(true);
    try {
      if (paymentModel === "ONE_TIME") {
        await api.post("/vendors/payment/register", {
          phoneNumber: phoneNumber.trim(),
        });
      } else {
        await api.post("/vendors/payment/subscribe", {
          phoneNumber: phoneNumber.trim(),
          billingCycle,
        });
      }

      Alert.alert(
        t("vendorDashboard.common.success"),
        t("vendorDashboard.overview.paymentInitiated"),
      );
      setPhoneNumber("");
      await load();
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setProcessing(false);
    }
  };

  return (
    <ScrollView className="flex-1 bg-[#F5F8F5] px-4 py-4">
      <Text className="mb-3 text-xl font-semibold text-[#111827]">
        {t("vendorDashboard.subscription.title")}
      </Text>

      <View className="mb-4 rounded-xl bg-white p-4">
        {paymentModel === "SUBSCRIPTION" && (
          <View className="mb-3 flex-row gap-2">
            <TouchableOpacity
              onPress={() => setBillingCycle("MONTHLY")}
              className={`rounded-md px-3 py-2 ${billingCycle === "MONTHLY" ? "bg-[#1B5E20]" : "bg-[#E5E7EB]"}`}
            >
              <Text className={billingCycle === "MONTHLY" ? "text-white" : "text-[#111827]"}>
                {t("vendorDashboard.subscription.monthly")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setBillingCycle("YEARLY")}
              className={`rounded-md px-3 py-2 ${billingCycle === "YEARLY" ? "bg-[#1B5E20]" : "bg-[#E5E7EB]"}`}
            >
              <Text className={billingCycle === "YEARLY" ? "text-white" : "text-[#111827]"}>
                {t("vendorDashboard.subscription.yearly")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          placeholder={t("vendorDashboard.subscription.phonePlaceholder")}
          className="mb-3 rounded-md border border-[#D1D5DB] bg-white px-3 py-2"
        />

        <TouchableOpacity onPress={() => void pay()} className="rounded-md bg-[#1B5E20] px-3 py-3">
          <Text className="text-center font-semibold text-white">
            {processing ? t("vendorDashboard.common.saving") : t("vendorDashboard.overview.payNow")}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.common.loading")}</Text>
      ) : records.length === 0 ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.subscription.noRecords")}</Text>
      ) : (
        records.map((record) => (
          <View key={record.id} className="mb-3 rounded-xl bg-white p-4">
            <Text className="font-semibold text-[#111827]">
              {record.billingCycle} · {formatXaf(record.priceXAF)}
            </Text>
            <Text className="text-sm text-[#6B7280]">{record.status}</Text>
            <Text className="text-xs text-[#9CA3AF]">{t("vendorDashboard.subscription.createdAt")}: {record.createdAt}</Text>
            <Text className="text-xs text-[#9CA3AF]">{t("vendorDashboard.subscription.expiresAt")}: {record.expiresAt || "-"}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
