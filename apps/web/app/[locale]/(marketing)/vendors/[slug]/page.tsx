"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { useQuery } from "@apollo/client";
import { toast } from "sonner";

import { StarRating } from "@/components/shared/StarRating";
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

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
  slug: string;
  businessName: string;
  description: string;
  logoUrl?: string | null;
  coverImageUrl?: string | null;
  city?: string | null;
  country?: string | null;
  email?: string | null;
  whatsappNumber?: string | null;
  website?: string | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  avgRating?: number;
  totalReviews?: number;
  products: VendorProduct[];
};

type VendorReview = {
  id: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
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
  proposalId?: string;
  reason?: string;
};

type MyCooperativesData = {
  myCooperatives: Array<{
    id: string;
  }>;
};

function formatXaf(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "fr" ? "fr-CM" : "en-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function PublicVendorProfilePage() {
  const params = useParams();
  const locale = (params.locale as Locale) || "fr";
  const slug = String(params.slug || "");
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [reviews, setReviews] = useState<VendorReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"products" | "about" | "reviews">(
    "products",
  );

  const [proposalOpen, setProposalOpen] = useState(false);
  const [proposalProductId, setProposalProductId] = useState("");
  const [proposalNote, setProposalNote] = useState("");
  const [submittingProposal, setSubmittingProposal] = useState(false);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  const [hasApprovedVendorInCoop, setHasApprovedVendorInCoop] = useState(false);
  const [reviewEligibility, setReviewEligibility] =
    useState<ReviewEligibility | null>(null);

  const { data: myCooperativesData } = useQuery<MyCooperativesData>(
    GET_MY_COOPERATIVES,
    {
      skip: !session?.user,
      fetchPolicy: "cache-and-network",
    },
  );

  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id;

  const loadVendor = useCallback(async () => {
    setLoading(true);
    try {
      const profile = await restClient.get<VendorProfile>(`/vendors/${slug}`);
      setVendor(profile);
      const reviewList = await restClient.get<VendorReview[]>(
        `/vendors/${profile.id}/reviews`,
      );
      setReviews(reviewList);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorProfile.feedback.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [slug, t]);

  const loadEligibilityContext = useCallback(async () => {
    if (!vendor?.id || !cooperativeId || !session?.user?.id) {
      setHasApprovedVendorInCoop(false);
      setReviewEligibility(null);
      return;
    }

    try {
      const [approvedProposals, eligibility] = await Promise.all([
        restClient.get<ApprovedVendorProposal[]>(
          `/vendors/proposals/cooperative/${cooperativeId}/approved-vendor-proposals`,
        ),
        restClient.get<ReviewEligibility>(
          `/vendors/reviews/eligibility?vendorId=${vendor.id}&cooperativeId=${cooperativeId}`,
        ),
      ]);

      setHasApprovedVendorInCoop(
        approvedProposals.some(
          (proposal) => proposal.vendorLink?.vendor?.id === vendor.id,
        ),
      );
      setReviewEligibility(eligibility);
    } catch {
      setHasApprovedVendorInCoop(false);
      setReviewEligibility(null);
    }
  }, [cooperativeId, session?.user?.id, vendor?.id]);

  useEffect(() => {
    if (!slug) {
      return;
    }

    void loadVendor();
  }, [loadVendor, slug]);

  useEffect(() => {
    void loadEligibilityContext();
  }, [loadEligibilityContext]);

  const selectedProduct = useMemo(
    () => vendor?.products.find((product) => product.id === proposalProductId),
    [proposalProductId, vendor?.products],
  );

  const averageRating = useMemo(() => {
    if (!reviews.length) {
      return Number(vendor?.avgRating || 0);
    }

    return (
      reviews.reduce((sum, review) => sum + Number(review.rating || 0), 0) /
      reviews.length
    );
  }, [reviews, vendor?.avgRating]);

  const ratingBreakdown = useMemo(() => {
    const buckets = [5, 4, 3, 2, 1].map((value) => ({ value, count: 0 }));

    for (const review of reviews) {
      const rounded = Math.max(1, Math.min(5, Math.round(review.rating)));
      const bucket = buckets.find((item) => item.value === rounded);
      if (bucket) {
        bucket.count += 1;
      }
    }

    return buckets;
  }, [reviews]);

  async function handleSubmitProposal() {
    if (!vendor || !cooperativeId || !selectedProduct) {
      toast.error(t("vendorProfile.feedback.proposalIncomplete"));
      return;
    }

    setSubmittingProposal(true);
    try {
      await restClient.post("/proposals", {
        cooperativeId,
        title: `${t("vendorProfile.proposalAutoTitle")} ${vendor.businessName} - ${selectedProduct.title}`,
        description:
          proposalNote.trim() || t("vendorProfile.proposalAutoDescription"),
        vendorId: vendor.id,
        productId: selectedProduct.id,
        vendorNote: proposalNote.trim() || undefined,
      });

      toast.success(t("vendorProfile.feedback.proposalCreated"));
      setProposalOpen(false);
      setProposalProductId("");
      setProposalNote("");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorProfile.feedback.proposalFailed"),
      );
    } finally {
      setSubmittingProposal(false);
    }
  }

  async function handleSubmitReview() {
    if (!vendor || !cooperativeId || !reviewEligibility?.eligible) {
      toast.error(t("vendorProfile.feedback.reviewNotEligible"));
      return;
    }

    setSubmittingReview(true);
    try {
      await restClient.post("/vendors/reviews", {
        vendorId: vendor.id,
        cooperativeId,
        rating: reviewRating * 10,
        comment: reviewComment.trim() || undefined,
      });

      const existingOwn = reviews.find(
        (review) => review.reviewerId === session?.user?.id,
      );
      const nowIso = new Date().toISOString();

      const optimistic: VendorReview = {
        id: existingOwn?.id || `tmp-${Date.now()}`,
        reviewerId: session?.user?.id || "self",
        reviewerName: session?.user?.name || t("dashboard.profile"),
        rating: reviewRating,
        comment: reviewComment.trim() || null,
        createdAt: existingOwn?.createdAt || nowIso,
        updatedAt: nowIso,
      };

      setReviews((current) => {
        const withoutOwn = current.filter(
          (review) => review.reviewerId !== session?.user?.id,
        );
        return [optimistic, ...withoutOwn];
      });
      setReviewEligibility({
        eligible: true,
        reason: t("vendorProfile.feedback.reviewSubmitted"),
      });
      setReviewOpen(false);
      setReviewComment("");
      setReviewRating(5);
      toast.success(t("vendorProfile.feedback.reviewSubmitted"));
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorProfile.feedback.reviewFailed"),
      );
    } finally {
      setSubmittingReview(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        {t("vendorProfile.loading")}
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-sm text-muted-foreground">
        {t("vendorProfile.notFound")}
      </div>
    );
  }

  return (
    <main className="pb-16">
      <section className="relative h-56 w-full overflow-hidden border-b border-border/60 bg-muted md:h-72">
        {vendor.coverImageUrl ? (
          <img
            src={vendor.coverImageUrl}
            alt={vendor.businessName}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,rgba(16,185,129,0.18),transparent_62%)]" />
        )}
      </section>

      <div className="mx-auto -mt-12 max-w-6xl px-4 md:-mt-14">
        <ScrollReveal direction="up" threshold={0.1} subtle>
          <Card className="border-border/70">
            <CardContent className="p-5 md:p-7">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center gap-4">
                  {vendor.logoUrl ? (
                    <img
                      src={vendor.logoUrl}
                      alt={vendor.businessName}
                      className="h-16 w-16 rounded-xl object-cover md:h-20 md:w-20"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary md:h-20 md:w-20 md:text-xl">
                      {vendor.businessName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-semibold md:text-3xl">
                      {vendor.businessName}
                    </h1>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <StarRating rating={averageRating} size="sm" />
                      <span>
                        {averageRating.toFixed(1)} (
                        {reviews.length || vendor.totalReviews || 0})
                      </span>
                    </div>
                    {vendor.city ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        {vendor.city}
                        {vendor.country ? `, ${vendor.country}` : ""}
                      </p>
                    ) : null}
                  </div>
                </div>

                <Button
                  onClick={() => setProposalOpen(true)}
                  disabled={!cooperativeId}
                >
                  {t("vendorProfile.proposeToCooperative")}
                </Button>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={activeTab === "products" ? "default" : "outline"}
                  onClick={() => setActiveTab("products")}
                >
                  {t("vendorProfile.tabs.products")}
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "about" ? "default" : "outline"}
                  onClick={() => setActiveTab("about")}
                >
                  {t("vendorProfile.tabs.about")}
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "reviews" ? "default" : "outline"}
                  onClick={() => setActiveTab("reviews")}
                >
                  {t("vendorProfile.tabs.reviews")} (
                  {reviews.length || vendor.totalReviews || 0})
                </Button>
              </div>

              {activeTab === "products" ? (
                <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {vendor.products.map((product, index) => (
                    <ScrollReveal
                      key={product.id}
                      direction="up"
                      delay={index * 80}
                      threshold={0.1}
                      subtle
                    >
                      <Card className="border-border/70">
                        <CardContent className="p-4">
                          {product.images[0] ? (
                            <img
                              src={product.images[0].url}
                              alt={product.images[0].altText || product.title}
                              className="mb-3 h-36 w-full rounded-md object-cover"
                            />
                          ) : null}
                          <h3 className="font-semibold">{product.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {product.description}
                          </p>
                          <p className="mt-3 text-sm font-semibold text-primary">
                            {formatXaf(product.priceXAF, locale)}
                            {product.unit ? ` / ${product.unit}` : ""}
                          </p>
                        </CardContent>
                      </Card>
                    </ScrollReveal>
                  ))}
                  {!vendor.products.length ? (
                    <p className="text-sm text-muted-foreground">
                      {t("vendorProfile.noProducts")}
                    </p>
                  ) : null}
                </div>
              ) : null}

              {activeTab === "about" ? (
                <div className="mt-6 space-y-4">
                  <p className="text-sm text-muted-foreground">
                    {vendor.description}
                  </p>

                  <div className="rounded-lg border border-border/70 p-4">
                    <h3 className="font-semibold">
                      {t("vendorProfile.contactTitle")}
                    </h3>
                    {hasApprovedVendorInCoop ? (
                      <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                        {vendor.email ? (
                          <p>
                            {t("common.email")}: {vendor.email}
                          </p>
                        ) : null}
                        {vendor.whatsappNumber ? (
                          <p>
                            {t("vendorDashboard.contact.whatsapp")}:{" "}
                            {vendor.whatsappNumber}
                          </p>
                        ) : null}
                        {vendor.website ? (
                          <p>
                            {t("vendorProfile.website")}: {vendor.website}
                          </p>
                        ) : null}
                        {vendor.facebookUrl ? (
                          <p className="break-all">
                            Facebook: {vendor.facebookUrl}
                          </p>
                        ) : null}
                        {vendor.instagramUrl ? (
                          <p className="break-all">
                            Instagram: {vendor.instagramUrl}
                          </p>
                        ) : null}
                        {vendor.twitterUrl ? (
                          <p className="break-all">X: {vendor.twitterUrl}</p>
                        ) : null}
                        {vendor.linkedinUrl ? (
                          <p className="break-all">
                            LinkedIn: {vendor.linkedinUrl}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {t("vendorProfile.contactLocked")}
                      </p>
                    )}
                  </div>
                </div>
              ) : null}

              {activeTab === "reviews" ? (
                <div className="mt-6 space-y-5">
                  <div className="grid gap-4 md:grid-cols-[220px_1fr]">
                    <Card className="border-border/70">
                      <CardContent className="p-4 text-center">
                        <p className="text-3xl font-semibold">
                          {averageRating.toFixed(1)}
                        </p>
                        <div className="mt-2 flex justify-center">
                          <StarRating rating={averageRating} size="md" />
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {reviews.length || vendor.totalReviews || 0}{" "}
                          {t("vendorProfile.reviewCount")}
                        </p>
                      </CardContent>
                    </Card>

                    <Card className="border-border/70">
                      <CardContent className="p-4">
                        <p className="mb-3 text-sm font-medium">
                          {t("vendorProfile.breakdownTitle")}
                        </p>
                        <div className="space-y-2">
                          {ratingBreakdown.map((bucket) => {
                            const width = reviews.length
                              ? (bucket.count / reviews.length) * 100
                              : 0;

                            return (
                              <div
                                key={bucket.value}
                                className="flex items-center gap-2 text-xs"
                              >
                                <span className="w-10">{bucket.value}/5</span>
                                <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className="h-2 bg-primary"
                                    style={{ width: `${width}%` }}
                                  />
                                </div>
                                <span className="w-8 text-right text-muted-foreground">
                                  {bucket.count}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      onClick={() => setReviewOpen(true)}
                      disabled={!reviewEligibility?.eligible}
                    >
                      {t("vendorProfile.leaveReview")}
                    </Button>
                    {reviewEligibility?.eligible ? null : (
                      <Badge
                        variant="outline"
                        className="max-w-full text-muted-foreground whitespace-normal wrap-break-word"
                      >
                        {reviewEligibility?.reason ||
                          t("vendorProfile.reviewNotAvailable")}
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <Card key={review.id} className="border-border/70">
                        <CardContent className="p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-medium">{review.reviewerName}</p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <StarRating rating={review.rating} size="sm" />
                              <span>
                                {new Date(review.createdAt).toLocaleDateString(
                                  locale === "fr" ? "fr-CM" : "en-CM",
                                )}
                              </span>
                              {new Date(review.updatedAt).getTime() >
                              new Date(review.createdAt).getTime() ? (
                                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                  {locale === "fr" ? "modifie" : "edited"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          {review.comment ? (
                            <p className="mt-2 text-sm text-muted-foreground">
                              {review.comment}
                            </p>
                          ) : null}
                          <p className="mt-2 text-xs text-muted-foreground">
                            {locale === "fr" ? "Cree le" : "Created"}:{" "}
                            {new Date(review.createdAt).toLocaleString(
                              locale === "fr" ? "fr-CM" : "en-CM",
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {locale === "fr"
                              ? "Derniere modification"
                              : "Last edited"}
                            :{" "}
                            {new Date(review.updatedAt).toLocaleString(
                              locale === "fr" ? "fr-CM" : "en-CM",
                            )}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {!reviews.length ? (
                      <p className="text-sm text-muted-foreground">
                        {t("vendorProfile.noReviews")}
                      </p>
                    ) : null}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </ScrollReveal>
      </div>

      <Dialog open={proposalOpen} onOpenChange={setProposalOpen}>
        <DialogContent className="sm:max-w-xl w-[calc(100%-1rem)] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("vendorProfile.proposalDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("vendorProfile.proposalDialogDescription")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="proposal-product">
              {t("vendorProfile.selectProduct")}
            </label>
            <select
              id="proposal-product"
              value={proposalProductId}
              onChange={(event) => setProposalProductId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">
                {t("vendorProfile.selectProductPlaceholder")}
              </option>
              {vendor.products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.title} — {formatXaf(product.priceXAF, locale)}
                </option>
              ))}
            </select>

            <label className="text-sm font-medium" htmlFor="proposal-note">
              {t("vendorProfile.proposalNote")}
            </label>
            <Textarea
              id="proposal-note"
              value={proposalNote}
              onChange={(event) => setProposalNote(event.target.value)}
              placeholder={t("vendorProfile.proposalNotePlaceholder")}
              className="min-h-24"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setProposalOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleSubmitProposal()}
                disabled={!proposalProductId || submittingProposal}
              >
                {submittingProposal ? <Spinner className="mr-2" /> : null}
                {t("common.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("vendorProfile.reviewDialogTitle")}</DialogTitle>
            <DialogDescription>
              {t("vendorProfile.reviewDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <label className="text-sm font-medium" htmlFor="review-rating">
              {t("vendorProfile.rating")}
            </label>
            <Input
              id="review-rating"
              type="number"
              min={1}
              max={5}
              value={String(reviewRating)}
              onChange={(event) => {
                const value = Number(event.target.value || 5);
                setReviewRating(Math.max(1, Math.min(5, value)));
              }}
            />

            <label className="text-sm font-medium" htmlFor="review-comment">
              {t("vendorProfile.comment")}
            </label>
            <Textarea
              id="review-comment"
              value={reviewComment}
              onChange={(event) => setReviewComment(event.target.value)}
              placeholder={t("vendorProfile.commentPlaceholder")}
              className="min-h-24"
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleSubmitReview()}
                disabled={submittingReview}
              >
                {submittingReview ? <Spinner className="mr-2" /> : null}
                {t("common.submit")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
