import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { useIsFocused } from "@react-navigation/native";

import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { getDashboardStats, formatXaf, VendorDashboardStats } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";
import { SectionReveal } from "@/components/section-reveal";

export default function VendorOverviewScreen() {
  const { t } = useMobileTranslations();
  const isFocused = useIsFocused();
  const user = getUser();
  const paymentModel = user?.vendor?.paymentModel;

  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">("MONTHLY");
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getDashboardStats();
      setStats(data);
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

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    void load();
    const refreshInterval = setInterval(() => {
      void load();
    }, 20000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isFocused, load]);

  const initiatePayment = async () => {
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
      <Text className="mb-3 text-xl font-semibold text-[#1F2937]">
        {t("vendorDashboard.overview.title")}
      </Text>

      {loading ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.common.loading")}</Text>
      ) : (
        <View className="gap-3">
          <SectionReveal direction="up" delay={0} distance={15}>
            <View className="rounded-xl bg-white p-4">
            <Text className="text-xs uppercase text-[#6B7280]">
              {t("vendorDashboard.overview.status")}
            </Text>
            <Text className="mt-1 text-base font-semibold text-[#111827]">
              {stats?.accountStatus || "-"}
            </Text>
            <Text className="mt-3 text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.products")}: {stats?.totalProducts ?? 0}
            </Text>
            <Text className="text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.proposals")}: {stats?.totalProposalsReceived ?? 0}
            </Text>
            <Text className="text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.accepted")}: {stats?.totalAcceptedProposals ?? 0}
            </Text>
            <Text className="text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.rating")}: {(stats?.avgRating ?? 0).toFixed(1)} / 5
            </Text>
            </View>
          </SectionReveal>

          {(stats?.accountStatus === "PENDING_PAYMENT" ||
            stats?.accountStatus === "SUBSCRIPTION_EXPIRED") && (
            <SectionReveal direction="up" delay={80} distance={15}>
              <View className="rounded-xl border border-[#F59E0B] bg-[#FFFBEB] p-4">
              <Text className="mb-2 text-sm text-[#92400E]">{t("vendorDashboard.overview.payNow")}</Text>

              {paymentModel === "SUBSCRIPTION" && (
                <View className="mb-3 flex-row gap-2">
                  <TouchableOpacity
                    onPress={() => setBillingCycle("MONTHLY")}
                    className={`rounded-md px-3 py-2 ${billingCycle === "MONTHLY" ? "bg-[#1B5E20]" : "bg-white"}`}
                  >
                    <Text className={billingCycle === "MONTHLY" ? "text-white" : "text-[#1F2937]"}>
                      {t("vendorDashboard.subscription.monthly")}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBillingCycle("YEARLY")}
                    className={`rounded-md px-3 py-2 ${billingCycle === "YEARLY" ? "bg-[#1B5E20]" : "bg-white"}`}
                  >
                    <Text className={billingCycle === "YEARLY" ? "text-white" : "text-[#1F2937]"}>
                      {t("vendorDashboard.subscription.yearly")}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder={t("vendorDashboard.overview.phonePlaceholder")}
                className="mb-2 rounded-md border border-[#D1D5DB] bg-white px-3 py-2"
              />

              <TouchableOpacity
                onPress={() => void initiatePayment()}
                disabled={processing}
                className="rounded-md bg-[#1B5E20] px-3 py-3"
              >
                <Text className="text-center font-semibold text-white">
                  {processing ? t("vendorDashboard.common.saving") : t("vendorDashboard.overview.payNow")}
                </Text>
              </TouchableOpacity>
              </View>
            </SectionReveal>
          )}

          <SectionReveal direction="up" delay={160} distance={15}>
            <View className="rounded-xl bg-white p-4">
            <Text className="text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.subscriptionExpiry")}: {stats?.subscriptionExpiresAt || "-"}
            </Text>
            <Text className="mt-2 text-sm text-[#6B7280]">
              {t("vendorDashboard.overview.referenceAmount")}: {formatXaf(0)}
            </Text>
            </View>
          </SectionReveal>
        </View>
      )}
    </ScrollView>
  );
}
