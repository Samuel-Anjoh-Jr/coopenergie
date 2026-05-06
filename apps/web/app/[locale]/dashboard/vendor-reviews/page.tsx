"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { toast } from "sonner";

import { StarRating } from "@/components/shared/StarRating";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";
import { useSelectedCooperative } from "@/lib/use-selected-cooperative";

type ApprovedVendorProposal = {
  id: string;
  updatedAt: string;
  vendorLink?: {
    vendor?: {
      id: string;
      businessName: string;
      logoUrl?: string | null;
    } | null;
  } | null;
};

type VendorReview = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
};

type ReviewEligibility = {
  eligible: boolean;
  reason?: string;
};

type VendorCardModel = {
  vendorId: string;
  vendorName: string;
  vendorLogoUrl?: string | null;
  proposalsCount: number;
  latestProposalAt: string;
};

export default function DashboardVendorReviewsPage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "fr";
  const t = useTranslations(locale);
  const { data: session } = useSession();

  const { activeCoopId: cooperativeId } = useSelectedCooperative({
    skip: !session?.user,
    fetchPolicy: "cache-and-network",
  });

  const [vendors, setVendors] = useState<VendorCardModel[]>([]);
  const [reviewsByVendor, setReviewsByVendor] = useState<
    Record<string, VendorReview[]>
  >({});
  const [eligibilityByVendor, setEligibilityByVendor] = useState<
    Record<string, ReviewEligibility>
  >({});
  const [loading, setLoading] = useState(true);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [activeVendorId, setActiveVendorId] = useState<string | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!cooperativeId || !session?.user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const approved = await restClient.get<ApprovedVendorProposal[]>(
        `/vendors/proposals/cooperative/${cooperativeId}/approved-vendor-proposals`,
      );

      const grouped = new Map<string, VendorCardModel>();
      for (const proposal of approved) {
        const vendor = proposal.vendorLink?.vendor;
        if (!vendor?.id) {
          continue;
        }

        const existing = grouped.get(vendor.id);
        if (existing) {
          existing.proposalsCount += 1;
          if (
            new Date(proposal.updatedAt) > new Date(existing.latestProposalAt)
          ) {
            existing.latestProposalAt = proposal.updatedAt;
          }
          continue;
        }

        grouped.set(vendor.id, {
          vendorId: vendor.id,
          vendorName: vendor.businessName,
          vendorLogoUrl: vendor.logoUrl,
          proposalsCount: 1,
          latestProposalAt: proposal.updatedAt,
        });
      }

      const vendorList = Array.from(grouped.values()).sort(
        (a, b) =>
          new Date(b.latestProposalAt).getTime() -
          new Date(a.latestProposalAt).getTime(),
      );
      setVendors(vendorList);

      const [reviewEntries, eligibilityEntries] = await Promise.all([
        Promise.all(
          vendorList.map(async (item) => {
            const reviews = await restClient.get<VendorReview[]>(
              `/vendors/${item.vendorId}/reviews?cooperativeId=${cooperativeId}`,
            );

            return [item.vendorId, reviews] as const;
          }),
        ),
        Promise.all(
          vendorList.map(async (item) => {
            try {
              const eligibility = await restClient.get<ReviewEligibility>(
                `/vendors/reviews/eligibility?vendorId=${item.vendorId}&cooperativeId=${cooperativeId}`,
              );
              return [item.vendorId, eligibility] as const;
            } catch {
              return [item.vendorId, { eligible: false }] as const;
            }
          }),
        ),
      ]);

      setReviewsByVendor(Object.fromEntries(reviewEntries));
      setEligibilityByVendor(Object.fromEntries(eligibilityEntries));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorReviewCenter.feedback.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [cooperativeId, session?.user?.id, t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeVendor = useMemo(
    () => vendors.find((item) => item.vendorId === activeVendorId) || null,
    [activeVendorId, vendors],
  );

  async function handleSubmitReview() {
    if (!cooperativeId || !activeVendorId) {
      return;
    }

    setSubmitting(true);
    try {
      await restClient.post("/vendors/reviews", {
        vendorId: activeVendorId,
        cooperativeId,
        rating: rating * 10,
        comment: comment.trim() || undefined,
      });

      setReviewsByVendor((current) => {
        const existing = current[activeVendorId] || [];
        return {
          ...current,
          [activeVendorId]: [
            {
              id: `tmp-${Date.now()}`,
              reviewerId: session?.user?.id || "self",
              reviewerName:
                session?.user?.name || t("vendorReviewCenter.selfLabel"),
              rating,
              comment: comment.trim() || null,
              createdAt: new Date().toISOString(),
            },
            ...existing,
          ],
        };
      });

      setEligibilityByVendor((current) => ({
        ...current,
        [activeVendorId]: {
          eligible: false,
          reason: t("vendorReviewCenter.feedback.reviewSubmitted"),
        },
      }));

      setReviewOpen(false);
      setComment("");
      setRating(5);
      toast.success(t("vendorReviewCenter.feedback.reviewSubmitted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorReviewCenter.feedback.reviewFailed"),
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">
          {t("vendorReviewCenter.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("vendorReviewCenter.description")}
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("vendorReviewCenter.loading")}
          </CardContent>
        </Card>
      ) : null}

      {!loading && !vendors.length ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            {t("vendorReviewCenter.empty")}
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {vendors.map((vendor) => {
          const vendorReviews = reviewsByVendor[vendor.vendorId] || [];
          const ownReview = vendorReviews.find(
            (item) => item.reviewerId === session?.user?.id,
          );
          const average = vendorReviews.length
            ? vendorReviews.reduce((sum, item) => sum + item.rating, 0) /
              vendorReviews.length
            : 0;
          const eligibility = eligibilityByVendor[vendor.vendorId];

          return (
            <Card key={vendor.vendorId} className="border-border/70">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  {vendor.vendorLogoUrl ? (
                    <img
                      src={vendor.vendorLogoUrl}
                      alt={vendor.vendorName}
                      className="h-11 w-11 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold">
                      {vendor.vendorName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <CardTitle className="text-base">
                      {vendor.vendorName}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("vendorReviewCenter.approvedProposals")}:{" "}
                      {vendor.proposalsCount}
                    </p>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <StarRating rating={average} size="sm" />
                  <span className="text-muted-foreground">
                    {average.toFixed(1)} ({vendorReviews.length})
                  </span>
                </div>

                {ownReview ? (
                  <div className="rounded-md border border-border/70 p-3">
                    <p className="text-sm font-medium">
                      {t("vendorReviewCenter.yourReview")}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {ownReview.rating.toFixed(1)} / 5
                    </p>
                    {ownReview.comment ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {ownReview.comment}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("vendorReviewCenter.noReviewYet")}
                  </p>
                )}

                <div className="flex flex-wrap gap-2">
                  <Link href={`/${locale}/vendors/${vendor.vendorId}`}>
                    <Button variant="outline">
                      {t("vendorReviewCenter.openVendor")}
                    </Button>
                  </Link>
                  <Button
                    onClick={() => {
                      setActiveVendorId(vendor.vendorId);
                      setReviewOpen(true);
                    }}
                    disabled={!eligibility?.eligible}
                  >
                    {t("vendorReviewCenter.leaveReview")}
                  </Button>
                </div>

                {!eligibility?.eligible && eligibility?.reason ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-muted-foreground"
                  >
                    {eligibility.reason}
                  </Badge>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("vendorReviewCenter.dialogTitle")}</DialogTitle>
            <DialogDescription>
              {activeVendor?.vendorName || "-"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="rating">
              {t("vendorReviewCenter.rating")}
            </label>
            <Input
              id="rating"
              type="number"
              min={1}
              max={5}
              value={String(rating)}
              onChange={(event) => {
                const value = Number(event.target.value || 5);
                setRating(Math.max(1, Math.min(5, value)));
              }}
            />

            <label className="text-sm font-medium" htmlFor="comment">
              {t("vendorReviewCenter.comment")}
            </label>
            <Textarea
              id="comment"
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder={t("vendorReviewCenter.commentPlaceholder")}
              className="min-h-24"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleSubmitReview()}
                disabled={submitting}
              >
                {submitting ? <Spinner className="mr-2" /> : null}
                {t("common.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
