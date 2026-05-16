import * as Clipboard from "expo-clipboard";
import { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Text, TextInput, View } from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { getUser } from "@/lib/auth";
import { useActiveCooperative } from "@/lib/dashboard";
import { useMobileTranslations } from "@/lib/translations";

type Invitation = {
  id: string;
  type: "EMAIL" | "LINK";
  email: string | null;
  token: string;
  expiresAt: string;
};

type Membership = {
  id: string;
  role: "MEMBER" | "COOP_ADMIN" | "PLATFORM_ADMIN";
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
};

export default function InvitationsScreen() {
  const { t, locale } = useMobileTranslations();
  const { activeCooperativeId, activeCooperative } = useActiveCooperative();
  const user = getUser();

  const [email, setEmail] = useState("");
  const [pending, setPending] = useState<Invitation[]>([]);
  const [members, setMembers] = useState<Membership[]>([]);
  const [latestJoinUrl, setLatestJoinUrl] = useState("");
  const [loading, setLoading] = useState(false);

  const isAdmin = activeCooperative?.membership?.role === "COOP_ADMIN";

  const loadPending = useCallback(async () => {
    if (!activeCooperativeId || !isAdmin) {
      setPending([]);
      setMembers([]);
      return;
    }

    try {
      const [invites, memberList] = await Promise.all([
        api.get<Invitation[]>(
          `/invitations/cooperative/${activeCooperativeId}`,
        ),
        api.get<Membership[]>(
          `/memberships/cooperative/${activeCooperativeId}`,
        ),
      ]);

      setPending(invites || []);
      setMembers(memberList || []);
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }, [activeCooperativeId, isAdmin, t]);

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  async function sendByEmail() {
    if (!activeCooperativeId || !email.trim()) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post<{ joinUrl?: string }>(
        "/invitations/email",
        {
          cooperativeId: activeCooperativeId,
          email: email.trim(),
          locale,
        },
      );
      setLatestJoinUrl(response.joinUrl || "");
      setEmail("");
      Alert.alert(t("common.submit"), t("invitations.invitationSent"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function generateLink() {
    if (!activeCooperativeId) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      setLoading(true);
      const response = await api.post<{ joinUrl?: string }>(
        "/invitations/link",
        {
          cooperativeId: activeCooperativeId,
          locale,
        },
      );
      setLatestJoinUrl(response.joinUrl || "");
      Alert.alert(t("common.submit"), t("invitations.linkGenerated"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setLoading(false);
    }
  }

  async function revoke(invitationId: string) {
    try {
      await api.delete(`/invitations/${invitationId}`);
      Alert.alert(t("common.submit"), t("invitations.invitationRevoked"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  async function copyLatestLink() {
    if (!latestJoinUrl) {
      return;
    }

    await Clipboard.setStringAsync(latestJoinUrl);
    Alert.alert(t("common.submit"), t("invitations.linkCopied"));
  }

  async function promoteMember(userId: string) {
    if (!activeCooperativeId) {
      return;
    }

    try {
      await api.patch(
        `/memberships/cooperative/${activeCooperativeId}/user/${userId}/role`,
        {
          role: "COOP_ADMIN",
        },
      );
      Alert.alert(t("common.submit"), t("invitations.memberPromoted"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  async function demoteMember(userId: string) {
    if (!activeCooperativeId) {
      return;
    }

    try {
      await api.patch(
        `/memberships/cooperative/${activeCooperativeId}/user/${userId}/role`,
        {
          role: "MEMBER",
        },
      );
      Alert.alert(t("common.submit"), t("invitations.memberDemoted"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  async function removeMember(userId: string) {
    if (!activeCooperativeId) {
      return;
    }

    try {
      await api.delete(
        `/memberships/cooperative/${activeCooperativeId}/user/${userId}`,
      );
      Alert.alert(t("common.submit"), t("invitations.memberRemoved"));
      await loadPending();
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    }
  }

  if (!isAdmin) {
    return (
      <ScreenReveal className="bg-[#F5F8F5] p-4">
        <View className="rounded-2xl border border-[#F8D7DA] bg-[#FFF5F6] p-4">
          <Text className="text-[#B42318] font-semibold">
            {t("invitations.adminOnlyTitle")}
          </Text>
          <Text className="text-slate-700 mt-1">
            {t("invitations.adminOnlyDescription")}
          </Text>
        </View>
      </ScreenReveal>
    );
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <View className="rounded-2xl border border-[#DDEBDD] bg-white p-4 mb-3">
        <Text className="text-[#1B5E20] text-xl font-bold">
          {t("invitations.title")}
        </Text>
        <Text className="text-slate-600 text-sm mt-1">
          {t("invitations.description")}
        </Text>

        <Text className="mt-4 text-[#1B5E20] font-semibold">
          {t("invitations.emailInviteTitle")}
        </Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t("invitations.emailPlaceholder")}
          className="mt-2 bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3"
        />

        <View className="mt-3 flex-row gap-2">
          <PressableScale
            className={`flex-1 rounded-xl px-4 py-3 items-center ${loading ? "bg-slate-400" : "bg-[#1B5E20]"}`}
            onPress={() => {
              void sendByEmail();
            }}
            disabled={loading}
          >
            <Text className="text-white font-semibold">
              {t("invitations.sendInvite")}
            </Text>
          </PressableScale>

          <PressableScale
            className="flex-1 rounded-xl border border-[#1B5E20] px-4 py-3 items-center"
            onPress={() => {
              void generateLink();
            }}
            disabled={loading}
          >
            <Text className="text-[#1B5E20] font-semibold">
              {t("invitations.generateLink")}
            </Text>
          </PressableScale>
        </View>

        {latestJoinUrl ? (
          <View className="mt-4 rounded-xl border border-[#DDEBDD] bg-[#F8FCF8] p-3">
            <Text className="text-[#1B5E20] font-semibold text-xs">
              {t("invitations.latestLink")}
            </Text>
            <Text className="text-slate-700 mt-1 text-xs">{latestJoinUrl}</Text>
            <PressableScale
              className="mt-2 rounded-lg border border-[#1B5E20] px-3 py-2 items-center"
              onPress={() => {
                void copyLatestLink();
              }}
            >
              <Text className="text-[#1B5E20] font-semibold text-xs">
                {t("common.copy")}
              </Text>
            </PressableScale>
          </View>
        ) : null}
      </View>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ gap: 8, paddingBottom: 24 }}
        ListHeaderComponent={
          <View className="rounded-2xl border border-[#DDEBDD] bg-white p-4 mb-3">
            <Text className="text-[#1B5E20] font-semibold mb-2">
              {t("invitations.membersTitle")}
            </Text>

            {members.length === 0 ? (
              <Text className="text-slate-600 text-sm">
                {t("invitations.noMembers")}
              </Text>
            ) : (
              members.map((member) => {
                const isMember = member.role === "MEMBER";
                const isCoopAdmin = member.role === "COOP_ADMIN";
                const isPlatformRole = member.role === "PLATFORM_ADMIN";
                const isCurrentUser = member.user.id === user?.id;
                const canDemote =
                  isCoopAdmin &&
                  Boolean(user?.isPlatformAdmin) &&
                  !isCurrentUser;
                const canRemove = !isCurrentUser && !isPlatformRole;

                return (
                  <View
                    key={member.id}
                    className="rounded-xl border border-[#E3EFE3] bg-[#FAFDFA] p-3 mb-2"
                  >
                    <Text className="text-[#1B5E20] font-semibold">
                      {member.user.name || member.user.email || member.user.id}
                    </Text>
                    <Text className="text-slate-600 text-xs mt-0.5">
                      {member.user.email || "-"}
                    </Text>

                    {isMember ? (
                      <PressableScale
                        className="mt-2 rounded-lg px-3 py-2 items-center bg-[#1B5E20]"
                        onPress={() => {
                          void promoteMember(member.user.id);
                        }}
                      >
                        <Text className="text-white font-semibold text-xs">
                          {t("invitations.promoteToAdmin")}
                        </Text>
                      </PressableScale>
                    ) : null}

                    {isCoopAdmin ? (
                      <PressableScale
                        className={`mt-2 rounded-lg px-3 py-2 items-center ${
                          canDemote ? "bg-amber-600" : "bg-slate-300"
                        }`}
                        onPress={() => {
                          void demoteMember(member.user.id);
                        }}
                        disabled={!canDemote}
                      >
                        <Text className="text-white font-semibold text-xs">
                          {t("invitations.demoteToMember")}
                        </Text>
                      </PressableScale>
                    ) : null}

                    <PressableScale
                      className={`mt-2 rounded-lg border px-3 py-2 items-center ${
                        canRemove ? "border-[#B42318]" : "border-slate-300"
                      }`}
                      onPress={() => {
                        Alert.alert(
                          t("invitations.removeMember"),
                          member.user.email || member.user.name || "",
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("invitations.removeMember"),
                              style: "destructive",
                              onPress: () => {
                                void removeMember(member.user.id);
                              },
                            },
                          ],
                        );
                      }}
                      disabled={!canRemove}
                    >
                      <Text
                        className={`font-semibold text-xs ${
                          canRemove ? "text-[#B42318]" : "text-slate-400"
                        }`}
                      >
                        {t("invitations.removeMember")}
                      </Text>
                    </PressableScale>
                  </View>
                );
              })
            )}
          </View>
        }
        ListEmptyComponent={
          <View className="rounded-xl border border-[#DDEBDD] bg-white p-4">
            <Text className="text-slate-600">{t("invitations.noPending")}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View className="rounded-xl border border-[#DDEBDD] bg-white p-4">
            <Text className="text-[#1B5E20] font-semibold">{item.type}</Text>
            <Text className="text-slate-700 text-sm mt-1">
              {item.email || item.token}
            </Text>
            <Text className="text-slate-500 text-xs mt-1">
              {t("invitations.expiresAt")}:{" "}
              {new Date(item.expiresAt).toLocaleString()}
            </Text>
            <PressableScale
              className="mt-3 rounded-lg border border-[#B42318] px-3 py-2 items-center"
              onPress={() => {
                void revoke(item.id);
              }}
            >
              <Text className="text-[#B42318] font-semibold text-xs">
                {t("invitations.revoke")}
              </Text>
            </PressableScale>
          </View>
        )}
      />
    </ScreenReveal>
  );
}
