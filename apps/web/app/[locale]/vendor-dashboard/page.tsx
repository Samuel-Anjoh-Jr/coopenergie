"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

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
import { ScrollReveal } from "@/components/shared/ScrollReveal";
import { restClient } from "@/lib/rest-client";
import {
  fetchVendorDashboardStats,
  fetchVendorMonetisationSnapshot,
  fetchVendorProfile,
  fetchVendorReviews,
  formatDate,
  formatXaf,
  VendorDashboardStats,
  VendorReview,
} from "@/lib/vendor-dashboard";
import { useTranslations } from "@/lib/translations";

export default function VendorDashboardOverviewPage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();

  const vendorId = session?.user?.vendor?.id;
  const paymentModel = session?.user?.vendor?.paymentModel;

  const [stats, setStats] = useState<VendorDashboardStats | null>(null);
  const [recentReviews, setRecentReviews] = useState<VendorReview[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [loading, setLoading] = useState(true);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "MONTHLY",
  );
  const [paying, setPaying] = useState(false);
  const [fees, setFees] = useState({
    oneTime: 0,
    monthly: 0,
    yearly: 0,
  });

  const loadData = useCallback(async () => {
    if (!vendorId) {
      return;
    }

    setLoading(true);
    try {
      const [statsData, reviewsData, profile, monetisation] = await Promise.all(
        [
          fetchVendorDashboardStats(),
          fetchVendorReviews(vendorId),
          fetchVendorProfile(vendorId),
          fetchVendorMonetisationSnapshot(),
        ],
      );

      setStats(statsData);
      setRecentReviews(reviewsData.slice(0, 4));
      setBusinessName(profile.businessName);
      setFees({
        oneTime: Number(monetisation.vendorOneTimeFeeXAF || 0),
        monthly: Number(monetisation.vendorMonthlyFeeXAF || 0),
        yearly: Number(monetisation.vendorYearlyFeeXAF || 0),
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t, vendorId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const statusLabel = useMemo(() => {
    switch (stats?.accountStatus) {
      case "ACTIVE":
        return t("vendorDashboard.status.active");
      case "PENDING_PAYMENT":
        return t("vendorDashboard.status.pendingPayment");
      case "SUBSCRIPTION_EXPIRED":
        return t("vendorDashboard.status.subscriptionExpired");
      case "SUSPENDED":
        return t("vendorDashboard.status.suspended");
      default:
        return "-";
    }
  }, [stats?.accountStatus, t]);

  const paymentNeeded =
    stats?.accountStatus === "PENDING_PAYMENT" ||
    stats?.accountStatus === "SUBSCRIPTION_EXPIRED";

  const paymentAmount =
    paymentModel === "ONE_TIME"
      ? fees.oneTime
      : billingCycle === "YEARLY"
        ? fees.yearly
        : fees.monthly;

  const handlePayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t("vendorDashboard.feedback.phoneRequired"));
      return;
    }

    setPaying(true);
    try {
      const endpoint =
        paymentModel === "ONE_TIME"
          ? "/vendors/payment/register"
          : "/vendors/payment/subscribe";
      const payload =
        paymentModel === "ONE_TIME"
          ? { phoneNumber: phoneNumber.trim() }
          : { phoneNumber: phoneNumber.trim(), billingCycle };

      await restClient.post(endpoint, payload);

      toast.success(t("vendorDashboard.feedback.paymentStarted"));
      setShowPaymentDialog(false);
      setPhoneNumber("");
      setTimeout(() => {
        void loadData();
      }, 1500);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.paymentFailed"),
      );
    } finally {
      setPaying(false);
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-sm text-muted-foreground">
        {t("vendorDashboard.loading")}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/70">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{t("vendorDashboard.overview.title")}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {t("vendorDashboard.overview.subtitle").replace(
                "{name}",
                businessName || "-",
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {vendorId ? (
              <Link href={`/${locale}/vendors/${vendorId}`}>
                <Button variant="outline" size="sm">
                  {t("vendorDashboard.overview.previewProfile")}
                </Button>
              </Link>
            ) : null}
            <Badge variant="secondary">{statusLabel}</Badge>
          </div>
        </CardHeader>

        <CardContent>
          {paymentNeeded && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
              <p className="font-medium text-amber-900">
                {t("vendorDashboard.overview.paymentRequiredTitle")}
              </p>
              <p className="mt-1 text-amber-800">
                {paymentModel === "ONE_TIME"
                  ? t("vendorDashboard.overview.oneTimePaymentHint")
                  : t("vendorDashboard.overview.subscriptionPaymentHint")}
              </p>

              {paymentModel === "SUBSCRIPTION" && (
                <div className="mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant={billingCycle === "MONTHLY" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBillingCycle("MONTHLY")}
                  >
                    {t("vendorDashboard.subscription.monthly")}
                  </Button>
                  <Button
                    type="button"
                    variant={billingCycle === "YEARLY" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setBillingCycle("YEARLY")}
                  >
                    {t("vendorDashboard.subscription.yearly")}
                  </Button>
                </div>
              )}

              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="font-medium">
                  {t("vendorDashboard.overview.amountLabel")}:{" "}
                  {formatXaf(paymentAmount, locale)}
                </span>
                <Button size="sm" onClick={() => setShowPaymentDialog(true)}>
                  {t("vendorDashboard.overview.payNow")}
                </Button>
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ScrollReveal direction="up" delay={0} threshold={0.1} subtle>
              <StatCard
                label={t("vendorDashboard.overview.totalProducts")}
                value={String(stats?.totalProducts ?? 0)}
              />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={80} threshold={0.1} subtle>
              <StatCard
                label={t("vendorDashboard.overview.totalProposalsReceived")}
                value={String(stats?.totalProposalsReceived ?? 0)}
              />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={160} threshold={0.1} subtle>
              <StatCard
                label={t("vendorDashboard.overview.totalAcceptedProposals")}
                value={String(stats?.totalAcceptedProposals ?? 0)}
              />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={240} threshold={0.1} subtle>
              <StatCard
                label={t("vendorDashboard.overview.avgRating")}
                value={`${Number(stats?.avgRating || 0).toFixed(1)} / 5`}
              />
            </ScrollReveal>
          </div>

          <div className="mt-4 rounded-md border border-border/70 p-3 text-sm text-muted-foreground">
            <strong className="text-foreground">
              {t("vendorDashboard.overview.subscriptionExpiresAt")}
            </strong>
            : {formatDate(stats?.subscriptionExpiresAt ?? null, locale)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("vendorDashboard.overview.recentReviews")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentReviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("vendorDashboard.overview.noReviews")}
            </p>
          ) : (
            recentReviews.map((review) => (
              <div
                key={review.id}
                className="rounded-md border border-border/70 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="font-medium">{review.reviewerName}</p>
                  <p className="text-sm text-muted-foreground">
                    {review.rating.toFixed(1)} / 5
                  </p>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {review.comment || t("vendorDashboard.overview.emptyComment")}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("vendorDashboard.overview.paymentDialogTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("vendorDashboard.overview.paymentDialogDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-md bg-muted p-3 text-sm">
              {t("vendorDashboard.overview.amountLabel")}:{" "}
              {formatXaf(paymentAmount, locale)}
            </div>
            <Input
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder={t("vendorDashboard.overview.phonePlaceholder")}
            />
            <Button
              className="w-full"
              onClick={handlePayment}
              disabled={paying}
            >
              {paying
                ? t("vendorDashboard.overview.processing")
                : t("vendorDashboard.overview.confirmPayment")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 overflow-hidden rounded-md border border-border/70 bg-card p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground wrap-anywhere">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold wrap-anywhere">{value}</p>
    </div>
  );
}
