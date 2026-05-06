import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
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
import { ScreenReveal } from "@/components/screen-reveal";
import { StarRatingMobile } from "@/components/shared/StarRatingMobile";
import { api } from "@/lib/api";
import { useActiveCooperative } from "@/lib/dashboard";
import { useMobileTranslations } from "@/lib/translations";

type ApprovedVendorProposal = {
  id: string;
  vendorLink?: {
    vendor?: {
      id: string;
      businessName: string;
      logoUrl?: string | null;
      avgRating?: number | null;
      totalReviews?: number | null;
    } | null;
  } | null;
};

type VendorReview = {
  id: string;
  reviewerId?: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
};

type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
};

type VendorItem = {
  id: string;
  name: string;
  logoUrl?: string | null;
  avgRating: number;
  totalReviews: number;
  approvedCount: number;
};

function normalizeReviewRating(raw: number) {
  return raw > 5 ? raw / 10 : raw;
}

function StarSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <View className="flex-row items-center gap-3">
      {Array.from({ length: 5 }).map((_, index) => {
        const fullValue = index + 1;

        return (
          <Pressable
            key={`star-${fullValue}`}
            onPress={() => onChange(fullValue)}
            onLongPress={() => onChange(Math.max(0.5, fullValue - 0.5))}
            className="p-1"
          >
            <StarRatingMobile rating={Math.max(0, Math.min(1, value - index))} size={26} />
          </Pressable>
        );
      })}
      <Text className="text-[#1B5E20] font-semibold">{value.toFixed(1)} / 5</Text>
    </View>
  );
}

