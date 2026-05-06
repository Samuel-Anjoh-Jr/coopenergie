import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

import PressableScale from "@/components/pressable-scale";
import { ScreenReveal } from "@/components/screen-reveal";
import { StarRatingMobile } from "@/components/shared/StarRatingMobile";
import { api } from "@/lib/api";
import { useMobileTranslations } from "@/lib/translations";

type VendorProduct = {
  id: string;
  title: string;
  description: string;
  priceXAF: number;
  unit?: string | null;
  images: Array<{ id: string; url: string; altText?: string | null }>;
};

type VendorProfile = {
  id: string;
  businessName: string;
  description: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  website?: string | null;
  avgRating?: number | null;
  totalReviews?: number | null;
  products: VendorProduct[];
};

type VendorReview = {
  id: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

function formatXaf(value: number) {
  return `${value.toLocaleString()} FCFA`;
}

function normalizeWebsite(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `https://${url}`;
}

export default function DashboardVendorProfileScreen() {
  const { id, select } = useLocalSearchParams<{ id: string; select?: string }>();
  const router = useRouter();
  const { t } = useMobileTranslations();

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    setLoading(true);
    try {
      const [profile, reviewList] = await Promise.all([
        api.get<VendorProfile>(`/vendors/${id}`),
        api.get<VendorReview[]>(`/vendors/${id}/reviews`),
      ]);
      setVendor(profile);
      setReviews(reviewList);
      setSelectedProductId(profile.products[0]?.id ?? null);
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("vendorProfile.feedback.profileFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const selectedProduct = useMemo(
    () => vendor?.products.find((item) => item.id === selectedProductId) ?? null,
    [selectedProductId, vendor?.products],
  );

  const visibleReviews = useMemo(
    () => (showAllReviews ? reviews : reviews.slice(0, 3)),
    [reviews, showAllReviews],
  );

  async function openLink(url: string) {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      Alert.alert(t("errors.error"), t("errors.unknownError"));
      return;
    }

    await Linking.openURL(url);
  }

  if (loading) {
    return (
      <ScreenReveal className="bg-[#F5F8F5] p-4">
        <Text className="text-slate-600">{t("vendorProfile.loading")}</Text>
      </ScreenReveal>
    );
  }

  if (!vendor) {
    return (
      <ScreenReveal className="bg-[#F5F8F5] p-4">
        <Text className="text-slate-600">{t("vendorProfile.notFound")}</Text>
      </ScreenReveal>
    );
  }

  return (
    <View className="flex-1 bg-[#F5F8F5]">
      <ScreenReveal className="flex-1">
        <ScrollView contentContainerStyle={{ paddingBottom: 120 }}>
          <View className="relative">
            {vendor.coverImageUrl ? (
              <Image
                source={{ uri: vendor.coverImageUrl }}
                className="w-full h-44"
                resizeMode="cover"
              />
            ) : (
              <View className="w-full h-44 bg-[#DDEBDD]" />
            )}
            <View className="absolute -bottom-8 left-4">
              {vendor.logoUrl ? (
                <Image
                  source={{ uri: vendor.logoUrl }}
                  className="w-16 h-16 rounded-2xl border-2 border-white"
                  resizeMode="cover"
                />
              ) : (
                <View className="w-16 h-16 rounded-2xl border-2 border-white bg-[#E6F0E6] items-center justify-center">
                  <Text className="text-[#1B5E20] font-bold">
                    {vendor.businessName.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View className="px-4 mt-10">
            <Text className="text-[#1B5E20] text-xl font-bold">{vendor.businessName}</Text>
            <Text className="text-slate-600 mt-1">{vendor.city || "-"}</Text>
            <View className="flex-row items-center gap-2 mt-2">
              <StarRatingMobile rating={vendor.avgRating ?? 0} size={16} />
              <Text className="text-slate-600 text-xs">
                {(vendor.avgRating ?? 0).toFixed(1)} ({vendor.totalReviews ?? reviews.length})
              </Text>
            </View>
          </View>

          <View className="px-4 mt-4">
            <View className="bg-white border border-[#DDEBDD] rounded-2xl p-4">
              <Text className="text-[#1B5E20] font-semibold mb-2">{t("vendorProfile.tabs.about")}</Text>
              <Text className="text-slate-700">{vendor.description || "-"}</Text>
            </View>
          </View>

          <View className="mt-4">
            <View className="px-4 mb-2">
              <Text className="text-[#1B5E20] font-semibold">{t("vendorProfile.tabs.products")}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}>
              {vendor.products.map((product) => {
                const selected = selectedProductId === product.id;
                const imageUrl = product.images[0]?.url;

                return (
                  <Pressable
                    key={product.id}
                    className={`w-52 bg-white border rounded-2xl overflow-hidden ${
                      selected ? "border-[#1B5E20]" : "border-[#DDEBDD]"
                    }`}
                    onPress={() => setSelectedProductId(product.id)}
                  >
                    {imageUrl ? (
                      <Image source={{ uri: imageUrl }} className="w-full h-28" resizeMode="cover" />
                    ) : (
                      <View className="w-full h-28 bg-[#EAF3EA]" />
                    )}
                    <View className="p-3">
                      <Text className="text-[#1B5E20] font-semibold" numberOfLines={1}>{product.title}</Text>
                      <Text className="text-[#1B5E20] text-sm mt-1 font-semibold">
                        {formatXaf(product.priceXAF)}
                        {product.unit ? ` / ${product.unit}` : ""}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View className="px-4 mt-4">
            <View className="bg-white border border-[#DDEBDD] rounded-2xl p-4">
              <Text className="text-[#1B5E20] font-semibold mb-3">{t("vendorDashboard.tabs.contact")}</Text>

              {vendor.whatsappNumber ? (
                <PressableScale
                  className="rounded-xl bg-[#22C55E] px-4 py-3 mb-2"
                  onPress={() => {
                    const normalized = vendor.whatsappNumber!.replace(/[^0-9]/g, "");
                    void openLink(`https://wa.me/${normalized}`);
                  }}
                >
                  <Text className="text-white text-center font-semibold">WhatsApp</Text>
                </PressableScale>
              ) : null}

              {vendor.email ? (
                <PressableScale
                  className="rounded-xl border border-[#CFE3CF] px-4 py-3 mb-2"
                  onPress={() => {
                    void openLink(`mailto:${vendor.email}`);
                  }}
                >
                  <Text className="text-[#1B5E20] text-center font-semibold">{vendor.email}</Text>
                </PressableScale>
              ) : null}

              {vendor.website ? (
                <PressableScale
                  className="rounded-xl border border-[#CFE3CF] px-4 py-3"
                  onPress={() => {
                    void openLink(normalizeWebsite(vendor.website!));
                  }}
                >
                  <Text className="text-[#1B5E20] text-center font-semibold">{vendor.website}</Text>
                </PressableScale>
              ) : null}
            </View>
          </View>

          <View className="px-4 mt-4">
            <View className="bg-white border border-[#DDEBDD] rounded-2xl p-4">
              <Text className="text-[#1B5E20] font-semibold mb-2">{t("vendorProfile.tabs.reviews")}</Text>
              {visibleReviews.map((review) => (
                <View key={review.id} className="py-2 border-b border-[#EDF2ED]">
                  <Text className="text-[#1B5E20] font-semibold">{review.reviewerName}</Text>
                  <View className="mt-1">
                    <StarRatingMobile rating={review.rating} size={14} />
                  </View>
                  {review.comment ? (
                    <Text className="text-slate-700 text-sm mt-1">{review.comment}</Text>
                  ) : null}
                </View>
              ))}
              {!reviews.length ? (
                <Text className="text-slate-500">{t("vendorProfile.noReviews")}</Text>
              ) : null}

              {reviews.length > 3 ? (
                <PressableScale
                  className="mt-3 rounded-xl border border-[#CFE3CF] px-4 py-2"
                  onPress={() => setShowAllReviews((current) => !current)}
                >
                  <Text className="text-center text-[#1B5E20] font-semibold">
                    {showAllReviews
                      ? t("vendorsBrowser.showLessReviews")
                      : t("vendorsBrowser.showAllReviews")}
                  </Text>
                </PressableScale>
              ) : null}
            </View>
          </View>
        </ScrollView>
      </ScreenReveal>

      <PressableScale
        className="absolute bottom-5 left-4 right-4 rounded-2xl bg-[#1B5E20] px-4 py-4"
        onPress={() => {
          router.push({
            pathname: "/(dashboard)/proposals",
            params: {
              vendorId: vendor.id,
              vendorName: vendor.businessName,
              vendorLogoUrl: vendor.logoUrl ?? "",
              vendorCity: vendor.city ?? "",
              vendorRating: String(vendor.avgRating ?? 0),
              vendorTotalReviews: String(vendor.totalReviews ?? reviews.length),
              productId: selectedProduct?.id ?? "",
              productTitle: selectedProduct?.title ?? "",
              productPriceXAF: selectedProduct ? String(selectedProduct.priceXAF) : "",
              productUnit: selectedProduct?.unit ?? "",
            },
          });
        }}
      >
        <Text className="text-white text-center font-semibold">
          {select === "1"
            ? t("vendorsBrowser.selectForProposal")
            : t("vendorsBrowser.proposeToCoop")}
        </Text>
      </PressableScale>
    </View>
  );
}
