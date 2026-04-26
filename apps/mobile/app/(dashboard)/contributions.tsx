import { gql, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Linking,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { CELOSCAN_BASE } from "@/lib/constants";
import { useActiveCooperative } from "@/lib/dashboard";
import { enqueue } from "@/lib/offline/action-queue";
import { getContributions, saveContributions } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { useMobileTranslations } from "@/lib/translations";
import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";

type Contribution = {
  id: string;
  amountXAF: number;
  txHash?: string | null;
  status: string;
  createdAt: string;
  userName?: string | null;
};

const CONTRIBUTIONS_QUERY = gql`
  query MobileContributions($cooperativeId: String!) {
    contributions(cooperativeId: $cooperativeId) {
      id
      amountXAF
      txHash
      status
      createdAt
      userName
    }
  }
`;

function truncateHash(hash?: string | null) {
  if (!hash) {
    return "-";
  }

  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function ContributionsScreen() {
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const { t } = useMobileTranslations();
  const [modalVisible, setModalVisible] = useState(false);
  const [amount, setAmount] = useState("");
  const [localItems, setLocalItems] = useState<Contribution[]>([]);

  useEffect(() => {
    async function loadLocal() {
      if (!activeCooperativeId) {
        return;
      }

      const cached = await getContributions<Contribution>(activeCooperativeId);
      setLocalItems(cached);
    }

    void loadLocal();
  }, [activeCooperativeId]);

  const { data, loading, refetch } = useQuery<{
    contributions: Contribution[];
  }>(CONTRIBUTIONS_QUERY, {
    variables: {
      cooperativeId: activeCooperativeId as string,
    },
    skip: !activeCooperativeId,
    fetchPolicy: "cache-and-network",
  });

  const contributions = useMemo(() => data?.contributions ?? [], [data]);

  useEffect(() => {
    async function persistFresh() {
      if (!activeCooperativeId || !data?.contributions) {
        return;
      }

      await saveContributions(activeCooperativeId, data.contributions);
      setLocalItems(data.contributions);
    }

    void persistFresh();
  }, [activeCooperativeId, data?.contributions]);

  const displayItems = contributions.length ? contributions : localItems;

  async function submitContribution() {
    if (!activeCooperativeId) {
      return;
    }

    const amountXAF = Number(amount);

    if (!Number.isFinite(amountXAF) || amountXAF <= 0) {
      Alert.alert(t("errors.invalidAmount"), t("errors.enterValidAmount"));
      return;
    }

    try {
      if (!isOnline) {
        const tempId = `offline-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        const idempotencyKey = `contribution-${Date.now()}-${Math.random()
          .toString(16)
          .slice(2)}`;

        enqueue({
          type: "contribution.create",
          payload: {
            cooperativeId: activeCooperativeId,
            amountXAF,
          },
          idempotencyKey,
          attemptCount: 0,
        });

        const optimistic: Contribution = {
          id: tempId,
          amountXAF,
          status: "PENDING",
          txHash: null,
          createdAt: new Date().toISOString(),
          userName: t("common.cooperative"),
        };

        const updated = [optimistic, ...localItems];
        setLocalItems(updated);
        await saveContributions(activeCooperativeId, updated);

        setAmount("");
        setModalVisible(false);
        Alert.alert(
          t("status.offlineContributions"),
          t("feedback.contributionQueued"),
        );
        return;
      }

      const result = await api.post<{ txHash?: string }>("/contributions", {
        cooperativeId: activeCooperativeId,
        amountXAF,
      });

      setAmount("");
      setModalVisible(false);
      await refetch();

      const txHash = result.txHash;
      if (txHash) {
        Alert.alert(
          t("feedback.contributionConfirmed"),
          `${t("blockchain.txPrefix")} ${truncateHash(txHash)}`,
          [
            { text: t("common.close") },
            {
              text: t("blockchain.viewOnCeloScan"),
              onPress: () => Linking.openURL(`${CELOSCAN_BASE}/tx/${txHash}`),
            },
          ],
        );
        return;
      }

      Alert.alert(
        t("feedback.contributionSent"),
        t("feedback.contributionRecorded"),
      );
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.contributionFailed"),
      );
    }
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            {t("status.offlineContributions")}
          </Text>
        </View>
      )}

      <PressableScale
        className="rounded-xl px-4 py-3 mb-4 bg-[#1B5E20]"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-white text-center font-semibold">
          {t("common.contribute")}
        </Text>
      </PressableScale>

      {loading ? (
        <Text className="text-[#1B5E20]">
          {t("status.loadingContributions")}
        </Text>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <Text className="text-[#1B5E20] font-bold text-base">
                {item.userName || t("common.members")}
              </Text>
              <Text className="text-slate-700 mt-1">{item.amountXAF} XAF</Text>
              <Text className="text-slate-500 mt-1">
                {t("blockchain.txPrefix")} {truncateHash(item.txHash)}
              </Text>
              <Text className="text-slate-500 mt-1">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              {t("contributions.newContribution")}
            </Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t("contributions.amountPlaceholder")}
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4"
            />
            <View className="flex-row gap-3">
              <PressableScale
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("common.cancel")}
                </Text>
              </PressableScale>
              <PressableScale
                className="flex-1 bg-[#1B5E20] rounded-xl py-3"
                onPress={submitContribution}
              >
                <Text className="text-center text-white font-semibold">
                  {t("common.submit")}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>
    </ScreenReveal>
  );
}
