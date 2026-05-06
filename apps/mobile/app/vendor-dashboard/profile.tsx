import { useCallback, useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Alert, Image, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";

import { getUser } from "@/lib/auth";
import { api } from "@/lib/api";
import { getVendorProfile } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";

export default function VendorProfileScreen() {
  const { t } = useMobileTranslations();
  const user = getUser();
  const vendorId = user?.vendor?.id;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [city, setCity] = useState("");
  const [country, setCountry] = useState("CM");
  const [logoUrl, setLogoUrl] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const load = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const profile = await getVendorProfile(vendorId);
      setBusinessName(profile.businessName || "");
      setDescription(profile.description || "");
      setCity(profile.city || "");
      setCountry(profile.country || "CM");
      setLogoUrl(profile.logoUrl || "");
      setCoverImageUrl(profile.coverImageUrl || "");
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
      await api.patch("/vendors/profile", {
        businessName,
        description,
        city,
        country,
      });
      Alert.alert(t("vendorDashboard.common.success"), t("vendorDashboard.profile.updated"));
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  const pickAndUpload = async (field: "logo" | "cover") => {
    const hasPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!hasPermission.granted) {
      Alert.alert(t("vendorDashboard.common.error"), t("vendorDashboard.common.requestFailed"));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets.length) {
      return;
    }

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append(field, {
      uri: asset.uri,
      type: asset.mimeType || "image/jpeg",
      name: asset.fileName || `${field}-${Date.now()}.jpg`,
    } as unknown as Blob);

    try {
      if (field === "logo") {
        setUploadingLogo(true);
      } else {
        setUploadingCover(true);
      }

      const response = await api.postMultipart<{ logoUrl?: string; coverImageUrl?: string }>(
        field === "logo" ? "/vendors/logo" : "/vendors/cover",
        formData,
      );

      if (field === "logo") {
        setLogoUrl(response.logoUrl || logoUrl);
      } else {
        setCoverImageUrl(response.coverImageUrl || coverImageUrl);
      }

      Alert.alert(t("vendorDashboard.common.success"), t("vendorDashboard.profile.mediaUpdated"));
      await load();
    } catch (error) {
      Alert.alert(
        t("vendorDashboard.common.error"),
        error instanceof Error ? error.message : t("vendorDashboard.common.requestFailed"),
      );
    } finally {
      if (field === "logo") {
        setUploadingLogo(false);
      } else {
        setUploadingCover(false);
      }
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
        {t("vendorDashboard.profile.title")}
      </Text>

      <View className="gap-3 rounded-xl bg-white p-4">
        <TextInput
          value={businessName}
          onChangeText={setBusinessName}
          placeholder={t("vendorDashboard.profile.businessName")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <TextInput
          value={description}
          onChangeText={setDescription}
          placeholder={t("vendorDashboard.profile.description")}
          multiline
          numberOfLines={4}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder={t("vendorDashboard.profile.city")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <TextInput
          value={country}
          onChangeText={setCountry}
          placeholder={t("vendorDashboard.profile.country")}
          className="rounded-md border border-[#D1D5DB] px-3 py-2"
        />
        <View className="gap-2 rounded-md border border-[#D1D5DB] p-3">
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} className="h-24 w-full rounded-md" resizeMode="cover" />
          ) : null}
          <TouchableOpacity
            onPress={() => void pickAndUpload("logo")}
            disabled={uploadingLogo}
            className="rounded-md border border-[#1B5E20] px-3 py-2"
          >
            <Text className="text-center text-[#1B5E20]">
              {uploadingLogo ? t("vendorDashboard.profile.uploading") : t("vendorDashboard.profile.uploadLogo")}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="gap-2 rounded-md border border-[#D1D5DB] p-3">
          {coverImageUrl ? (
            <Image source={{ uri: coverImageUrl }} className="h-24 w-full rounded-md" resizeMode="cover" />
          ) : null}
          <TouchableOpacity
            onPress={() => void pickAndUpload("cover")}
            disabled={uploadingCover}
            className="rounded-md border border-[#1B5E20] px-3 py-2"
          >
            <Text className="text-center text-[#1B5E20]">
              {uploadingCover ? t("vendorDashboard.profile.uploading") : t("vendorDashboard.profile.uploadCover")}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={() => void save()} className="rounded-md bg-[#1B5E20] px-4 py-3">
          <Text className="text-center font-semibold text-white">
            {saving ? t("vendorDashboard.common.saving") : t("vendorDashboard.common.save")}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
