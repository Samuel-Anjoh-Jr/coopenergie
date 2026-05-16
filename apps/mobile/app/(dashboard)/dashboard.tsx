import { gql, useQuery, useSubscription } from "@apollo/client";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { CELOSCAN_BASE } from "@/lib/constants";
import { api } from "@/lib/api";
import { useActiveCooperative } from "@/lib/dashboard";
import { getContributions, getLedger, saveLedger } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { useMobileTranslations } from "@/lib/translations";
import PressableScale from "@/components/pressable-scale";
import { SectionReveal } from "@/components/section-reveal";
import { ScreenReveal } from "@/components/screen-reveal";

type RecentActivity = {
  id: string;
  type: string;
  payload?: Record<string, unknown>;
  txHash: string;
  blockNumber?: number;
  createdAt: string;
};

type CooperativeData = {
  id: string;
  name: string;
  baseTargetXAF?: number | null;
  targetAmountXAF: number;
  totalCollected: number;
  progress: number;
  vaultAddress?: string | null;
  memberCount: number;
  recentActivity: RecentActivity[];
};

const COOPERATIVE_QUERY = gql`
  query MobileCooperativeDashboard($id: String!) {
    cooperative(id: $id) {
      id
      name
      baseTargetXAF
      targetAmountXAF
      totalCollected
      progress
      vaultAddress
      memberCount
      recentActivity {
        id
        type
        payload
        txHash
        blockNumber
        createdAt
      }
    }
  }
`;

const MONETISATION_QUERY = gql`
  query MobileMonetisationSettings {
    monetisationSettings {
      withdrawalFeePercent
    }
  }
`;

const CONTRIBUTION_SUBSCRIPTION = gql`
  subscription MobileOnContribution($cooperativeId: String!) {
    onContribution(cooperativeId: $cooperativeId) {
      id
      amountXAF
      txHash
      createdAt
    }
  }
`;

const PROPOSAL_SUBSCRIPTION = gql`
  subscription MobileOnProposal($cooperativeId: String!) {
    onProposal(cooperativeId: $cooperativeId) {
      id
      status
      txHash
      createdAt
    }
  }
`;

