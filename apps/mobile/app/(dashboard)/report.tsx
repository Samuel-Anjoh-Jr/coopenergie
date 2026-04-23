import { gql, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, Share, Text, View } from "react-native";

import { API_URL } from "@/lib/constants";
import { useActiveCooperative, useDashboardAuth } from "@/lib/dashboard";
import {
  getContributions,
  getProposals,
  saveContributions,
  saveProposals,
} from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";

type ReportData = {
  cooperativeName: string;
  walletAddress?: string | null;
  totalCollected: number;
  targetAmount: number;
  completionPercent: number;
  estimatedMonthsToGoal?: number | null;
  totalProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
};

const REPORT_QUERY = gql`
  query MobileReport($cooperativeId: String!) {
    report(cooperativeId: $cooperativeId) {
      cooperativeName
      walletAddress
      totalCollected
      targetAmount
      completionPercent
      estimatedMonthsToGoal
      totalProposals
      approvedProposals
      rejectedProposals
    }
  }
`;

const CONTRIBUTIONS_CACHE_QUERY = gql`
  query MobileReportContributions($cooperativeId: String!) {
    contributions(cooperativeId: $cooperativeId) {
      id
      amountXAF
      status
      createdAt
      userName
    }
  }
`;

const PROPOSALS_CACHE_QUERY = gql`
  query MobileReportProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      status
      yesVotes
      noVotes
      title
      description
      hasUserVoted
    }
  }
`;

type CachedContribution = {
  id: string;
  amountXAF: number;
  createdAt: string;
};

type CachedProposal = {
  id: string;
  status: string;
};

export default function ReportScreen() {
  const { token } = useDashboardAuth();
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const [cachedContributions, setCachedContributions] = useState<
    CachedContribution[]
  >([]);
  const [cachedProposals, setCachedProposals] = useState<CachedProposal[]>([]);

  useEffect(() => {
    async function loadLocal() {
      if (!activeCooperativeId) {
        return;
      }

      const [localContributions, localProposals] = await Promise.all([
        getContributions<CachedContribution>(activeCooperativeId),
        getProposals<CachedProposal>(activeCooperativeId),
      ]);

      setCachedContributions(localContributions);
      setCachedProposals(localProposals);
    }

    void loadLocal();
  }, [activeCooperativeId]);

  const { data, loading } = useQuery<{ report: ReportData }>(REPORT_QUERY, {
    variables: {
      cooperativeId: activeCooperativeId as string,
    },
    skip: !activeCooperativeId,
    fetchPolicy: "cache-and-network",
  });

  const { data: contributionsData } = useQuery<{
    contributions: Array<{ id: string } & Record<string, unknown>>;
  }>(CONTRIBUTIONS_CACHE_QUERY, {
    variables: {
      cooperativeId: activeCooperativeId as string,
    },
    skip: !activeCooperativeId,
    fetchPolicy: "cache-and-network",
  });

  const { data: proposalsData } = useQuery<{
    proposals: Array<{ id: string } & Record<string, unknown>>;
  }>(PROPOSALS_CACHE_QUERY, {
    variables: {
      cooperativeId: activeCooperativeId as string,
    },
    skip: !activeCooperativeId,
    fetchPolicy: "cache-and-network",
  });

  useEffect(() => {
    async function persistFresh() {
      if (!activeCooperativeId || !contributionsData?.contributions) {
        return;
      }

      await saveContributions(
        activeCooperativeId,
        contributionsData.contributions,
      );
      setCachedContributions(
        contributionsData.contributions as CachedContribution[],
      );
    }

    void persistFresh();
  }, [activeCooperativeId, contributionsData?.contributions]);

  useEffect(() => {
    async function persistFresh() {
      if (!activeCooperativeId || !proposalsData?.proposals) {
        return;
      }

      await saveProposals(activeCooperativeId, proposalsData.proposals);
      setCachedProposals(proposalsData.proposals as CachedProposal[]);
    }

    void persistFresh();
  }, [activeCooperativeId, proposalsData?.proposals]);

  const cachedReport = useMemo(() => {
    const totalCollected = cachedContributions.reduce(
      (sum, item) => sum + (item.amountXAF || 0),
      0,
    );

    const approvedProposals = cachedProposals.filter(
      (item) => item.status === "APPROVED",
    ).length;
    const rejectedProposals = cachedProposals.filter(
      (item) => item.status === "REJECTED",
    ).length;

    return {
      cooperativeName: "Rapport local",
      walletAddress: null,
      totalCollected,
      targetAmount: 0,
      completionPercent: 0,
      estimatedMonthsToGoal: null,
      totalProposals: cachedProposals.length,
      approvedProposals,
      rejectedProposals,
    } as ReportData;
  }, [cachedContributions, cachedProposals]);

  async function downloadCsv() {
    if (!activeCooperativeId || !token) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/reports/cooperative/${activeCooperativeId}/csv`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Impossible de telecharger le CSV.");
      }

      const csvText = await response.text();
      await Share.share({
        title: "Rapport CSV CoopEnergie",
        message: csvText,
      });
    } catch (error) {
      Alert.alert(
        "Erreur CSV",
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  }

  const report = data?.report || cachedReport;

  return (
    <View className="flex-1 bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            Hors ligne: rapport construit depuis le cache local.
          </Text>
        </View>
      )}

      {loading && !data?.report && cachedContributions.length === 0 ? (
        <Text className="text-[#1B5E20]">Chargement du rapport...</Text>
      ) : (
        <View className="gap-3">
          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] text-lg font-bold">
              {report.cooperativeName}
            </Text>
            <Text className="text-slate-600 mt-1">
              Collecte: {report.totalCollected} XAF
            </Text>
            <Text className="text-slate-600">
              Objectif: {report.targetAmount} XAF
            </Text>
            <Text className="text-slate-600">
              Completion: {report.completionPercent}%
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">Proposals</Text>
              <Text className="text-[#1B5E20] text-2xl font-bold">
                {report.totalProposals}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">Approved</Text>
              <Text className="text-emerald-600 text-2xl font-bold">
                {report.approvedProposals}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">Rejected</Text>
              <Text className="text-red-600 text-2xl font-bold">
                {report.rejectedProposals}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-slate-500 text-xs">Estimation (mois)</Text>
            <Text className="text-[#1B5E20] text-xl font-bold">
              {report.estimatedMonthsToGoal ?? "-"}
            </Text>
          </View>

          <Pressable
            className={`rounded-xl py-3 ${isOnline ? "bg-[#1B5E20]" : "bg-slate-400"}`}
            onPress={downloadCsv}
            disabled={!isOnline}
          >
            <Text className="text-white text-center font-semibold">
              Telecharger CSV
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
