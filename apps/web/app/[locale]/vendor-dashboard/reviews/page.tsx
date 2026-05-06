"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchVendorReviews, VendorReview } from "@/lib/vendor-dashboard";
import { useTranslations } from "@/lib/translations";

function renderStars(rating: number) {
  const rounded = Math.max(0, Math.min(5, Math.round(rating)));
  return `${"★".repeat(rounded)}${"☆".repeat(5 - rounded)}`;
}

export default function VendorReviewsPage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const vendorId = session?.user?.vendor?.id;

  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const data = await fetchVendorReviews(vendorId);
      setReviews(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("vendorDashboard.feedback.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const avg = useMemo(() => {
    if (reviews.length === 0) {
      return 0;
    }

    const total = reviews.reduce((sum, review) => sum + review.rating, 0);
    return total / reviews.length;
  }, [reviews]);

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">{t("vendorDashboard.loading")}</div>;
  }

  return (
    <Card className="border-border/70">
      <CardHeader>
        <CardTitle>{t("vendorDashboard.reviews.title")}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("vendorDashboard.reviews.average")}: {avg.toFixed(1)} / 5 ({reviews.length})
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {reviews.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("vendorDashboard.reviews.empty")}</p>
        ) : (
          reviews.map((review) => (
            <div key={review.id} className="rounded-md border border-border/70 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="font-medium">{review.reviewerName}</p>
                <p className="text-amber-600">{renderStars(review.rating)}</p>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {review.comment || t("vendorDashboard.reviews.emptyComment")}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