function truncateHash(hash?: string | null) {
  if (!hash) {
    return "-";
  }

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

function getActorAddress(
  type: string,
  payload?: Record<string, unknown>,
): string | null {
  if (!payload) {
    return null;
  }

  const eventType = type.toUpperCase();

  if (eventType === "PROPOSAL") {
    return (payload.creator as string) || null;
  }
  if (eventType === "CONTRIBUTION") {
    return (payload.member as string) || null;
  }
  if (eventType === "VOTE") {
    return (payload.voter as string) || null;
  }
  if (eventType === "PAYMENT") {
    return (payload.recipient as string) || null;
  }

  return null;
}

function getActorLabel(activity: RecentActivity): string {
  const payload = activity.payload;

  if (!payload) {
    return "-";
  }

  const performerName =
    typeof payload.performerName === "string" && payload.performerName.trim()
      ? payload.performerName.trim()
      : null;

  return performerName ?? getActorAddress(activity.type, payload) ?? "-";
}

export default function DashboardScreen() {
  const router = useRouter();
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const { t } = useMobileTranslations();
  const [cachedTotal, setCachedTotal] = useState(0);
  const [cachedActivity, setCachedActivity] = useState<RecentActivity[]>([]);
  const [coopName, setCoopName] = useState("");
  const [coopTarget, setCoopTarget] = useState("");
  const [isCreatingCoop, setIsCreatingCoop] = useState(false);

  useEffect(() => {
    async function loadLocal() {
      if (!activeCooperativeId) {
        return;
      }

      const [localContributions, localLedger] = await Promise.all([
        getContributions<{ amountXAF?: number }>(activeCooperativeId),
        getLedger<RecentActivity>(activeCooperativeId),
      ]);

      const total = localContributions.reduce(
        (sum, item) => sum + (item.amountXAF || 0),
        0,
      );

      setCachedTotal(total);
      setCachedActivity(localLedger.slice(0, 10));
    }

    void loadLocal();
  }, [activeCooperativeId]);

  const { data, loading, refetch } = useQuery<{ cooperative: CooperativeData }>(
    COOPERATIVE_QUERY,
    {
      variables: {
        id: activeCooperativeId as string,
      },
      skip: !activeCooperativeId,
      fetchPolicy: "cache-and-network",
      pollInterval: isOnline ? 20000 : 0,
    },
  );
  const { data: monetisationData } = useQuery<{
    monetisationSettings?: { withdrawalFeePercent?: number | null };
  }>(MONETISATION_QUERY, {
    pollInterval: isOnline ? 30000 : 0,
  });

  const { data: contributionEvent } = useSubscription(
    CONTRIBUTION_SUBSCRIPTION,
    {
      variables: {
        cooperativeId: activeCooperativeId as string,
      },
      skip: !activeCooperativeId,
    },
  );

  const { data: proposalEvent } = useSubscription(PROPOSAL_SUBSCRIPTION, {
    variables: {
      cooperativeId: activeCooperativeId as string,
    },
    skip: !activeCooperativeId,
  });

  useEffect(() => {
    if (contributionEvent || proposalEvent) {
      void refetch();
    }
  }, [contributionEvent, proposalEvent, refetch]);

  useEffect(() => {
    async function persistFreshData() {
      if (!activeCooperativeId || !data?.cooperative?.recentActivity) {
        return;
      }

      await saveLedger(activeCooperativeId, data.cooperative.recentActivity);
      setCachedActivity(data.cooperative.recentActivity);
    }

    void persistFreshData();
  }, [activeCooperativeId, data?.cooperative?.recentActivity]);

  const cooperative = useMemo(() => data?.cooperative, [data]);
  const vaultAddress = cooperative?.vaultAddress;
  const progress = Math.min(100, Math.max(0, cooperative?.progress ?? 0));
  const totalCollected = cooperative?.totalCollected ?? cachedTotal;
  const activity = cooperative?.recentActivity?.length
    ? cooperative.recentActivity
    : cachedActivity;
  const withdrawalFeePercent =
    Number(monetisationData?.monetisationSettings?.withdrawalFeePercent ?? 0) || 0;

  const inputTargetAmount = Number.parseInt(coopTarget, 10) || 0;
  const inputTargetWithFee =
    inputTargetAmount +
    Math.round((inputTargetAmount * withdrawalFeePercent) / 100);

  const targetAmount = Math.max(cooperative?.targetAmountXAF ?? 0, 0);
  const baseTargetAmount = Math.max(
    0,
    cooperative?.baseTargetXAF ?? cooperative?.targetAmountXAF ?? 0,
  );
  const feeAmount = Math.max(0, targetAmount - baseTargetAmount);
  const feeRatio = targetAmount > 0 ? Math.min(1, feeAmount / targetAmount) : 0;
  const collectedWithinTarget =
    targetAmount > 0
      ? Math.min(Math.max(totalCollected, 0), targetAmount)
      : 0;
  const collectedRatio =
    targetAmount > 0 ? collectedWithinTarget / targetAmount : 0;
  const coopFillPercent = collectedRatio * (1 - feeRatio) * 100;
  const feeFillPercent = collectedRatio * feeRatio * 100;
  const surplusAmount = Math.max(0, totalCollected - targetAmount);
  const surplusPercent = targetAmount > 0 ? (surplusAmount / targetAmount) * 100 : 0;

  async function createCooperative() {
    const normalizedTarget = Number.parseInt(coopTarget, 10);

    if (!coopName.trim() || Number.isNaN(normalizedTarget) || normalizedTarget <= 0) {
      Alert.alert(t("errors.error"), t("errors.invalidAmount"));
      return;
    }

    setIsCreatingCoop(true);
    try {
      await api.post("/cooperatives", {
        name: coopName.trim(),
        targetAmountXAF: normalizedTarget,
      });

      setCoopName("");
      setCoopTarget("");
      Alert.alert(t("common.submit"), t("feedback.cooperativeCreated"));
      router.replace("/(dashboard)/dashboard");
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setIsCreatingCoop(false);
    }
  }

  return (
    <ScreenReveal>
      <ScrollView
        className="flex-1 bg-[#F5F8F5]"
        contentContainerStyle={{ padding: 16, gap: 12 }}
      >
        {!isOnline && (
          <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2">
            <Text className="text-amber-800 font-medium">
              {t("status.offlineDashboard")}
            </Text>
          </View>
        )}

        {loading && !cooperative && cachedActivity.length === 0 && activeCooperativeId ? (
          <Text className="text-[#1B5E20]">{t("status.loadingDashboard")}</Text>
        ) : !activeCooperativeId ? (
          <SectionReveal direction="up" delay={0} distance={15}>
            <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] text-xl font-bold">
              {t("dashboard.createCooperativeTitle")}
            </Text>
            <Text className="text-slate-600 mt-2 mb-4">
              {t("dashboard.createCooperativeDescription")}
            </Text>

            <Text className="text-[#1B5E20] font-semibold mb-1">
              {t("dashboard.createCooperativeNameLabel")}
            </Text>
            <TextInput
              value={coopName}
              onChangeText={setCoopName}
              placeholder={t("dashboard.createCooperativeNamePlaceholder")}
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
            />

            <Text className="text-[#1B5E20] font-semibold mb-1">
              {t("dashboard.createCooperativeTargetLabel")}
            </Text>
            <TextInput
              value={coopTarget}
              onChangeText={setCoopTarget}
              placeholder={t("dashboard.createCooperativeTargetPlaceholder")}
              keyboardType="numeric"
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3"
            />

            {withdrawalFeePercent <= 0 ? (
              <Text className="text-emerald-700 text-xs mt-2">
                {t("dashboard.noFeeHelper")}
              </Text>
            ) : (
              <>
                <Text className="text-[#1B5E20] font-semibold text-sm mt-3 mb-1">
                  {t("dashboard.targetWithFeeLabel")}
                </Text>
                <Text className="text-[#1B5E20] font-semibold">
                  {inputTargetWithFee.toLocaleString()} FCFA
                </Text>
                <Text className="text-slate-500 text-xs mt-2">
                  {t("dashboard.feeExplanation")
                    .replace("{percent}", withdrawalFeePercent.toString())
                    .replace("{entered}", inputTargetAmount.toLocaleString())
                    .replace("{total}", inputTargetWithFee.toLocaleString())}
                </Text>
              </>
            )}

            <PressableScale
              className={`rounded-xl px-4 py-3 mt-4 ${
                isCreatingCoop ? "bg-slate-300" : "bg-[#1B5E20]"
              }`}
              onPress={() => {
                void createCooperative();
              }}
              disabled={isCreatingCoop}
            >
              <Text className="text-white text-center font-semibold">
                {isCreatingCoop
                  ? t("dashboard.createCooperativeSubmitting")
                  : t("dashboard.createCooperativeSubmit")}
              </Text>
            </PressableScale>
            </View>
          </SectionReveal>
        ) : (
          <>
            <SectionReveal direction="up" delay={0} distance={15}>
              <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-[#1B5E20] text-2xl font-bold">
                {cooperative?.name || t("common.cooperative")}
              </Text>
              <Text className="text-slate-600 mt-2">
                {t("dashboard.target")}: {cooperative?.targetAmountXAF || 0} XAF
              </Text>
              <Text className="text-slate-700 font-semibold mt-1">
                {t("dashboard.collected")}: {totalCollected} XAF
              </Text>

              <View className="mt-3 relative overflow-visible">
                <View className="h-3 rounded-full bg-[#E6EFE6] overflow-hidden border border-[#DCE8DC]">
                  <View className="h-3 flex-row">
                    <View
                      className="h-3 bg-[#1B5E20]"
                      style={{ width: `${coopFillPercent}%` }}
                    />
                    <View
                      className="h-3 bg-[#D97706]"
                      style={{ width: `${feeFillPercent}%` }}
                    />
                  </View>
                </View>
                {surplusAmount > 0 ? (
                  <View
                    className="absolute h-3 top-0 bg-[#86EFAC] rounded-r-full"
                    style={{ left: "100%", width: `${Math.min(surplusPercent, 120)}%` }}
                  />
                ) : null}
              </View>
              <Text className="text-[#1B5E20] font-semibold mt-2">
                {progress.toFixed(2)}%
              </Text>
              {surplusAmount > 0 ? (
                <Text className="text-emerald-700 text-xs mt-1 font-semibold">
                  {t("dashboard.surplusLabel").replace(
                    "{amount}",
                    surplusAmount.toLocaleString(),
                  )}
                </Text>
              ) : null}
              {withdrawalFeePercent > 0 ? (
                <View className="mt-2">
                  <Text className="text-slate-500 text-xs">{t("dashboard.legendCoop")}</Text>
                  <Text className="text-slate-500 text-xs">
                    {t("dashboard.legendFee").replace(
                      "{percent}",
                      withdrawalFeePercent.toString(),
                    )}
                  </Text>
                </View>
              ) : null}
              </View>
            </SectionReveal>

            <SectionReveal direction="up" delay={80} distance={15}>
              <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-[#1B5E20] font-bold">
                {t("common.walletAddress")}
              </Text>
              <Text className="text-slate-600 mt-1">
                {cooperative?.vaultAddress || "-"}
              </Text>

              <View className="flex-row gap-3 mt-3">
                <PressableScale
                  className="flex-1 rounded-xl border border-[#1B5E20] py-2"
                  onPress={() => {
                    if (vaultAddress) {
                      void Clipboard.setStringAsync(vaultAddress);
                    }
                  }}
                >
                  <Text className="text-center text-[#1B5E20] font-semibold">
                    {t("common.copy")}
                  </Text>
                </PressableScale>
                <PressableScale
                  className="flex-1 rounded-xl bg-[#1B5E20] py-2"
                  onPress={() => {
                    if (vaultAddress) {
                      void Linking.openURL(
                        `${CELOSCAN_BASE}/address/${vaultAddress}`,
                      );
                    }
                  }}
                >
                  <Text className="text-center text-white font-semibold">
                    {t("blockchain.viewOnCeloScan")}
                  </Text>
                </PressableScale>
              </View>
              </View>
            </SectionReveal>

            <SectionReveal direction="up" delay={160} distance={15}>
              <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-[#1B5E20] font-bold">
                {t("common.members")}
              </Text>
              <Text className="text-2xl text-[#1B5E20] font-bold mt-1">
                {cooperative?.memberCount || 0}
              </Text>
              </View>
            </SectionReveal>

            <SectionReveal direction="up" delay={200} distance={15}>
              <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
                <Text className="text-[#1B5E20] font-bold mb-2">
                  {t("dashboard.quickActionsTitle")}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  <PressableScale
                    className="rounded-xl border border-[#1B5E20] px-3 py-2"
                    onPress={() => {
                      router.push("/(dashboard)/profile");
                    }}
                  >
                    <Text className="text-[#1B5E20] font-semibold text-xs">
                      {t("dashboard.quickProfile")}
                    </Text>
                  </PressableScale>
                  <PressableScale
                    className="rounded-xl border border-[#1B5E20] px-3 py-2"
                    onPress={() => {
                      router.push("/(dashboard)/invitations");
                    }}
                  >
                    <Text className="text-[#1B5E20] font-semibold text-xs">
                      {t("dashboard.quickInvitations")}
                    </Text>
                  </PressableScale>
                  <PressableScale
                    className="rounded-xl border border-[#1B5E20] px-3 py-2"
                    onPress={() => {
                      router.push("/(dashboard)/settings");
                    }}
                  >
                    <Text className="text-[#1B5E20] font-semibold text-xs">
                      {t("dashboard.quickSettings")}
                    </Text>
                  </PressableScale>
                </View>
              </View>
            </SectionReveal>

            <SectionReveal direction="up" delay={240} distance={15}>
              <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-[#1B5E20] font-bold mb-2">
                {t("common.recentActivity")}
              </Text>
              {activity.length === 0 ? (
                <Text className="text-slate-500">
                  {t("dashboard.noRecentActivity")}
                </Text>
              ) : (
                activity.slice(0, 6).map((item) => (
                  <View
                    key={item.id}
                    className="py-2 border-b border-[#EFF4EF]"
                  >
                    <Text className="text-[#1B5E20] font-semibold">
                      {item.type}
                    </Text>
                    <Text className="text-slate-600">
                      {t("dashboard.activityActor")}: {getActorLabel(item)}
                    </Text>
                    <Text className="text-slate-600">
                      {t("dashboard.activityLedger")}: {item.blockNumber ?? "-"}
                    </Text>
                    <Text className="text-slate-600">
                      {t("blockchain.txPrefix")} {truncateHash(item.txHash)}
                    </Text>
                    <Text className="text-slate-500">
                      {new Date(item.createdAt).toLocaleString()}
                    </Text>
                  </View>
                ))
              )}
              </View>
            </SectionReveal>
          </>
        )}
      </ScrollView>
    </ScreenReveal>
  );
}
