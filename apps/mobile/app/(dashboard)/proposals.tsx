import { gql, useQuery } from "@apollo/client";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { useActiveCooperative } from "@/lib/dashboard";
import { enqueue } from "@/lib/offline/action-queue";
import { getProposals, saveProposals } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { detectCameroonMobileMoney } from "@/lib/phone-utils";
import { useMobileTranslations } from "@/lib/translations";

type Proposal = {
  id: string;
  title: string;
  description: string;
  status: string;
  type: "GENERAL" | "WITHDRAWAL" | string;
  yesVotes: number;
  noVotes: number;
  hasUserVoted: boolean;
  createdAt: string;
  txHash?: string | null;
  localSyncState?: "QUEUED_OFFLINE";
  withdrawalRequest?: {
    amountXAF: number;
    destinationType: WithdrawalDestinationType;
    status: string;
    recipientName?: string | null;
    recipientPhone?: string | null;
    recipientBankName?: string | null;
    recipientBankAccount?: string | null;
  } | null;
};

type WithdrawalDestinationType = "MTN_MOMO" | "ORANGE_MONEY" | "BANK_TRANSFER";

type WithdrawalEligibility = {
  canVote: boolean;
  reason: string;
  eligibleVoterCount: number;
  currentYesVotes: number;
  currentNoVotes: number;
  threshold: number;
  yesPercent: number;
  quorumReached: boolean;
};

type UserRole = "MEMBER" | "COOP_ADMIN" | "PLATFORM_ADMIN";

const PROPOSALS_QUERY = gql`
  query MobileProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      title
      description
      status
      type
      yesVotes
      noVotes
      hasUserVoted
      createdAt
      txHash
      withdrawalRequest {
        amountXAF
        destinationType
        status
        recipientName
        recipientPhone
        recipientBankName
        recipientBankAccount
      }
    }
  }
`;

const WITHDRAWAL_ELIGIBILITY_QUERY = gql`
  query MobileWithdrawalEligibility($proposalId: String!) {
    withdrawalEligibility(proposalId: $proposalId) {
      canVote
      reason
      eligibleVoterCount
      currentYesVotes
      currentNoVotes
      threshold
      yesPercent
      quorumReached
    }
  }
`;

function statusBadgeClass(status: string) {
  if (status === "APPROVED") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (status === "REJECTED") {
    return "bg-red-100 text-red-700";
  }

  return "bg-amber-100 text-amber-700";
}

function isMobileMoney(destinationType: WithdrawalDestinationType) {
  return destinationType === "MTN_MOMO" || destinationType === "ORANGE_MONEY";
}

