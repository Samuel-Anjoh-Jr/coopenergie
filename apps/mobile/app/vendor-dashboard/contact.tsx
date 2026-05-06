import { useCallback, useEffect, useState } from "react";
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { getVendorProfile } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";

export default function VendorContactScreen() {
  const { t } = useMobileTranslations();
  const user = getUser();
  const vendorId = user?.vendor?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [website, setWebsite] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");

  const load = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const profile = await getVendorProfile(vendorId);
      setEmail(profile.email || "");
      setWhatsappNumber(profile.whatsappNumber || "");
      setWebsite(profile.website || "");
      setFacebookUrl(profile.facebookUrl || "");
      setInstagramUrl(profile.instagramUrl || "");
      setTwitterUrl(profile.twitterUrl || "");
      setLinkedinUrl(profile.linkedinUrl || "");
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      await api.patch("/vendors/contact", {
        email,
        whatsappNumber,
        website,
        facebookUrl,
        instagramUrl,
        twitterUrl,
        linkedinUrl,
      });
      Alert.alert(t("vendorDashboard.common.success"), t("vendorDashboard.contact.updated"));
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-[#F5F8F5]">
        <Text className="text-[#6B7280]">{t("vendorDashboard.common.loading")}</Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#F5F8F5] px-4 py-4">
      <Text className="mb-3 text-xl font-semibold text-[#111827]">
        {t("vendorDashboard.contact.title")}
      </Text>

      <View className="gap-3 rounded-xl bg-white p-4">
        <Field value={email} onChange={setEmail} placeholder={t("vendorDashboard.contact.email")} />
        <Field value={whatsappNumber} onChange={setWhatsappNumber} placeholder={t("vendorDashboard.contact.whatsapp")} />
        <Field value={website} onChange={setWebsite} placeholder={t("vendorDashboard.contact.website")} />
        <Field value={facebookUrl} onChange={setFacebookUrl} placeholder={t("vendorDashboard.contact.facebook")} />
        <Field value={instagramUrl} onChange={setInstagramUrl} placeholder={t("vendorDashboard.contact.instagram")} />
        <Field value={twitterUrl} onChange={setTwitterUrl} placeholder={t("vendorDashboard.contact.twitter")} />
        <Field value={linkedinUrl} onChange={setLinkedinUrl} placeholder={t("vendorDashboard.contact.linkedin")} />

        <TouchableOpacity onPress={() => void save()} className="rounded-md bg-[#1B5E20] px-4 py-3">
          <Text className="text-center font-semibold text-white">
            {saving ? t("vendorDashboard.common.saving") : t("vendorDashboard.common.save")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

function Field({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (text: string) => void;
  placeholder: string;
}) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      className="rounded-md border border-[#D1D5DB] px-3 py-2"
    />
  );
}
