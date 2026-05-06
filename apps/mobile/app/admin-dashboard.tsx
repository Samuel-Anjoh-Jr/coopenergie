import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { useIsFocused } from "@react-navigation/native";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import PressableScale from "@/components/pressable-scale";
import { api } from "@/lib/api";
import { getUser, logout } from "@/lib/auth";
import { useMobileTranslations } from "@/lib/translations";

type MonetisationSettings = {
  withdrawalFeePercent: number;
  vendorPaymentModel: "ONE_TIME" | "SUBSCRIPTION";
  vendorOneTimeFeeXAF: number;
  vendorMonthlyFeeXAF: number;
  vendorYearlyFeeXAF: number;
};

type PaymentsInsights = {
  overview: {
    withdrawalFeesDisbursedXAF: number;
    vendorPaymentsCollectedXAF: number;
    totalRevenueXAF: number;
    activeVendorSubscriptions: number;
  };
  withdrawalFees: Array<{
    id: string;
    platformFeeXAF: number;
    status: string;
    createdAt: string;
    cooperative: {
      name: string;
    };
  }>;
  vendorPayments: Array<{
    id: string;
    priceXAF: number;
    billingCycle: string;
    status: string;
    createdAt: string;
    vendor: {
      businessName: string;
    };
  }>;
};

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-CM", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const { t } = useMobileTranslations();
  const isFocused = useIsFocused();
  const user = useMemo(() => getUser(), []);
  const isPlatformAdmin = Boolean(
    user && (user.isPlatformAdmin || user.role === "PLATFORM_ADMIN"),
  );

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState<PaymentsInsights | null>(null);
  const [settings, setSettings] = useState<MonetisationSettings | null>(null);

  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState("0");
  const [vendorPaymentModel, setVendorPaymentModel] = useState<
    "ONE_TIME" | "SUBSCRIPTION"
  >("ONE_TIME");
  const [vendorOneTimeFeeXAF, setVendorOneTimeFeeXAF] = useState("0");
  const [vendorMonthlyFeeXAF, setVendorMonthlyFeeXAF] = useState("0");
  const [vendorYearlyFeeXAF, setVendorYearlyFeeXAF] = useState("0");

  const PAGE_SIZE = 8;
  const [withdrawalPage, setWithdrawalPage] = useState(1);
  const [vendorPage, setVendorPage] = useState(1);

  const translateStatus = useCallback(
    (status: string) => {
      const normalized = status.toLowerCase();

      if (normalized === "disbursed") {
        return t("adminPayments.status.disbursed");
      }

      if (normalized === "pending") {
        return t("adminPayments.status.pending");
      }

      if (normalized === "failed") {
        return t("adminPayments.status.failed");
      }

      if (normalized === "active") {
        return t("adminPayments.status.active");
      }

      if (normalized === "cancelled") {
        return t("adminPayments.status.cancelled");
      }

      if (normalized === "expired") {
        return t("adminPayments.status.expired");
      }

      return status;
    },
    [t],
  );

  const translateCycle = useCallback(
    (cycle: string) => {
      const normalized = cycle.toLowerCase();

      if (normalized === "monthly") {
        return t("adminPayments.cycle.monthly");
      }

      if (normalized === "yearly") {
        return t("adminPayments.cycle.yearly");
      }

      return cycle;
    },
    [t],
  );

  const loadData = useCallback(async (reason: "initial" | "manual" | "save" | "auto") => {
    if (reason === "initial") {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    try {
      const [insightsData, monetisationData] = await Promise.all([
        api.get<PaymentsInsights>("/admin/payments-insights"),
        api.get<MonetisationSettings>("/admin/monetisation"),
      ]);
      setInsights(insightsData);
      setSettings(monetisationData);
      setWithdrawalFeePercent(String(monetisationData.withdrawalFeePercent ?? 0));
      setVendorPaymentModel(monetisationData.vendorPaymentModel ?? "ONE_TIME");
      setVendorOneTimeFeeXAF(String(monetisationData.vendorOneTimeFeeXAF ?? 0));
      setVendorMonthlyFeeXAF(String(monetisationData.vendorMonthlyFeeXAF ?? 0));
      setVendorYearlyFeeXAF(String(monetisationData.vendorYearlyFeeXAF ?? 0));
    } catch (error) {
      Alert.alert(
        "Error",
        error instanceof Error ? error.message : "Failed to load payments data.",
      );
    } finally {
      if (reason === "initial") {
        setLoading(false);
      } else {
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!isPlatformAdmin) {
      router.replace("/(dashboard)/dashboard");
      return;
    }

    void loadData("initial");
  }, [isPlatformAdmin, loadData, router]);

  useEffect(() => {
    if (!isPlatformAdmin || !isFocused) {
      return;
    }

    void loadData("auto");
    const refreshInterval = setInterval(() => {
      void loadData("auto");
    }, 20000);

    return () => {
      clearInterval(refreshInterval);
    };
  }, [isFocused, isPlatformAdmin, loadData]);

  const hasChanges = useMemo(() => {
    if (!settings) {
      return false;
    }

    return (
      Number(withdrawalFeePercent) !== Number(settings.withdrawalFeePercent ?? 0) ||
      vendorPaymentModel !== settings.vendorPaymentModel ||
      Number(vendorOneTimeFeeXAF) !== Number(settings.vendorOneTimeFeeXAF ?? 0) ||
      Number(vendorMonthlyFeeXAF) !== Number(settings.vendorMonthlyFeeXAF ?? 0) ||
      Number(vendorYearlyFeeXAF) !== Number(settings.vendorYearlyFeeXAF ?? 0)
    );
  }, [
    settings,
    withdrawalFeePercent,
    vendorPaymentModel,
    vendorOneTimeFeeXAF,
    vendorMonthlyFeeXAF,
    vendorYearlyFeeXAF,
  ]);

  const saveSettings = async () => {
    const payload = {
      withdrawalFeePercent: Number(withdrawalFeePercent || 0),
      vendorPaymentModel,
      vendorOneTimeFeeXAF: Number(vendorOneTimeFeeXAF || 0),
      vendorMonthlyFeeXAF: Number(vendorMonthlyFeeXAF || 0),
      vendorYearlyFeeXAF: Number(vendorYearlyFeeXAF || 0),
    };

    if (payload.withdrawalFeePercent < 0 || payload.withdrawalFeePercent > 50) {
      Alert.alert(t("errors.error"), t("adminPayments.withdrawalFeeRange"));
      return;
    }

    if (
      payload.vendorOneTimeFeeXAF < 0 ||
      payload.vendorMonthlyFeeXAF < 0 ||
      payload.vendorYearlyFeeXAF < 0
    ) {
      Alert.alert(t("errors.error"), t("adminPayments.vendorFeeRange"));
      return;
    }

    try {
      setSaving(true);
      await api.patch("/admin/monetisation", payload);
      Alert.alert(t("common.submit"), t("adminPayments.saved"));
      await loadData("save");
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("adminPayments.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (!isPlatformAdmin) {
    return null;
  }

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F8F5]">
        <ActivityIndicator size="large" color="#1B5E20" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F8F5]" contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View className="rounded-2xl border border-[#DDEBDD] bg-white p-5">
        <Text className="text-2xl font-bold text-[#1B5E20]">{t("adminPayments.title")}</Text>
        <Text className="mt-2 text-slate-600">{t("adminPayments.subtitle")}</Text>
        <PressableScale
          onPress={() => {
            void loadData("manual");
          }}
          disabled={refreshing || saving}
          className="mt-4 self-start rounded-xl border border-[#1B5E20] px-4 py-2"
        >
          <Text className="font-medium text-[#1B5E20]">
            {refreshing ? `${t("common.refresh")}...` : t("common.refresh")}
          </Text>
        </PressableScale>
      </View>

      <View className="flex-row flex-wrap gap-3">
        <View className="min-w-[47%] flex-1 rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-xs text-slate-500">{t("adminPayments.overview.totalRevenue")}</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">
            {formatXaf(insights?.overview.totalRevenueXAF ?? 0)}
          </Text>
        </View>
        <View className="min-w-[47%] flex-1 rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-xs text-slate-500">{t("adminPayments.overview.withdrawalFees")}</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">
            {formatXaf(insights?.overview.withdrawalFeesDisbursedXAF ?? 0)}
          </Text>
        </View>
        <View className="min-w-[47%] flex-1 rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-xs text-slate-500">{t("adminPayments.overview.vendorPayments")}</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">
            {formatXaf(insights?.overview.vendorPaymentsCollectedXAF ?? 0)}
          </Text>
        </View>
        <View className="min-w-[47%] flex-1 rounded-2xl border border-[#DDEBDD] bg-white p-4">
          <Text className="text-xs text-slate-500">{t("adminPayments.overview.activeSubscriptions")}</Text>
          <Text className="mt-2 text-lg font-semibold text-slate-900">
            {insights?.overview.activeVendorSubscriptions ?? 0}
          </Text>
        </View>
      </View>

      <View className="rounded-2xl border border-[#DDEBDD] bg-white p-5">
        <Text className="text-base font-semibold text-slate-900">{t("adminPayments.withdrawals.title")}</Text>
        {insights?.withdrawalFees.length ? (
          <View className="mt-3 gap-2">
            {insights.withdrawalFees.slice((withdrawalPage - 1) * PAGE_SIZE, withdrawalPage * PAGE_SIZE).map((item) => (
              <View key={item.id} className="rounded-xl border border-[#E9F3E9] bg-[#F9FCF9] p-3">
                <Text className="font-semibold text-slate-800">{item.cooperative.name}</Text>
                <Text className="mt-1 text-slate-600">{formatXaf(item.platformFeeXAF)} · {translateStatus(item.status)}</Text>
                <Text className="text-xs text-slate-500">{formatDate(item.createdAt)}</Text>
              </View>
            ))}
            {insights.withdrawalFees.length > PAGE_SIZE && (
              <View className="flex-row justify-between mt-2">
                <PressableScale
                  onPress={() => setWithdrawalPage((p) => Math.max(1, p - 1))}
                  disabled={withdrawalPage === 1}
                  className="px-4 py-2 rounded-xl border border-[#CFE3CF]"
                >
                  <Text className="text-[#1B5E20]">{t("adminPayments.pagination.previous")}</Text>
                </PressableScale>
                <Text className="text-slate-500 self-center">{t("adminPayments.pagination.page")} {withdrawalPage} / {Math.ceil(insights.withdrawalFees.length / PAGE_SIZE)}</Text>
                <PressableScale
                  onPress={() => setWithdrawalPage((p) => Math.min(Math.ceil(insights.withdrawalFees.length / PAGE_SIZE), p + 1))}
                  disabled={withdrawalPage >= Math.ceil(insights.withdrawalFees.length / PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl border border-[#CFE3CF]"
                >
                  <Text className="text-[#1B5E20]">{t("adminPayments.pagination.next")}</Text>
                </PressableScale>
              </View>
            )}
          </View>
        ) : (
          <Text className="mt-3 text-slate-500">{t("adminPayments.withdrawals.empty")}</Text>
        )}
      </View>

      <View className="rounded-2xl border border-[#DDEBDD] bg-white p-5">
        <Text className="text-base font-semibold text-slate-900">{t("adminPayments.vendors.title")}</Text>
        {insights?.vendorPayments.length ? (
          <View className="mt-3 gap-2">
            {insights.vendorPayments.slice((vendorPage - 1) * PAGE_SIZE, vendorPage * PAGE_SIZE).map((item) => (
              <View key={item.id} className="rounded-xl border border-[#E9F3E9] bg-[#F9FCF9] p-3">
                <Text className="font-semibold text-slate-800">{item.vendor.businessName}</Text>
                <Text className="mt-1 text-slate-600">
                  {translateCycle(item.billingCycle)} · {formatXaf(item.priceXAF)} · {translateStatus(item.status)}
                </Text>
                <Text className="text-xs text-slate-500">{formatDate(item.createdAt)}</Text>
              </View>
            ))}
            {insights.vendorPayments.length > PAGE_SIZE && (
              <View className="flex-row justify-between mt-2">
                <PressableScale
                  onPress={() => setVendorPage((p) => Math.max(1, p - 1))}
                  disabled={vendorPage === 1}
                  className="px-4 py-2 rounded-xl border border-[#CFE3CF]"
                >
                  <Text className="text-[#1B5E20]">{t("adminPayments.pagination.previous")}</Text>
                </PressableScale>
                <Text className="text-slate-500 self-center">{t("adminPayments.pagination.page")} {vendorPage} / {Math.ceil(insights.vendorPayments.length / PAGE_SIZE)}</Text>
                <PressableScale
                  onPress={() => setVendorPage((p) => Math.min(Math.ceil(insights.vendorPayments.length / PAGE_SIZE), p + 1))}
                  disabled={vendorPage >= Math.ceil(insights.vendorPayments.length / PAGE_SIZE)}
                  className="px-4 py-2 rounded-xl border border-[#CFE3CF]"
                >
                  <Text className="text-[#1B5E20]">{t("adminPayments.pagination.next")}</Text>
                </PressableScale>
              </View>
            )}
          </View>
        ) : (
          <Text className="mt-3 text-slate-500">{t("adminPayments.vendors.empty")}</Text>
        )}
      </View>

      <View className="rounded-2xl border border-[#DDEBDD] bg-white p-5">
        <Text className="text-base font-semibold text-slate-900">{t("adminPayments.editor.title")}</Text>

        <Text className="mt-4 text-xs font-medium text-slate-700">
          {t("adminPayments.editor.withdrawalFeePercent")}
        </Text>
        <TextInput
          value={withdrawalFeePercent}
          onChangeText={setWithdrawalFeePercent}
          keyboardType="numeric"
          className="mt-1 rounded-xl border border-[#CFE3CF] bg-[#F1F7F1] px-4 py-3"
        />

        <Text className="mt-4 text-xs font-medium text-slate-700">
          {t("adminPayments.editor.vendorPaymentModel")}
        </Text>
        <View className="mt-2 flex-row gap-2">
          <PressableScale
            className={`flex-1 rounded-xl border px-3 py-3 items-center ${
              vendorPaymentModel === "ONE_TIME"
                ? "border-[#1B5E20] bg-[#EAF7EA]"
                : "border-[#CFE3CF] bg-[#F1F7F1]"
            }`}
            onPress={() => setVendorPaymentModel("ONE_TIME")}
          >
            <Text className="font-medium text-[#1B5E20]">{t("adminPayments.model.oneTime")}</Text>
          </PressableScale>
          <PressableScale
            className={`flex-1 rounded-xl border px-3 py-3 items-center ${
              vendorPaymentModel === "SUBSCRIPTION"
                ? "border-[#1B5E20] bg-[#EAF7EA]"
                : "border-[#CFE3CF] bg-[#F1F7F1]"
            }`}
            onPress={() => setVendorPaymentModel("SUBSCRIPTION")}
          >
            <Text className="font-medium text-[#1B5E20]">{t("adminPayments.model.subscription")}</Text>
          </PressableScale>
        </View>

        <Text className="mt-4 text-xs font-medium text-slate-700">
          {t("adminPayments.editor.vendorOneTimeFee")}
        </Text>
        <TextInput
          value={vendorOneTimeFeeXAF}
          onChangeText={setVendorOneTimeFeeXAF}
          keyboardType="numeric"
          className="mt-1 rounded-xl border border-[#CFE3CF] bg-[#F1F7F1] px-4 py-3"
        />

        <Text className="mt-4 text-xs font-medium text-slate-700">
          {t("adminPayments.editor.vendorMonthlyFee")}
        </Text>
        <TextInput
          value={vendorMonthlyFeeXAF}
          onChangeText={setVendorMonthlyFeeXAF}
          keyboardType="numeric"
          className="mt-1 rounded-xl border border-[#CFE3CF] bg-[#F1F7F1] px-4 py-3"
        />

        <Text className="mt-4 text-xs font-medium text-slate-700">
          {t("adminPayments.editor.vendorYearlyFee")}
        </Text>
        <TextInput
          value={vendorYearlyFeeXAF}
          onChangeText={setVendorYearlyFeeXAF}
          keyboardType="numeric"
          className="mt-1 rounded-xl border border-[#CFE3CF] bg-[#F1F7F1] px-4 py-3"
        />

        <PressableScale
          disabled={saving || !hasChanges}
          className={`mt-5 rounded-xl px-4 py-3 items-center ${
            saving || !hasChanges ? "bg-[#9FBF9F]" : "bg-[#1B5E20]"
          }`}
          onPress={() => {
            void saveSettings();
          }}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white">{t("adminPayments.save")}</Text>
          )}
        </PressableScale>
      </View>

      <PressableScale
        className="rounded-xl border border-[#1B5E20] px-4 py-3 items-center mb-8"
        onPress={async () => {
          await logout();
          router.replace("/(auth)/login");
        }}
      >
        <Text className="font-medium text-[#1B5E20]">{t("common.logout")}</Text>
      </PressableScale>
    </ScrollView>
  );
}
