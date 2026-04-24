import { gql, useQuery } from "@apollo/client";
import { useLocalSearchParams } from "expo-router";
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
import { useMobileTranslations } from "@/lib/translations";

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
      type
      createdAt
      yesVotes
      noVotes
      title
      description
      hasUserVoted
      withdrawalRequest {
        amountXAF
        destinationType
        recipientPhone
        recipientBankName
        recipientName
      }
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
  type?: string;
  createdAt?: string;
  withdrawalRequest?: {
    amountXAF: number;
    destinationType: "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER";
    recipientPhone?: string | null;
    recipientBankName?: string | null;
    recipientName?: string | null;
  } | null;
};

function getDestinationLabel(
  destinationType: "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER",
  t: (key: string) => string,
) {
  if (destinationType === "MTN_MOMO") {
    return t("proposals.mtnMomo");
  }

  if (destinationType === "ORANGE_MONEY") {
    return t("proposals.orangeMoney");
  }

  return t("proposals.bankTransfer");
}

export default function ReportScreen() {
  const params = useLocalSearchParams<{
    source?: string;
    proposalId?: string;
    withdrawalRequestId?: string;
    amountXAF?: string;
    destinationType?: "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER";
    recipientName?: string;
    reason?: string;
  }>();
  const { token } = useDashboardAuth();
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const { t } = useMobileTranslations();
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
      cooperativeName: t("report.localTitle"),
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

  const recentWithdrawals = useMemo(
    () =>
      cachedProposals
        .filter(
          (proposal) =>
            proposal.type === "WITHDRAWAL" && proposal.withdrawalRequest,
        )
        .sort(
          (left, right) =>
            +new Date(right.createdAt || 0) - +new Date(left.createdAt || 0),
        )
        .slice(0, 3),
    [cachedProposals],
  );

  const pushWithdrawalContext = useMemo(() => {
    if (params.source !== "push") {
      return null;
    }

    if (!params.proposalId && !params.withdrawalRequestId) {
      return null;
    }

    return {
      proposalId: params.proposalId,
      withdrawalRequestId: params.withdrawalRequestId,
      amountXAF: params.amountXAF ? Number(params.amountXAF) : null,
      destinationType: params.destinationType,
      recipientName: params.recipientName,
      reason: params.reason,
    };
  }, [
    params.amountXAF,
    params.destinationType,
    params.proposalId,
    params.reason,
    params.recipientName,
    params.source,
    params.withdrawalRequestId,
  ]);

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
        throw new Error(t("errors.csvFailed"));
      }

      const csvText = await response.text();
      await Share.share({
        title: t("report.csvTitle"),
        message: csvText,
      });
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  const report = data?.report || cachedReport;

  return (
    <View className="flex-1 bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            {t("status.offlineReport")}
          </Text>
        </View>
      )}

      {loading && !data?.report && cachedContributions.length === 0 ? (
        <Text className="text-[#1B5E20]">{t("status.loadingReport")}</Text>
      ) : (
        <View className="gap-3">
          {pushWithdrawalContext ? (
            <View className="bg-white rounded-2xl border border-orange-300 p-4 gap-2">
              <Text className="text-orange-700 text-xs font-semibold">
                PUSH
              </Text>
              <Text className="text-[#1B5E20] font-bold">
                {t("proposals.withdrawalTag")}
              </Text>
              {pushWithdrawalContext.amountXAF ? (
                <Text className="text-slate-700">
                  {pushWithdrawalContext.amountXAF.toLocaleString()} FCFA
                </Text>
              ) : null}
              {pushWithdrawalContext.destinationType ? (
                <Text className="text-slate-700">
                  {getDestinationLabel(
                    pushWithdrawalContext.destinationType,
                    t,
                  )}
                </Text>
              ) : null}
              {pushWithdrawalContext.recipientName ? (
                <Text className="text-slate-700">
                  {t("proposals.recipientName")}:{" "}
                  {pushWithdrawalContext.recipientName}
                </Text>
              ) : null}
              {pushWithdrawalContext.reason ? (
                <Text className="text-slate-600 text-xs">
                  {pushWithdrawalContext.reason}
                </Text>
              ) : null}
              {pushWithdrawalContext.proposalId ? (
                <Text className="text-slate-500 text-xs">
                  Proposal: {pushWithdrawalContext.proposalId}
                </Text>
              ) : null}
              {pushWithdrawalContext.withdrawalRequestId ? (
                <Text className="text-slate-500 text-xs">
                  Request: {pushWithdrawalContext.withdrawalRequestId}
                </Text>
              ) : null}
            </View>
          ) : null}

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-[#1B5E20] text-lg font-bold">
              {report.cooperativeName}
            </Text>
            <Text className="text-slate-600 mt-1">
              {t("report.totalCollected")}: {report.totalCollected} XAF
            </Text>
            <Text className="text-slate-600">
              {t("report.targetAmount")}: {report.targetAmount} XAF
            </Text>
            <Text className="text-slate-600">
              {t("report.completion")}: {report.completionPercent}%
            </Text>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">
                {t("report.proposals")}
              </Text>
              <Text className="text-[#1B5E20] text-2xl font-bold">
                {report.totalProposals}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">
                {t("report.approved")}
              </Text>
              <Text className="text-emerald-600 text-2xl font-bold">
                {report.approvedProposals}
              </Text>
            </View>
            <View className="flex-1 bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-slate-500 text-xs">
                {t("report.rejected")}
              </Text>
              <Text className="text-red-600 text-2xl font-bold">
                {report.rejectedProposals}
              </Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
            <Text className="text-slate-500 text-xs">
              {t("report.estimationMonths")}
            </Text>
            <Text className="text-[#1B5E20] text-xl font-bold">
              {report.estimatedMonthsToGoal ?? "-"}
            </Text>
          </View>

          {recentWithdrawals.length > 0 ? (
            <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4 gap-3">
              <Text className="text-[#1B5E20] font-bold">
                {t("proposals.withdrawalTag")}
              </Text>
              {recentWithdrawals.map((proposal) => (
                <View
                  key={proposal.id}
                  className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-3"
                >
                  <Text className="text-orange-800 font-semibold">
                    {proposal.withdrawalRequest?.amountXAF?.toLocaleString() ||
                      "-"}{" "}
                    FCFA
                  </Text>
                  {proposal.withdrawalRequest ? (
                    <Text className="text-orange-700 mt-1">
                      {getDestinationLabel(
                        proposal.withdrawalRequest.destinationType,
                        t,
                      )}
                    </Text>
                  ) : null}
                  {proposal.withdrawalRequest?.recipientPhone ? (
                    <Text className="text-orange-700 mt-1">
                      {t("proposals.phoneNumber")}:{" "}
                      {proposal.withdrawalRequest.recipientPhone}
                    </Text>
                  ) : null}
                  {proposal.withdrawalRequest?.recipientBankName ? (
                    <Text className="text-orange-700 mt-1">
                      {t("proposals.bankName")}:{" "}
                      {proposal.withdrawalRequest.recipientBankName}
                    </Text>
                  ) : null}
                  {proposal.withdrawalRequest?.recipientName ? (
                    <Text className="text-orange-700 mt-1">
                      {t("proposals.recipientName")}:{" "}
                      {proposal.withdrawalRequest.recipientName}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            className={`rounded-xl py-3 ${isOnline ? "bg-[#1B5E20]" : "bg-slate-400"}`}
            onPress={downloadCsv}
            disabled={!isOnline}
          >
            <Text className="text-white text-center font-semibold">
              {t("report.downloadCsv")}
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}
