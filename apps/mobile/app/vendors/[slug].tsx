import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";

import PressableScale from "@/components/pressable-scale";
import { SectionReveal } from "@/components/section-reveal";
import { ScreenReveal } from "@/components/screen-reveal";
import { api } from "@/lib/api";
import { useActiveCooperative } from "@/lib/dashboard";
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
  products: VendorProduct[];
};

type VendorReview = {
  id: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

type ApprovedVendorProposal = {
  id: string;
  vendorLink?: {
    vendor?: {
      id: string;
    } | null;
  } | null;
};

type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
};

function formatXaf(value: number) {
  return `${value.toLocaleString()} FCFA`;
}

export default function VendorProfileScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const { t } = useMobileTranslations();
  const { activeCooperativeId } = useActiveCooperative();

  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "about" | "reviews">(
    "products",
  );

  const [hasApprovedVendorInCoop, setHasApprovedVendorInCoop] = useState(false);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);

  const [proposalOpen, setProposalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [proposalNote, setProposalNote] = useState("");

  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");

  const loadProfile = useCallback(async () => {
    if (!slug) {
      return;
    }

    setLoading(true);
    try {
      const profile = await api.get<VendorProfile>(`/vendors/${slug}`);
      setVendor(profile);
      const reviewList = await api.get<VendorReview[]>(`/vendors/${profile.id}/reviews`);
      setReviews(reviewList);
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("vendorProfile.feedback.profileFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  const loadCoopContext = useCallback(async () => {
    if (!vendor?.id || !activeCooperativeId) {
      setHasApprovedVendorInCoop(false);
      setEligibility(null);
      return;
    }

    try {
      const [approvedProposals, reviewEligibility] = await Promise.all([
        api.get<ApprovedVendorProposal[]>(
          `/vendors/proposals/cooperative/${activeCooperativeId}/approved-vendor-proposals`,
        ),
        api.get<ReviewEligibility>(
          `/vendors/reviews/eligibility?vendorId=${vendor.id}&cooperativeId=${activeCooperativeId}`,
        ),
      ]);

      setHasApprovedVendorInCoop(
        approvedProposals.some((item) => item.vendorLink?.vendor?.id === vendor.id),
      );
      setEligibility(reviewEligibility);
    } catch {
      setHasApprovedVendorInCoop(false);
      setEligibility(null);
    }
  }, [activeCooperativeId, vendor?.id]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    void loadCoopContext();
  }, [loadCoopContext]);

  const selectedProduct = useMemo(
    () => vendor?.products.find((item) => item.id === selectedProductId),
    [selectedProductId, vendor?.products],
  );

  async function submitProposal() {
    if (!vendor || !activeCooperativeId || !selectedProduct) {
      Alert.alert(t("errors.error"), t("errors.invalidFormValues"));
      return;
    }

    try {
      await api.post("/proposals", {
        cooperativeId: activeCooperativeId,
        title: `${t("proposals.autoTitleVendor")} ${vendor.businessName} - ${selectedProduct.title}`,
        description: proposalNote.trim() || t("proposals.vendorDescriptionAuto"),
        vendorId: vendor.id,
        productId: selectedProduct.id,
        vendorNote: proposalNote.trim() || undefined,
      });
      setProposalOpen(false);
      setSelectedProductId("");
      setProposalNote("");
      Alert.alert(t("common.submit"), t("vendorProfile.feedback.proposalSent"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.proposalFailed"),
      );
    }
  }

  async function submitReview() {
    if (!vendor || !activeCooperativeId || !eligibility?.eligible) {
      Alert.alert(t("errors.error"), t("errors.voteFailed"));
      return;
    }

    const normalizedRating = Math.max(1, Math.min(5, Number(rating) || 5));

    try {
      await api.post("/vendors/reviews", {
        vendorId: vendor.id,
        cooperativeId: activeCooperativeId,
        rating: normalizedRating * 10,
        comment: comment.trim() || undefined,
      });

      setReviews((current) => [
        {
          id: `tmp-${Date.now()}`,
          reviewerName: t("vendorReviewCenter.selfLabel"),
          rating: normalizedRating,
          comment: comment.trim() || null,
          createdAt: new Date().toISOString(),
        },
        ...current,
      ]);

      setEligibility({ eligible: false, reason: t("vendorProfile.feedback.reviewSent") });
      setReviewOpen(false);
      setComment("");
      setRating("5");
      Alert.alert(t("common.submit"), t("vendorProfile.feedback.reviewSent"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.voteFailed"),
      );
    }
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
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {vendor.coverImageUrl ? (
          <Image
            source={{ uri: vendor.coverImageUrl }}
            className="w-full h-40 rounded-2xl"
            resizeMode="cover"
          />
        ) : (
          <View className="w-full h-40 rounded-2xl bg-[#DDEBDD]" />
        )}

        <SectionReveal direction="up" delay={0} distance={15}>
          <View className="bg-white rounded-2xl border border-[#DDEBDD] p-4 -mt-8">
          <View className="flex-row items-center">
            {vendor.logoUrl ? (
              <Image
                source={{ uri: vendor.logoUrl }}
                className="w-14 h-14 rounded-xl mr-3"
                resizeMode="cover"
              />
            ) : (
              <View className="w-14 h-14 rounded-xl mr-3 bg-[#E6F0E6] items-center justify-center">
                <Text className="text-[#1B5E20] font-bold">
                  {vendor.businessName.slice(0, 2).toUpperCase()}
                </Text>
              </View>
            )}
            <View className="flex-1">
              <Text className="text-[#1B5E20] text-lg font-bold">{vendor.businessName}</Text>
              <Text className="text-slate-600 text-xs">
                {vendor.city || "-"}
                {vendor.country ? `, ${vendor.country}` : ""}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-2 mt-4">
            <PressableScale
              className={`flex-1 rounded-xl px-3 py-2 ${
                activeTab === "products" ? "bg-[#1B5E20]" : "bg-[#EAF3EA]"
              }`}
              onPress={() => setActiveTab("products")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "products" ? "text-white" : "text-[#1B5E20]"
                }`}
              >
                {t("vendorProfile.tabs.products")}
              </Text>
            </PressableScale>
            <PressableScale
              className={`flex-1 rounded-xl px-3 py-2 ${
                activeTab === "about" ? "bg-[#1B5E20]" : "bg-[#EAF3EA]"
              }`}
              onPress={() => setActiveTab("about")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "about" ? "text-white" : "text-[#1B5E20]"
                }`}
              >
                {t("vendorProfile.tabs.about")}
              </Text>
            </PressableScale>
            <PressableScale
              className={`flex-1 rounded-xl px-3 py-2 ${
                activeTab === "reviews" ? "bg-[#1B5E20]" : "bg-[#EAF3EA]"
              }`}
              onPress={() => setActiveTab("reviews")}
            >
              <Text
                className={`text-center font-semibold ${
                  activeTab === "reviews" ? "text-white" : "text-[#1B5E20]"
                }`}
              >
                {t("vendorProfile.tabs.reviews")}
              </Text>
            </PressableScale>
          </View>
          </View>
        </SectionReveal>

        {activeTab === "products" ? (
          <View className="mt-4">
            <SectionReveal direction="up" delay={0} distance={15}>
              <PressableScale
                className="rounded-xl px-4 py-3 mb-3 bg-[#1B5E20]"
                onPress={() => setProposalOpen(true)}
                disabled={!activeCooperativeId}
              >
                <Text className="text-white text-center font-semibold">
                  {t("vendorProfile.proposeButton")}
                </Text>
              </PressableScale>
            </SectionReveal>

            {vendor.products.map((product, index) => (
              <SectionReveal key={product.id} direction="up" delay={index * 80} distance={15}>
                <View className="bg-white border border-[#DDEBDD] rounded-xl px-4 py-3 mb-2">
                  <Text className="text-[#1B5E20] font-semibold">{product.title}</Text>
                  <Text className="text-slate-600 mt-1">{product.description}</Text>
                  <Text className="text-[#1B5E20] font-semibold mt-2">
                    {formatXaf(product.priceXAF)}
                    {product.unit ? ` / ${product.unit}` : ""}
                  </Text>
                </View>
              </SectionReveal>
            ))}

            {!vendor.products.length ? (
              <Text className="text-slate-600">{t("vendorProfile.noProducts")}</Text>
            ) : null}
          </View>
        ) : null}

        {activeTab === "about" ? (
          <SectionReveal direction="up" delay={0} distance={15}>
            <View className="mt-4 bg-white border border-[#DDEBDD] rounded-xl px-4 py-3">
            <Text className="text-slate-700">{vendor.description}</Text>
            <View className="mt-3 border-t border-[#E5E7EB] pt-3">
              {hasApprovedVendorInCoop ? (
                <>
                      {vendor.email ? (
                        <Text className="text-slate-600">
                          {t("common.email")}: {vendor.email}
                        </Text>
                      ) : null}
                  {vendor.whatsappNumber ? (
                        <Text className="text-slate-600 mt-1">
                          {t("vendorDashboard.contact.whatsapp")}: {vendor.whatsappNumber}
                        </Text>
                  ) : null}
                  {vendor.website ? (
                        <Text className="text-slate-600 mt-1">
                          {t("vendorDashboard.contact.website")}: {vendor.website}
                        </Text>
                  ) : null}
                </>
              ) : (
                <Text className="text-slate-600">{t("vendorProfile.contactLocked")}</Text>
              )}
            </View>
            </View>
          </SectionReveal>
        ) : null}

        {activeTab === "reviews" ? (
          <View className="mt-4">
            <SectionReveal direction="up" delay={0} distance={15}>
              <PressableScale
                className={`rounded-xl px-4 py-3 mb-3 ${
                  eligibility?.eligible ? "bg-[#1B5E20]" : "bg-slate-300"
                }`}
                onPress={() => setReviewOpen(true)}
                disabled={!eligibility?.eligible}
              >
                <Text className="text-white text-center font-semibold">
                  {t("vendorProfile.leaveReview")}
                </Text>
              </PressableScale>
            </SectionReveal>
            {!eligibility?.eligible && eligibility?.reason ? (
              <Text className="text-slate-600 text-xs mb-2">{eligibility.reason}</Text>
            ) : null}

            {reviews.map((review, index) => (
              <SectionReveal key={review.id} direction="up" delay={index * 80} distance={15}>
                <View className="bg-white border border-[#DDEBDD] rounded-xl px-4 py-3 mb-2">
                  <Text className="text-[#1B5E20] font-semibold">{review.reviewerName}</Text>
                  <Text className="text-slate-600 text-xs mt-0.5">
                    {review.rating.toFixed(1)} / 5
                  </Text>
                  {review.comment ? (
                    <Text className="text-slate-700 mt-2">{review.comment}</Text>
                  ) : null}
                </View>
              </SectionReveal>
            ))}
            {!reviews.length ? (
              <Text className="text-slate-600">{t("vendorProfile.noReviews")}</Text>
            ) : null}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={proposalOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              {t("vendorProfile.proposeButton")}
            </Text>
            <View className="mb-3">
              <Text className="text-[#1B5E20] font-semibold mb-2">
                {t("vendorProfile.selectProduct")}
              </Text>
              <ScrollView className="max-h-40">
                {vendor.products.map((item) => {
                  const isSelected = selectedProductId === item.id;

                  return (
                    <PressableScale
                      key={item.id}
                      className={`rounded-xl border px-3 py-2 mb-2 ${
                        isSelected
                          ? "bg-[#1B5E20] border-[#1B5E20]"
                          : "bg-[#F1F7F1] border-[#CFE3CF]"
                      }`}
                      onPress={() => setSelectedProductId(item.id)}
                    >
                      <Text
                        className={`font-semibold ${
                          isSelected ? "text-white" : "text-[#1B5E20]"
                        }`}
                      >
                        {item.title}
                      </Text>
                    </PressableScale>
                  );
                })}
              </ScrollView>
            </View>

            <TextInput
              value={proposalNote}
              onChangeText={setProposalNote}
              placeholder={t("vendorProfile.proposalNotePlaceholder")}
              multiline
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4 min-h-[96px]"
            />

            <View className="flex-row gap-3">
              <PressableScale
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setProposalOpen(false)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("common.cancel")}
                </Text>
              </PressableScale>
              <PressableScale
                className={`flex-1 rounded-xl py-3 ${
                  !selectedProductId ? "bg-slate-300" : "bg-[#1B5E20]"
                }`}
                onPress={() => {
                  void submitProposal();
                }}
                disabled={!selectedProductId}
              >
                <Text className="text-center text-white font-semibold">
                  {t("common.submit")}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={reviewOpen} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-3">
              {t("vendorProfile.leaveReview")}
            </Text>

            <TextInput
              value={rating}
              onChangeText={setRating}
              keyboardType="numeric"
              placeholder={t("vendorReviewCenter.rating")}
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-3"
            />
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t("vendorReviewCenter.commentPlaceholder")}
              multiline
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4 min-h-[96px]"
            />

            <View className="flex-row gap-3">
              <PressableScale
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setReviewOpen(false)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("common.cancel")}
                </Text>
              </PressableScale>
              <PressableScale
                className="flex-1 rounded-xl py-3 bg-[#1B5E20]"
                onPress={() => {
                  void submitReview();
                }}
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
