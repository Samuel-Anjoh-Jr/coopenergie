"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { useParams } from "next/navigation";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  fetchVendorMonetisationSnapshot,
  fetchVendorProfile,
  fetchVendorSubscriptionHistory,
  formatDate,
  formatXaf,
  VendorSubscriptionRecord,
} from "@/lib/vendor-dashboard";
import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";

export default function VendorSubscriptionPage() {
  const params = useParams();
  const locale = (params.locale as "fr" | "en") || "en";
  const t = useTranslations(locale);
  const { data: session } = useSession();
  const sessionPaymentModel = session?.user?.vendor?.paymentModel;

  const [history, setHistory] = useState<VendorSubscriptionRecord[]>([]);
  const [fees, setFees] = useState({ monthly: 0, yearly: 0, oneTime: 0 });
  const [phoneNumber, setPhoneNumber] = useState("");
  const [billingCycle, setBillingCycle] = useState<"MONTHLY" | "YEARLY">(
    "YEARLY",
  );
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [historyData, monetisation] = await Promise.all([
        fetchVendorSubscriptionHistory(),
        fetchVendorMonetisationSnapshot(),
      ]);
      const vendorId = session?.user?.vendor?.id;
      if (vendorId) {
        const profile = await fetchVendorProfile(vendorId);
        setPhoneNumber((current) => current || profile.whatsappNumber || "");
      }

      setHistory(historyData);
      setFees({
        monthly: Number(monetisation.vendorMonthlyFeeXAF || 0),
        yearly: Number(monetisation.vendorYearlyFeeXAF || 0),
        oneTime: Number(monetisation.vendorOneTimeFeeXAF || 0),
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
  }, [session?.user?.vendor?.id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const amount = useMemo(
    () => (billingCycle === "YEARLY" ? fees.yearly : fees.monthly),
    [billingCycle, fees.monthly, fees.yearly],
  );

  const paymentModel: "ONE_TIME" | "SUBSCRIPTION" = useMemo(() => {
    const candidate = sessionPaymentModel;

    if (candidate === "ONE_TIME" || candidate === "SUBSCRIPTION") {
      return candidate;
    }

    return "SUBSCRIPTION";
  }, [sessionPaymentModel]);

  const hasActiveOneTimePayment = useMemo(
    () =>
      history.some(
        (record) =>
          record.billingCycle === "ONE_TIME" &&
          String(record.status).toUpperCase() === "ACTIVE",
      ),
    [history],
  );

  const effectivePaymentModel: "ONE_TIME" | "SUBSCRIPTION" =
    hasActiveOneTimePayment ? "ONE_TIME" : paymentModel;

  const canStartPayment =
    effectivePaymentModel !== "ONE_TIME" || !hasActiveOneTimePayment;

  const startPayment = async () => {
    if (!phoneNumber.trim()) {
      toast.error(t("vendorDashboard.feedback.phoneRequired"));
      return;
    }

    setProcessing(true);
    try {
      if (effectivePaymentModel === "ONE_TIME") {
        await restClient.post("/vendors/payment/register", {
          phoneNumber: phoneNumber.trim(),
        });
      } else {
        await restClient.post("/vendors/payment/subscribe", {
          phoneNumber: phoneNumber.trim(),
          billingCycle,
        });
      }

      toast.success(t("vendorDashboard.feedback.paymentStarted"));
      await load();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("vendorDashboard.feedback.paymentFailed"),
      );
    } finally {
      setProcessing(false);
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
        <CardHeader>
          <CardTitle>{t("vendorDashboard.subscription.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {effectivePaymentModel === "ONE_TIME"
              ? t("vendorDashboard.subscription.oneTimeMode")
              : t("vendorDashboard.subscription.subscriptionMode")}
          </p>

          {effectivePaymentModel === "SUBSCRIPTION" && (
            <div className="flex gap-2">
              <Button
                variant={billingCycle === "MONTHLY" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("MONTHLY")}
              >
                {t("vendorDashboard.subscription.monthly")}
              </Button>
              <Button
                variant={billingCycle === "YEARLY" ? "default" : "outline"}
                size="sm"
                onClick={() => setBillingCycle("YEARLY")}
              >
                {t("vendorDashboard.subscription.yearly")}
              </Button>
            </div>
          )}

          <div className="rounded-md border border-border/70 p-3 text-sm">
            {t("vendorDashboard.subscription.amount")}:{" "}
            {formatXaf(
              effectivePaymentModel === "ONE_TIME" ? fees.oneTime : amount,
              locale,
            )}
          </div>

          {canStartPayment ? (
            <>
              <Input
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                placeholder={t("vendorDashboard.subscription.phonePlaceholder")}
              />

              <Button onClick={startPayment} disabled={processing}>
                {processing
                  ? t("vendorDashboard.subscription.processing")
                  : t("vendorDashboard.subscription.payNow")}
              </Button>
            </>
          ) : (
            <p className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700">
              {locale === "fr"
                ? "Le paiement d'activation unique est deja valide pour ce compte."
                : "The one-time activation payment is already locked in for this account."}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle>{t("vendorDashboard.subscription.history")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("vendorDashboard.subscription.emptyHistory")}
            </p>
          ) : (
            history.map((record) => (
              <div
                key={record.id}
                className="rounded-md border border-border/70 p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {record.billingCycle} · {formatXaf(record.priceXAF, locale)}
                  </p>
                  <Badge variant="secondary">{record.status}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("vendorDashboard.subscription.createdAt")}:{" "}
                  {formatDate(record.createdAt, locale)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("vendorDashboard.subscription.expiresAt")}:{" "}
                  {formatDate(record.expiresAt, locale)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
