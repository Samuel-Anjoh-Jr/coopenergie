import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import { getUser } from "@/lib/auth";
import { getVendorReviews, VendorReview } from "@/lib/vendor-dashboard";
import { useMobileTranslations } from "@/lib/translations";

function stars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

export default function VendorReviewsScreen() {
  const { t } = useMobileTranslations();
  const user = getUser();
  const vendorId = user?.vendor?.id;

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState<VendorReview[]>([]);

  const load = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const data = await getVendorReviews(vendorId);
      setReviews(data);
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

  const average = useMemo(() => {
    if (!reviews.length) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  return (
    <ScrollView className="flex-1 bg-[#F5F8F5] px-4 py-4">
      <Text className="mb-1 text-xl font-semibold text-[#111827]">
        {t("vendorDashboard.reviews.title")}
      </Text>
      <Text className="mb-3 text-sm text-[#6B7280]">
        {t("vendorDashboard.reviews.average")}: {average.toFixed(1)} / 5 ({reviews.length})
      </Text>

      {loading ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.common.loading")}</Text>
      ) : reviews.length === 0 ? (
        <Text className="text-[#6B7280]">{t("vendorDashboard.reviews.noReviews")}</Text>
      ) : (
        reviews.map((review) => (
          <View key={review.id} className="mb-3 rounded-xl bg-white p-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-semibold text-[#111827]">{review.reviewerName}</Text>
              <Text className="text-[#B45309]">{stars(review.rating)}</Text>
            </View>
            <Text className="mt-1 text-sm text-[#4B5563]">{review.comment || t("vendorDashboard.reviews.noComment")}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}