export default function VendorReviewsScreen() {
  const router = useRouter();
  const { t } = useMobileTranslations();
  const { activeCooperativeId } = useActiveCooperative();

  const [loading, setLoading] = useState(true);
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [reviewsMap, setReviewsMap] = useState<Record<string, VendorReview[]>>({});
  const [eligibilityMap, setEligibilityMap] = useState<
    Record<string, ReviewEligibility>
  >({});
  const [openVendorId, setOpenVendorId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2200);
  }, []);

  const loadData = useCallback(async () => {
    if (!activeCooperativeId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const proposals = await api.get<ApprovedVendorProposal[]>(
        `/vendors/proposals/cooperative/${activeCooperativeId}/approved-vendor-proposals`,
      );

      const grouped = new Map<string, VendorItem>();
      for (const proposal of proposals) {
        const vendor = proposal.vendorLink?.vendor;
        if (!vendor?.id) {
          continue;
        }

        const existing = grouped.get(vendor.id);
        if (existing) {
          existing.approvedCount += 1;
          continue;
        }

        grouped.set(vendor.id, {
          id: vendor.id,
          name: vendor.businessName,
          logoUrl: vendor.logoUrl,
          avgRating: vendor.avgRating ?? 0,
          totalReviews: vendor.totalReviews ?? 0,
          approvedCount: 1,
        });
      }

      const vendorList = Array.from(grouped.values());
      setVendors(vendorList);

      const [reviewsEntries, eligibilityEntries] = await Promise.all([
        Promise.all(
          vendorList.map(async (vendor) => {
            const reviews = await api.get<VendorReview[]>(
              `/vendors/${vendor.id}/reviews?cooperativeId=${activeCooperativeId}`,
            );
            return [vendor.id, reviews] as const;
          }),
        ),
        Promise.all(
          vendorList.map(async (vendor) => {
            try {
              const eligibility = await api.get<ReviewEligibility>(
                `/vendors/reviews/eligibility?vendorId=${vendor.id}&cooperativeId=${activeCooperativeId}`,
              );
              return [vendor.id, eligibility] as const;
            } catch {
              return [vendor.id, { eligible: false }] as const;
            }
          }),
        ),
      ]);

      setReviewsMap(Object.fromEntries(reviewsEntries));
      setEligibilityMap(Object.fromEntries(eligibilityEntries));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("vendorProfile.feedback.profileFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [activeCooperativeId, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeVendor = useMemo(
    () => vendors.find((item) => item.id === openVendorId) || null,
    [openVendorId, vendors],
  );

  const ownReview = useMemo(() => {
    if (!openVendorId) {
      return null;
    }

    return (reviewsMap[openVendorId] || [])[0] ?? null;
  }, [openVendorId, reviewsMap]);

  async function submitReview() {
    if (!openVendorId || !activeCooperativeId) {
      return;
    }

    try {
      setSubmitting(true);
      await api.post("/vendors/reviews", {
        vendorId: openVendorId,
        cooperativeId: activeCooperativeId,
        rating: Math.round(rating * 10),
        comment: comment.trim() || undefined,
      });

      setReviewsMap((current) => ({
        ...current,
        [openVendorId]: [
          {
            id: `tmp-${Date.now()}`,
            reviewerName: t("vendorReviewCenter.selfLabel"),
            rating,
            comment: comment.trim() || null,
          },
          ...(current[openVendorId] || []),
        ],
      }));
      setEligibilityMap((current) => ({
        ...current,
        [openVendorId]: {
          eligible: false,
          reason: t("vendorProfile.feedback.reviewSent"),
        },
      }));

      setOpenVendorId(null);
      setRating(5);
      setComment("");
      showToast(t("vendorProfile.feedback.reviewSent"));
    } catch (error) {
      Alert.alert(
        t("errors.error"),
        error instanceof Error ? error.message : t("errors.voteFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ScreenReveal className="bg-[#F5F8F5] p-4">
        <View className="flex-row items-center gap-3">
          <ActivityIndicator color="#1B5E20" />
          <Text className="text-slate-600">{t("vendorReviewCenter.loading")}</Text>
        </View>
      </ScreenReveal>
    );
  }

  return (
    <ScreenReveal className="bg-[#F5F8F5] p-4">
      <Text className="text-[#1B5E20] text-lg font-bold mb-3">{t("vendorReviewCenter.title")}</Text>

      {!vendors.length ? (
        <View className="bg-white border border-[#DDEBDD] rounded-xl px-4 py-3">
          <Text className="text-slate-600">{t("vendorReviewCenter.empty")}</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
          {vendors.map((vendor) => {
            const reviews = reviewsMap[vendor.id] || [];
            const eligibility = eligibilityMap[vendor.id];
            const selfReview = reviews[0];

            return (
              <View
                key={vendor.id}
                className="bg-white border border-[#DDEBDD] rounded-xl px-4 py-3 mb-3"
              >
                <View className="flex-row items-center">
                  {vendor.logoUrl ? (
                    <Image
                      source={{ uri: vendor.logoUrl }}
                      className="w-11 h-11 rounded-lg mr-3"
                      resizeMode="cover"
                    />
                  ) : (
                    <View className="w-11 h-11 rounded-lg mr-3 bg-[#E6F0E6] items-center justify-center">
                      <Text className="text-[#1B5E20] font-bold text-xs">
                        {vendor.name.slice(0, 2).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View className="flex-1">
                    <Text className="text-[#1B5E20] font-semibold">{vendor.name}</Text>
                    <View className="flex-row items-center gap-2 mt-0.5">
                      <StarRatingMobile rating={vendor.avgRating} size={14} />
                      <Text className="text-slate-500 text-xs">
                        {vendor.avgRating.toFixed(1)} ({vendor.totalReviews})
                      </Text>
                    </View>
                    <Text className="text-slate-500 text-xs mt-0.5">
                      {vendor.approvedCount} {t("vendorReviewCenter.approvedLabel")}
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-2 mt-3">
                  <PressableScale
                    className="flex-1 rounded-lg border border-[#9CC59C] px-3 py-2"
                    onPress={() =>
                      router.push({ pathname: "/(dashboard)/vendors/[id]", params: { id: vendor.id } })
                    }
                  >
                    <Text className="text-center text-[#1B5E20] text-xs font-semibold">
                      {t("vendorReviewCenter.openProfile")}
                    </Text>
                  </PressableScale>
                  <PressableScale
                    className={`flex-1 rounded-lg px-3 py-2 ${
                      eligibility?.eligible ? "bg-[#1B5E20]" : "bg-slate-300"
                    }`}
                    onPress={() => setOpenVendorId(vendor.id)}
                    disabled={!eligibility?.eligible}
                  >
                    <Text className="text-center text-white text-xs font-semibold">
                      {t("vendorReviewCenter.leaveReview")}
                    </Text>
                  </PressableScale>
                </View>

                {!eligibility?.eligible && eligibility?.reason ? (
                  <Text className="text-slate-500 text-xs mt-2">{eligibility.reason}</Text>
                ) : null}

                {selfReview ? (
                  <View className="mt-3 border-t border-[#E5E7EB] pt-2">
                    <Text className="text-xs text-[#1B5E20] font-semibold">
                      {t("vendorReviewCenter.yourReview")}
                    </Text>
                    <View className="mt-1">
                      <StarRatingMobile rating={normalizeReviewRating(selfReview.rating)} size={14} />
                    </View>
                    {selfReview.comment ? (
                      <Text className="text-slate-700 text-sm mt-1">{selfReview.comment}</Text>
                    ) : null}
                  </View>
                ) : (
                  <Text className="text-slate-500 text-xs mt-2">{t("vendorReviewCenter.noReview")}</Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      <Modal visible={Boolean(openVendorId)} transparent animationType="fade">
        <View className="flex-1 bg-black/30 justify-center px-6">
          <View className="bg-white rounded-2xl p-5 border border-[#DDEBDD]">
            <Text className="text-[#1B5E20] text-lg font-bold mb-2">{activeVendor?.name || "-"}</Text>

            <Text className="text-[#1B5E20] font-semibold mb-2">{t("vendorReviewCenter.rating")}</Text>
            <StarSelector value={rating} onChange={setRating} />

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder={t("vendorReviewCenter.commentPlaceholder")}
              multiline
              className="bg-[#F1F7F1] border border-[#CFE3CF] rounded-xl px-4 py-3 mb-4 min-h-[90px] mt-3"
            />

            {ownReview ? (
              <View className="rounded-xl bg-[#F7FAF7] border border-[#DDEBDD] px-3 py-2 mb-4">
                <Text className="text-[#1B5E20] font-semibold text-xs">
                  {t("vendorReviewCenter.yourReview")}
                </Text>
                <View className="mt-1">
                  <StarRatingMobile rating={normalizeReviewRating(ownReview.rating)} size={13} />
                </View>
              </View>
            ) : null}

            <View className="flex-row gap-3">
              <PressableScale
                className="flex-1 border border-[#1B5E20] rounded-xl py-3"
                onPress={() => setOpenVendorId(null)}
              >
                <Text className="text-center text-[#1B5E20] font-semibold">
                  {t("common.cancel")}
                </Text>
              </PressableScale>
              <PressableScale
                className={`flex-1 rounded-xl py-3 ${submitting ? "bg-slate-300" : "bg-[#1B5E20]"}`}
                onPress={() => {
                  void submitReview();
                }}
                disabled={submitting}
              >
                <Text className="text-center text-white font-semibold">
                  {t("common.submit")}
                </Text>
              </PressableScale>
            </View>
          </View>
        </View>
      </Modal>

      {toastMessage ? (
        <View className="absolute top-3 left-4 right-4 rounded-xl bg-[#1B5E20] px-4 py-3">
          <Text className="text-white text-center font-semibold text-sm">{toastMessage}</Text>
        </View>
      ) : null}
    </ScreenReveal>
  );
}
