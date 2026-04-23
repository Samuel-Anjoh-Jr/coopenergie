import { gql, useQuery, useSubscription } from "@apollo/client";
import * as Clipboard from "expo-clipboard";
import { useEffect, useMemo, useState } from "react";
import { Linking, Pressable, ScrollView, Text, View } from "react-native";

import { CELOSCAN_BASE } from "@/lib/constants";
import { useActiveCooperative } from "@/lib/dashboard";
import { getContributions, getLedger, saveLedger } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";

type RecentActivity = {
  id: string;
  type: string;
  txHash: string;
  createdAt: string;
};

type CooperativeData = {
  id: string;
  name: string;
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
      targetAmountXAF
      totalCollected
      progress
      vaultAddress
      memberCount
      recentActivity {
        id
        type
        txHash
        createdAt
      }
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

export default function DashboardScreen() {
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const [cachedTotal, setCachedTotal] = useState(0);
  const [cachedActivity, setCachedActivity] = useState<RecentActivity[]>([]);

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
    },
  );

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
  const progress = Math.min(100, Math.max(0, cooperative?.progress ?? 0));
  const totalCollected = cooperative?.totalCollected ?? cachedTotal;
  const activity = cooperative?.recentActivity?.length
    ? cooperative.recentActivity
    : cachedActivity;

  return (
    <ScrollView
      className="flex-1 bg-[#F5F8F5]"
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2">
          <Text className="text-amber-800 font-medium">
            Mode hors ligne: donnees locales affichees.
          </Text>
        </View>
      )}

      {loading && !cooperative && cachedActivity.length === 0 ? (
        <Text className="text-[#1B5E20]">Chargement du dashboard...</Text>
      ) : (
        <>
          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] text-2xl font-bold">
              {cooperative?.name || "Cooperative"}
            </Text>
            <Text className="text-slate-600 mt-2">
              Cible: {cooperative?.targetAmountXAF || 0} XAF
            </Text>
            <Text className="text-slate-700 font-semibold mt-1">
              Collecte: {totalCollected} XAF
            </Text>

            <View className="mt-3 h-3 rounded-full bg-[#E6EFE6] overflow-hidden">
              <View
                className="h-3 bg-[#1B5E20]"
                style={{ width: `${progress}%` }}
              />
            </View>
            <Text className="text-[#1B5E20] font-semibold mt-2">
              {progress.toFixed(2)}%
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] font-bold">Adresse du wallet</Text>
            <Text className="text-slate-600 mt-1">
              {cooperative?.vaultAddress || "-"}
            </Text>

            <View className="flex-row gap-3 mt-3">
              <Pressable
                className="flex-1 rounded-xl border border-[#1B5E20] py-2"
                onPress={() => {
                  if (cooperative.vaultAddress) {
                    void Clipboard.setStringAsync(cooperative.vaultAddress);
                  }
                }}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  Copier
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 rounded-xl bg-[#1B5E20] py-2"
                onPress={() => {
                  if (cooperative.vaultAddress) {
                    void Linking.openURL(
                      `${CELOSCAN_BASE}/address/${cooperative.vaultAddress}`,
                    );
                  }
                }}
              >
                <Text className="text-center text-white font-semibold">
                  Voir sur CeloScan
                </Text>
              </Pressable>
            </View>
          </View>

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] font-bold">Membres</Text>
            <Text className="text-2xl text-[#1B5E20] font-bold mt-1">
              {cooperative?.memberCount || 0}
            </Text>
          </View>

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] font-bold mb-2">
              Activite recente
            </Text>
            {activity.length === 0 ? (
              <Text className="text-slate-500">Aucune activite recente.</Text>
            ) : (
              activity.slice(0, 6).map((item) => (
                <View key={item.id} className="py-2 border-b border-[#EFF4EF]">
                  <Text className="text-[#1B5E20] font-semibold">
                    {item.type}
                  </Text>
                  <Text className="text-slate-600">
                    TX: {truncateHash(item.txHash)}
                  </Text>
                  <Text className="text-slate-500">
                    {new Date(item.createdAt).toLocaleString()}
                  </Text>
                </View>
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}
