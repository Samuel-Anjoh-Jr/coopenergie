import { gql, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import { FlatList, Linking, Pressable, Text, View } from "react-native";

import { CELOSCAN_BASE } from "@/lib/constants";
import { useActiveCooperative } from "@/lib/dashboard";
import { getLedger, saveLedger } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";
import { useMobileTranslations } from "@/lib/translations";

type LedgerEvent = {
  id: string;
  type: string;
  txHash: string;
  blockNumber: number;
  createdAt: string;
  celoScanUrl?: string | null;
};

const LEDGER_QUERY = gql`
  query MobileLedger($cooperativeId: String!, $type: String, $limit: Int) {
    ledger(cooperativeId: $cooperativeId, type: $type, limit: $limit) {
      id
      type
      txHash
      blockNumber
      createdAt
      celoScanUrl
    }
  }
`;

const FILTERS = [
  { key: "all", value: null },
  { key: "contributions", value: "CONTRIBUTION" },
  { key: "votes", value: "VOTE" },
  { key: "proposals", value: "PROPOSAL" },
] as const;

function truncateHash(hash: string) {
  return `${hash.slice(0, 8)}...${hash.slice(-6)}`;
}

export default function LedgerScreen() {
  const { activeCooperativeId, activeCooperative } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const { t } = useMobileTranslations();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(FILTERS[0]);
  const [localItems, setLocalItems] = useState<LedgerEvent[]>([]);

  useEffect(() => {
    async function loadLocal() {
      if (!activeCooperativeId) {
        return;
      }

      const cached = await getLedger<LedgerEvent>(activeCooperativeId);
      setLocalItems(cached);
    }

    void loadLocal();
  }, [activeCooperativeId]);

  const { data, loading } = useQuery<{ ledger: LedgerEvent[] }>(LEDGER_QUERY, {
    variables: {
      cooperativeId: activeCooperativeId as string,
      type: filter.value,
      limit: 100,
    },
    skip: !activeCooperativeId,
    fetchPolicy: "cache-and-network",
  });

  const events = useMemo(() => data?.ledger ?? [], [data]);

  useEffect(() => {
    async function persistFresh() {
      if (!activeCooperativeId || !data?.ledger) {
        return;
      }

      await saveLedger(activeCooperativeId, data.ledger);
      setLocalItems(data.ledger);
    }

    void persistFresh();
  }, [activeCooperativeId, data?.ledger]);

  const displayItems = events.length ? events : localItems;

  return (
    <View className="flex-1 bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            {t("status.offlineLedger")}
          </Text>
        </View>
      )}

      <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4 mb-4">
        <Text className="text-[#1B5E20] font-bold">{t("ledger.wallet")}</Text>
        <Text className="text-slate-600 mt-1">
          {activeCooperative?.vaultAddress || "-"}
        </Text>
        {!!activeCooperative?.vaultAddress && (
          <Pressable
            className="mt-2"
            onPress={() =>
              Linking.openURL(
                `${CELOSCAN_BASE}/address/${activeCooperative.vaultAddress}`,
              )
            }
          >
            <Text className="text-[#1B5E20] font-semibold">
              {t("blockchain.viewOnCeloScan")}
            </Text>
          </Pressable>
        )}
      </View>

      <View className="flex-row gap-2 mb-4">
        {FILTERS.map((item) => (
          <Pressable
            key={item.key}
            className={`px-3 py-2 rounded-full ${
              filter.key === item.key
                ? "bg-[#1B5E20]"
                : "bg-white border border-[#DDEBDD]"
            }`}
            onPress={() => setFilter(item)}
          >
            <Text
              className={
                filter.key === item.key
                  ? "text-white font-semibold"
                  : "text-[#1B5E20] font-semibold"
              }
            >
              {t(`ledger.${item.key}`)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <Text className="text-[#1B5E20]">{t("status.loadingLedger")}</Text>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs px-2 py-1 rounded-full bg-[#E8F5E8] text-[#1B5E20] font-semibold">
                  {item.type}
                </Text>
                <Text className="text-slate-500">
                  {t("blockchain.blockPrefix")} {item.blockNumber}
                </Text>
              </View>
              <Text className="text-slate-700 mt-2">
                {t("blockchain.txPrefix")} {truncateHash(item.txHash)}
              </Text>
              <Text className="text-slate-500 mt-1">
                {new Date(item.createdAt).toLocaleString()}
              </Text>
              <Pressable
                className="mt-2"
                onPress={() =>
                  Linking.openURL(
                    item.celoScanUrl || `${CELOSCAN_BASE}/tx/${item.txHash}`,
                  )
                }
              >
                <Text className="text-[#1B5E20] font-semibold">
                  {t("blockchain.verifyOnCeloScan")}
                </Text>
              </Pressable>
            </View>
          )}
        />
      )}
    </View>
  );
}
