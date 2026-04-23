import { gql, useQuery } from "@apollo/client";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";

import { api } from "@/lib/api";
import { useActiveCooperative } from "@/lib/dashboard";
import { enqueue } from "@/lib/offline/action-queue";
import { getProposals, saveProposals } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/network-monitor";

type Proposal = {
  id: string;
  title: string;
  description: string;
  status: string;
  yesVotes: number;
  noVotes: number;
  hasUserVoted: boolean;
  txHash?: string | null;
};

const PROPOSALS_QUERY = gql`
  query MobileProposals($cooperativeId: String!) {
    proposals(cooperativeId: $cooperativeId) {
      id
      title
      description
      status
      yesVotes
      noVotes
      hasUserVoted
      txHash
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

export default function ProposalsScreen() {
  const { activeCooperativeId } = useActiveCooperative();
  const { isOnline } = useNetworkStatus();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [localItems, setLocalItems] = useState<Proposal[]>([]);

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

  const displayItems = proposals.length ? proposals : localItems;

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

        Alert.alert("Hors ligne", "Vote mis en file d'attente pour sync.");
        return;
      }

      await api.post("/votes", {
        proposalId,
        choice,
      });
      await refetch();
    } catch (error) {
      Alert.alert(
        "Vote impossible",
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  }

  async function submitProposal() {
    if (!activeCooperativeId) {
      return;
    }

    if (!title.trim() || !description.trim()) {
      Alert.alert("Champs requis", "Entrez un titre et une description.");
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
        Alert.alert(
          "Hors ligne",
          "Proposition mise en file d'attente pour sync.",
        );
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
        "Creation impossible",
        error instanceof Error ? error.message : "Une erreur est survenue.",
      );
    }
  }

  return (
    <View className="flex-1 bg-[#F5F8F5] p-4">
      {!isOnline && (
        <View className="bg-amber-100 border border-amber-300 rounded-xl px-3 py-2 mb-3">
          <Text className="text-amber-800 font-medium">
            Hors ligne: votes et propositions seront mis en file d'attente.
          </Text>
        </View>
      )}

      <Pressable
        className="rounded-xl px-4 py-3 mb-4 bg-[#1B5E20]"
        onPress={() => setModalVisible(true)}
      >
        <Text className="text-white text-center font-semibold">
          Creer une proposition
        </Text>
      </Pressable>

      {loading ? (
        <Text className="text-[#1B5E20]">Chargement des propositions...</Text>
      ) : (
        <FlatList
          data={displayItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 10, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-[#1B5E20] font-bold text-base flex-1 pr-3">
                  {item.title}
                </Text>
                <Text
                  className={`text-xs px-2 py-1 rounded-full ${statusBadgeClass(item.status)}`}
                >
                  {item.status}
                </Text>
              </View>
              <Text className="text-slate-600 mt-2">{item.description}</Text>
              <Text className="text-slate-700 mt-2">
                YES: {item.yesVotes} | NO: {item.noVotes}
              </Text>
              <Text className="text-slate-500 mt-1">
                TX: {item.txHash || "-"}
              </Text>

              <View className="flex-row gap-3 mt-3">
                <Pressable
                  className={`flex-1 rounded-xl py-2 ${item.hasUserVoted ? "bg-slate-300" : "bg-emerald-600"}`}
                  disabled={item.hasUserVoted}
                  onPress={() => submitVote(item.id, true)}
                >
                  <Text className="text-center text-white font-semibold">
                    YES
                  </Text>
                </Pressable>
                <Pressable
                  className={`flex-1 rounded-xl py-2 ${item.hasUserVoted ? "bg-slate-300" : "bg-red-600"}`}
                  disabled={item.hasUserVoted}
                  onPress={() => submitVote(item.id, false)}
                >
                  <Text className="text-center text-white font-semibold">
                    NO
                  </Text>
                </Pressable>
              </View>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              Nouvelle proposition
            </Text>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Titre"
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
            />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Description"
              multiline
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4 min-h-[96px]"
            />
            <View className="flex-row gap-3">
              <Pressable
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setModalVisible(false)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  Annuler
                </Text>
              </Pressable>
              <Pressable
                className="flex-1 bg-[#1B5E20] rounded-xl py-3"
                onPress={submitProposal}
              >
                <Text className="text-center text-white font-semibold">
                  Publier
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}