function getDestinationLabel(
  destinationType: WithdrawalDestinationType,
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

export default function ProposalsScreen() {
  const params = useLocalSearchParams<{
    focusProposalId?: string;
    withdrawalRequestId?: string;
    cooperativeId?: string;
  }>();
  const { activeCooperative, activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const { t } = useMobileTranslations();
  const [modalVisible, setModalVisible] = useState(false);
  const [withdrawalModalVisible, setWithdrawalModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localItems, setLocalItems] = useState<Proposal[]>([]);
  const [withdrawalForm, setWithdrawalForm] = useState({
    amountXAF: "",
    reason: "",
    destinationType: "MTN_MOMO" as WithdrawalDestinationType,
    recipientPhone: "",
    recipientBankName: "",
    recipientBankAccount: "",
    recipientName: "",
  });

  const cooperativeBalance = activeCooperative?.balance ?? 0;
  const userRole =
    (activeCooperative?.membership?.role as UserRole | undefined) ?? "MEMBER";

  useEffect(() => {
    async function loadLocal() {
      if (!activeCooperativeId) {
        return;
      }

      const cached = await getProposals<Proposal>(activeCooperativeId);
      setLocalItems(cached);
    }

    void loadLocal();
  }, [activeCooperativeId]);

  const { data, loading, refetch } = useQuery<{ proposals: Proposal[] }>(
    PROPOSALS_QUERY,
    {
      variables: {
        cooperativeId: activeCooperativeId as string,
      },
      skip: !activeCooperativeId,
      fetchPolicy: "cache-and-network",
    },
  );

  const proposals = useMemo(() => data?.proposals ?? [], [data]);
  const focusedProposalId =
    typeof params.focusProposalId === "string"
      ? params.focusProposalId
      : undefined;
  const displayItems = useMemo(() => {
    const items = proposals.length ? proposals : localItems;
    const sorted = [...items].sort(
      (left, right) =>
        +new Date(right.createdAt || 0) - +new Date(left.createdAt || 0),
    );

    if (!focusedProposalId) {
      return sorted;
    }

    return sorted.sort((left, right) => {
      const leftFocused = left.id === focusedProposalId ? 1 : 0;
      const rightFocused = right.id === focusedProposalId ? 1 : 0;
      return rightFocused - leftFocused;
    });
  }, [focusedProposalId, localItems, proposals]);

  useEffect(() => {
    async function persistFresh() {
      if (!activeCooperativeId || !data?.proposals) {
        return;
      }

      await saveProposals(activeCooperativeId, data.proposals);
      setLocalItems(data.proposals);
    }

    void persistFresh();
  }, [activeCooperativeId, data?.proposals]);

  async function submitVote(proposalId: string, choice: boolean) {
    try {
      if (!isOnline) {
        enqueue({
          type: "vote.cast",
          payload: {
            proposalId,
            choice,
          },
          idempotencyKey: `vote-${Date.now()}-${Math.random().toString(16).slice(2)}`,
          attemptCount: 0,
        });

        Alert.alert(t("status.offlineProposals"), t("feedback.voteQueued"));
        return;
      }

      await api.post("/votes", {
        proposalId,
        choice,
      });
      await refetch();
    } catch (error) {
      Alert.alert(
        t("errors.voteFailed"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  function resetWithdrawalForm() {
    setWithdrawalForm({
      amountXAF: "",
      reason: "",
      destinationType: "MTN_MOMO",
      recipientPhone: "",
      recipientBankName: "",
      recipientBankAccount: "",
      recipientName: "",
    });
  }

  async function submitProposal() {
    if (!activeCooperativeId) {
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      if (!isOnline) {
        enqueue({
          type: "proposal.create",
          payload: {
            cooperativeId: activeCooperativeId,
            title: title.trim(),
            description: description.trim(),
          },
          idempotencyKey: `proposal-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          attemptCount: 0,
        });

        setTitle("");
        setDescription("");
        setModalVisible(false);
        Alert.alert(t("status.offlineProposals"), t("feedback.proposalQueued"));
        return;
      }

      await api.post("/proposals", {
        cooperativeId: activeCooperativeId,
        title: title.trim(),
        description: description.trim(),
      });
      setTitle("");
      setDescription("");
      setModalVisible(false);
      await refetch();
    } catch (error) {
      Alert.alert(
        t("errors.proposalFailed"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  async function submitWithdrawalProposal() {
    if (!activeCooperativeId) {
      return;
    }

    if (
      !withdrawalForm.amountXAF.trim() ||
      !withdrawalForm.reason.trim() ||
      !withdrawalForm.recipientName.trim()
    ) {
      Alert.alert(t("errors.error"), t("errors.withdrawalFormIncomplete"));
      return;
    }

    const amountXAF = Number.parseInt(withdrawalForm.amountXAF, 10);
    if (!Number.isFinite(amountXAF) || amountXAF <= 0) {
      Alert.alert(t("errors.error"), t("errors.invalidAmount"));
      return;
    }

    if (cooperativeBalance > 0 && amountXAF > cooperativeBalance) {
      Alert.alert(t("errors.error"), t("errors.amountExceedsBalance"));
      return;
    }

    const detectedMobileMoney = isMobileMoney(withdrawalForm.destinationType)
      ? detectCameroonMobileMoney(withdrawalForm.recipientPhone)
      : null;

    if (isMobileMoney(withdrawalForm.destinationType) && !detectedMobileMoney) {
      Alert.alert(t("errors.error"), t("errors.withdrawalRecipientRequired"));
      return;
    }

    if (
      withdrawalForm.destinationType === "BANK_TRANSFER" &&
      (!withdrawalForm.recipientBankName.trim() ||
        !withdrawalForm.recipientBankAccount.trim())
    ) {
      Alert.alert(t("errors.error"), t("errors.withdrawalRecipientRequired"));
      return;
    }

    const payload = {
      cooperativeId: activeCooperativeId,
      amountXAF,
      reason: withdrawalForm.reason.trim(),
      destinationType:
        detectedMobileMoney?.destinationType ?? withdrawalForm.destinationType,
      recipientPhone: isMobileMoney(withdrawalForm.destinationType)
        ? detectedMobileMoney?.normalizedPhone
        : undefined,
      recipientOperator: detectedMobileMoney?.carrier,
      recipientBankName:
        withdrawalForm.destinationType === "BANK_TRANSFER"
          ? withdrawalForm.recipientBankName.trim()
          : undefined,
      recipientBankAccount:
        withdrawalForm.destinationType === "BANK_TRANSFER"
          ? withdrawalForm.recipientBankAccount.trim()
          : undefined,
      recipientName: withdrawalForm.recipientName.trim(),
    };

    try {
      if (!isOnline) {
        const queuedId = `queued-withdrawal-${Date.now()}`;
        enqueue({
          type: "withdrawal.propose",
          payload,
          idempotencyKey: `withdrawal-${Date.now()}-${Math.random()
            .toString(16)
            .slice(2)}`,
          attemptCount: 0,
        });

        const queuedProposal: Proposal = {
          id: queuedId,
          title: `${t("proposals.withdrawalTag")}: ${amountXAF.toLocaleString()} FCFA`,
          description: withdrawalForm.reason.trim(),
          status: "PENDING",
          type: "WITHDRAWAL",
          yesVotes: 0,
          noVotes: 0,
          hasUserVoted: false,
          createdAt: new Date().toISOString(),
          txHash: null,
          localSyncState: "QUEUED_OFFLINE",
          withdrawalRequest: {
            amountXAF,
            destinationType:
              detectedMobileMoney?.destinationType ??
              withdrawalForm.destinationType,
            status: "PENDING_VOTE",
            recipientName: withdrawalForm.recipientName.trim(),
            recipientPhone: detectedMobileMoney?.normalizedPhone ?? null,
            recipientBankName:
              withdrawalForm.destinationType === "BANK_TRANSFER"
                ? withdrawalForm.recipientBankName.trim()
                : null,
            recipientBankAccount:
              withdrawalForm.destinationType === "BANK_TRANSFER"
                ? withdrawalForm.recipientBankAccount.trim()
                : null,
          },
        };

        const updatedLocalItems = [queuedProposal, ...localItems];
        setLocalItems(updatedLocalItems);
        await saveProposals(activeCooperativeId, updatedLocalItems);

        resetWithdrawalForm();
        setWithdrawalModalVisible(false);
        Alert.alert(
          t("status.offlineProposals"),
          t("feedback.withdrawalQueued"),
        );
        return;
      }

      await api.post("/withdrawals/propose", payload);
      resetWithdrawalForm();
      setWithdrawalModalVisible(false);
      Alert.alert(t("common.submit"), t("feedback.withdrawalCreated"));
      await refetch();
    } catch (error) {
      Alert.alert(
        t("errors.withdrawalRequestFailed"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  const detectedPhoneDestination = detectCameroonMobileMoney(
    withdrawalForm.recipientPhone,
  );

  return (
    <View className="flex-1 bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            {t("status.offlineProposals")}
          </Text>
        </View>
      )}

      <Pressable
        className="rounded-xl px-4 py-3 mb-4 bg-[#1B5E20]"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-white text-center font-semibold">
          {t("proposals.createProposal")}
        </Text>
      </Pressable>

      {userRole === "COOP_ADMIN" && (
        <Pressable
          className="rounded-xl px-4 py-3 mb-4 bg-[#C75B12]"
          onPress={() => setWithdrawalModalVisible(true)}
        >
          <Text className="text-white text-center font-semibold">
            {t("proposals.createWithdrawal")}
          </Text>
        </Pressable>
      )}

      {loading ? (
        <Text className="text-[#1B5E20]">{t("status.loadingProposals")}</Text>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <ProposalCard
              item={item}
              onVote={submitVote}
              t={t}
              isFocused={item.id === focusedProposalId}
            />
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              {t("proposals.newProposal")}
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder={t("proposals.titlePlaceholder")}
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder={t("proposals.descriptionPlaceholder")}
              multiline
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4 min-h-[96px]"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("common.cancel")}
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-[#1B5E20] rounded-xl py-3"
                onPress={submitProposal}
              >
                <Text className="text-center text-white font-semibold">
                  {t("common.submit")}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={withdrawalModalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD] max-h-[90%]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              {t("proposals.newWithdrawal")}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text className="text-slate-600 mb-3">
                {t("proposals.withdrawalDescription")}
              </Text>

              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("proposals.amountLabel")}
              </Text>
              <TextInput
                value={withdrawalForm.amountXAF}
                onChangeText={(value) =>
                  setWithdrawalForm((current) => ({
                    ...current,
                    amountXAF: value,
                  }))
                }
                placeholder={t("contributions.amountPlaceholder")}
                keyboardType="numeric"
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-2"
              />
              <Text className="text-slate-500 mb-3">
                {t("proposals.availableBalance")}:{" "}
                {cooperativeBalance.toLocaleString()} FCFA
              </Text>

              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("proposals.reasonLabel")}
              </Text>
              <TextInput
                value={withdrawalForm.reason}
                onChangeText={(value) =>
                  setWithdrawalForm((current) => ({
                    ...current,
                    reason: value,
                  }))
                }
                placeholder={t("proposals.reasonPlaceholder")}
                multiline
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3 min-h-[96px]"
              />

              <Text className="text-[#1B5E20] font-semibold mb-2">
                {t("proposals.destinationType")}
              </Text>
              <View className="flex-row gap-2 mb-3">
                {(["MTN_MOMO", "ORANGE_MONEY", "BANK_TRANSFER"] as const).map(
                  (option) => {
                    const isSelected =
                      withdrawalForm.destinationType === option;

                    return (
                      <Pressable
                        key={option}
                        className={`flex-1 rounded-xl px-3 py-3 border ${
                          isSelected
                            ? "bg-[#1B5E20] border-[#1B5E20]"
                            : "bg-white border-[#CFE3CF]"
                        }`}
                        onPress={() =>
                          setWithdrawalForm((current) => ({
                            ...current,
                            destinationType: option,
                            recipientPhone: "",
                            recipientBankName: "",
                            recipientBankAccount: "",
                          }))
                        }
                      >
                        <Text
                          className={`text-center text-xs font-semibold ${
                            isSelected ? "text-white" : "text-[#1B5E20]"
                          }`}
                        >
                          {getDestinationLabel(option, t)}
                        </Text>
                      </Pressable>
                    );
                  },
                )}
              </View>

              {isMobileMoney(withdrawalForm.destinationType) && (
                <>
                  <Text className="text-[#1B5E20] font-semibold mb-1">
                    {t("proposals.phoneNumber")}
                  </Text>
                  <TextInput
                    value={withdrawalForm.recipientPhone}
                    onChangeText={(value) => {
                      const detected = detectCameroonMobileMoney(value);
                      setWithdrawalForm((current) => ({
                        ...current,
                        recipientPhone: value,
                        destinationType:
                          detected?.destinationType ?? current.destinationType,
                      }));
                    }}
                    placeholder={t("proposals.phonePlaceholder")}
                    keyboardType="phone-pad"
                    className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
                  />
                  {detectedPhoneDestination ? (
                    <Text className="text-slate-500 mb-3">
                      {getDestinationLabel(
                        detectedPhoneDestination.destinationType,
                        t,
                      )}
                    </Text>
                  ) : null}
                </>
              )}

              {withdrawalForm.destinationType === "BANK_TRANSFER" && (
                <>
                  <Text className="text-[#1B5E20] font-semibold mb-1">
                    {t("proposals.bankName")}
                  </Text>
                  <TextInput
                    value={withdrawalForm.recipientBankName}
                    onChangeText={(value) =>
                      setWithdrawalForm((current) => ({
                        ...current,
                        recipientBankName: value,
                      }))
                    }
                    placeholder={t("proposals.bankPlaceholder")}
                    className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
                  />

                  <Text className="text-[#1B5E20] font-semibold mb-1">
                    {t("proposals.accountNumber")}
                  </Text>
                  <TextInput
                    value={withdrawalForm.recipientBankAccount}
                    onChangeText={(value) =>
                      setWithdrawalForm((current) => ({
                        ...current,
                        recipientBankAccount: value,
                      }))
                    }
                    placeholder={t("proposals.accountPlaceholder")}
                    className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
                  />
                </>
              )}

              <Text className="text-[#1B5E20] font-semibold mb-1">
                {t("proposals.recipientName")}
              </Text>
              <TextInput
                value={withdrawalForm.recipientName}
                onChangeText={(value) =>
                  setWithdrawalForm((current) => ({
                    ...current,
                    recipientName: value,
                  }))
                }
                placeholder={t("proposals.recipientPlaceholder")}
                className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4"
              />

              <View className="flex-row gap-3 mb-1">
                <Pressable
                  className="flex-1 border border-[#C75B12] rounded-xl py-3"
                  onPress={() => setWithdrawalModalVisible(false)}
                >
                  <Text className="text-center text-[#C75B12] font-semibold">
                    {t("common.cancel")}
                  </Text>
                </Pressable>
                <Pressable
                  className="flex-1 bg-[#C75B12] rounded-xl py-3"
                  onPress={submitWithdrawalProposal}
                >
                  <Text className="text-center text-white font-semibold">
                    {t("common.submit")}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ProposalCard({
  item,
  onVote,
  t,
  isFocused,
}: {
  item: Proposal;
  onVote: (proposalId: string, choice: boolean) => Promise<void>;
  t: (key: string) => string;
  isFocused?: boolean;
}) {
  const isQueuedOffline =
    item.localSyncState === "QUEUED_OFFLINE" ||
    item.id.startsWith("queued-withdrawal-");
  const isWithdrawal = item.type === "WITHDRAWAL";
  const { data: eligibilityData } = useQuery<{
    withdrawalEligibility: WithdrawalEligibility;
  }>(WITHDRAWAL_ELIGIBILITY_QUERY, {
    variables: { proposalId: item.id },
    skip: !isWithdrawal || isQueuedOffline,
    fetchPolicy: "cache-and-network",
  });

  const eligibility = eligibilityData?.withdrawalEligibility;
  const cannotVoteWithdrawal =
    isWithdrawal && eligibility && !eligibility.canVote;
  const votingDisabled =
    item.hasUserVoted ||
    item.status !== "PENDING" ||
    isQueuedOffline ||
    Boolean(cannotVoteWithdrawal);

  return (
    <View
      className={`bg-white rounded-2xl border p-4 ${
        isFocused ? "border-orange-400" : "border-[#DDEBDD]"
      }`}
    >
      <View className="flex-row items-center justify-between gap-2">
        <Text className="text-[#1B5E20] font-bold text-base flex-1 pr-3">
          {item.title}
        </Text>
        <View className="flex-row items-center gap-2">
          {isWithdrawal && (
            <Text className="text-[10px] px-2 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold">
              {t("proposals.withdrawalTag")}
            </Text>
          )}
          <Text
            className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(item.status)}`}
          >
            {item.status === "APPROVED"
              ? t("proposals.approved")
              : item.status === "REJECTED"
                ? t("proposals.rejected")
                : t("proposals.pending")}
          </Text>
        </View>
      </View>

      <Text className="text-slate-600 mt-2">{item.description}</Text>

      {isQueuedOffline ? (
        <View className="mt-3 rounded-xl border border-amber-300 bg-amber-100 px-3 py-2">
          <Text className="text-amber-800 text-xs font-semibold">
            {t("proposals.pending")}: {t("feedback.withdrawalQueued")}
          </Text>
        </View>
      ) : null}

      {isWithdrawal && item.withdrawalRequest && (
        <View className="mt-3 rounded-xl border border-orange-200 bg-orange-50 px-3 py-3">
          <Text className="text-orange-800 font-semibold">
            {item.withdrawalRequest.amountXAF.toLocaleString()} FCFA
          </Text>
          <Text className="text-orange-700 mt-1">
            {getDestinationLabel(item.withdrawalRequest.destinationType, t)}
          </Text>
          {item.withdrawalRequest.recipientPhone ? (
            <Text className="text-orange-700 mt-1">
              {t("proposals.phoneNumber")}:{" "}
              {item.withdrawalRequest.recipientPhone}
            </Text>
          ) : null}
          {item.withdrawalRequest.recipientBankName ? (
            <Text className="text-orange-700 mt-1">
              {t("proposals.bankName")}:{" "}
              {item.withdrawalRequest.recipientBankName}
            </Text>
          ) : null}
          {item.withdrawalRequest.recipientName ? (
            <Text className="text-orange-700 mt-1">
              {t("proposals.recipientName")}:{" "}
              {item.withdrawalRequest.recipientName}
            </Text>
          ) : null}
        </View>
      )}

      {isWithdrawal && eligibility ? (
        <View className="mt-3 rounded-xl border border-[#F1C38A] bg-[#FFF4E8] px-3 py-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-[#8A4B08] font-semibold">
              {t("proposals.eligibleMembers")}
            </Text>
            <Text className="text-[#8A4B08] font-semibold">
              {eligibility.currentYesVotes}/{eligibility.eligibleVoterCount}{" "}
              {t("proposals.yesShort")}
            </Text>
          </View>
          <View className="w-full h-2 rounded-full bg-[#F4D8B8] mt-2 overflow-hidden">
            <View
              className="h-2 rounded-full bg-[#C75B12]"
              style={{
                width: `${Math.max(0, Math.min(eligibility.yesPercent, 100))}%`,
              }}
            />
          </View>
          <Text className="text-[#8A4B08] mt-2 text-xs">
            {t("proposals.thresholdRequired")}: {eligibility.threshold}%
          </Text>
          {!eligibility.canVote ? (
            <Text className="text-[#8A4B08] mt-2 text-xs">
              {t("proposals.notEligibleWithdrawalDescription")}
            </Text>
          ) : null}
        </View>
      ) : null}

      <Text className="text-slate-700 mt-3">
        {t("proposals.voteRatio")}: {item.yesVotes} {t("proposals.voteYes")} |{" "}
        {item.noVotes} {t("proposals.voteNo")}
      </Text>
      <Text className="text-slate-500 mt-1">TX: {item.txHash || "-"}</Text>

      {cannotVoteWithdrawal ? (
        <Text className="text-[#8A4B08] mt-2 text-xs">
          {t("proposals.notEligibleWithdrawal")}
        </Text>
      ) : null}

      <View className="flex-row gap-3 mt-3">
        <Pressable
          className={`flex-1 rounded-xl py-2 ${votingDisabled ? "bg-slate-300" : "bg-emerald-600"}`}
          disabled={votingDisabled}
          onPress={() => {
            void onVote(item.id, true);
          }}
        >
          <Text className="text-center text-white font-semibold">
            {t("proposals.voteYes")}
          </Text>
        </Pressable>
        <Pressable
          className={`flex-1 rounded-xl py-2 ${votingDisabled ? "bg-slate-300" : "bg-red-600"}`}
          disabled={votingDisabled}
          onPress={() => {
            void onVote(item.id, false);
          }}
        >
          <Text className="text-center text-white font-semibold">
            {t("proposals.voteNo")}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
