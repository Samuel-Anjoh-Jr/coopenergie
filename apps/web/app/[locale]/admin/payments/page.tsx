"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { BanknoteArrowDown, BadgeCent, CreditCard, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAdminRealtime } from "@/lib/admin-realtime";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type MonetisationSettings = {
  withdrawalFeePercent: number;
  vendorPaymentModel: "ONE_TIME" | "SUBSCRIPTION";
  vendorOneTimeFeeXAF: number;
  vendorMonthlyFeeXAF: number;
  vendorYearlyFeeXAF: number;
};

type PaymentsInsights = {
  overview: {
    withdrawalFeesDisbursedXAF: number;
    vendorPaymentsCollectedXAF: number;
    totalRevenueXAF: number;
    activeVendorSubscriptions: number;
  };
  withdrawalFees: Array<{
    id: string;
    amountXAF: number;
    platformFeeXAF: number;
    status: string;
    destinationType: string;
    recipientName: string;
    createdAt: string;
    disbursedAt: string | null;
    cooperative: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
  vendorPayments: Array<{
    id: string;
    billingCycle: string;
    priceXAF: number;
    status: string;
    campayReference: string | null;
    createdAt: string;
    startedAt: string | null;
    expiresAt: string | null;
    vendor: {
      id: string;
      businessName: string;
      slug: string;
    };
  }>;
};

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-CM", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Date(value).toLocaleDateString("fr-CM", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function AdminPaymentsPage() {
  const params = useParams();
  const locale = ((params.locale as string) || "fr") as Locale;
  const t = useTranslations(locale);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [insights, setInsights] = useState<PaymentsInsights | null>(null);
  const [settings, setSettings] = useState<MonetisationSettings | null>(null);

  const [withdrawalFeePercent, setWithdrawalFeePercent] = useState(0);
  const [vendorPaymentModel, setVendorPaymentModel] = useState<
    "ONE_TIME" | "SUBSCRIPTION"
  >("ONE_TIME");
  const [vendorOneTimeFeeXAF, setVendorOneTimeFeeXAF] = useState(0);
  const [vendorMonthlyFeeXAF, setVendorMonthlyFeeXAF] = useState(0);
  const [vendorYearlyFeeXAF, setVendorYearlyFeeXAF] = useState(0);
  const [withdrawalsPage, setWithdrawalsPage] = useState(1);
  const [vendorPaymentsPage, setVendorPaymentsPage] = useState(1);
  const pageSize = 10;

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [insightsData, monetisationData] = await Promise.all([
        restClient.get<PaymentsInsights>("/admin/payments-insights"),
        restClient.get<MonetisationSettings>("/admin/monetisation"),
      ]);

      setInsights(insightsData);
      setSettings(monetisationData);
      setWithdrawalFeePercent(Number(monetisationData.withdrawalFeePercent ?? 0));
      setVendorPaymentModel(monetisationData.vendorPaymentModel ?? "ONE_TIME");
      setVendorOneTimeFeeXAF(Number(monetisationData.vendorOneTimeFeeXAF ?? 0));
      setVendorMonthlyFeeXAF(Number(monetisationData.vendorMonthlyFeeXAF ?? 0));
      setVendorYearlyFeeXAF(Number(monetisationData.vendorYearlyFeeXAF ?? 0));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("adminPayments.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData(true);
  }, [loadData]);

  useAdminRealtime(() => {
    void loadData();
  });

  const withdrawalItems = insights?.withdrawalFees ?? [];
  const vendorPaymentItems = insights?.vendorPayments ?? [];
  const withdrawalsPageCount = Math.max(1, Math.ceil(withdrawalItems.length / pageSize));

  const mapStatusLabel = useCallback(
    (status: string) => {
      const normalized = status.toLowerCase();

      if (normalized === "disbursed") {
        return t("adminPayments.status.disbursed");
      }

      if (normalized === "pending") {
        return t("adminPayments.status.pending");
      }

      if (normalized === "failed") {
        return t("adminPayments.status.failed");
      }

      if (normalized === "active") {
        return t("adminPayments.status.active");
      }

      if (normalized === "cancelled") {
        return t("adminPayments.status.cancelled");
      }

      if (normalized === "expired") {
        return t("adminPayments.status.expired");
      }

      return status;
    },
    [t],
  );

  const mapCycleLabel = useCallback(
    (cycle: string) => {
      const normalized = cycle.toLowerCase();

      if (normalized === "monthly") {
        return t("adminPayments.cycle.monthly");
      }

      if (normalized === "yearly") {
        return t("adminPayments.cycle.yearly");
      }

      return cycle;
    },
    [t],
  );

  const mapDestinationLabel = useCallback(
    (destination: string) => {
      const normalized = destination.toLowerCase();

      if (normalized === "mtn_momo") {
        return t("adminPayments.destination.mtnMomo");
      }

      if (normalized === "orange_money") {
        return t("adminPayments.destination.orangeMoney");
      }

      if (normalized === "bank_transfer") {
        return t("adminPayments.destination.bankTransfer");
      }

      return destination;
    },
    [t],
  );
  const vendorPaymentsPageCount = Math.max(1, Math.ceil(vendorPaymentItems.length / pageSize));
  const paginatedWithdrawals = withdrawalItems.slice(
    (withdrawalsPage - 1) * pageSize,
    withdrawalsPage * pageSize,
  );
  const paginatedVendorPayments = vendorPaymentItems.slice(
    (vendorPaymentsPage - 1) * pageSize,
    vendorPaymentsPage * pageSize,
  );

  const hasChanges = useMemo(() => {
    if (!settings) {
      return false;
    }

    return (
      withdrawalFeePercent !== Number(settings.withdrawalFeePercent ?? 0) ||
      vendorPaymentModel !== settings.vendorPaymentModel ||
      vendorOneTimeFeeXAF !== Number(settings.vendorOneTimeFeeXAF ?? 0) ||
      vendorMonthlyFeeXAF !== Number(settings.vendorMonthlyFeeXAF ?? 0) ||
      vendorYearlyFeeXAF !== Number(settings.vendorYearlyFeeXAF ?? 0)
    );
  }, [
    settings,
    withdrawalFeePercent,
    vendorPaymentModel,
    vendorOneTimeFeeXAF,
    vendorMonthlyFeeXAF,
    vendorYearlyFeeXAF,
  ]);

  const saveMonetisation = async () => {
    if (withdrawalFeePercent < 0 || withdrawalFeePercent > 50) {
      toast.error(t("adminPayments.withdrawalFeeRange"));
      return;
    }

    if (vendorOneTimeFeeXAF < 0 || vendorMonthlyFeeXAF < 0 || vendorYearlyFeeXAF < 0) {
      toast.error(t("adminPayments.vendorFeeRange"));
      return;
    }

    setSaving(true);

    try {
      await restClient.patch("/admin/monetisation", {
        withdrawalFeePercent,
        vendorPaymentModel,
        vendorOneTimeFeeXAF,
        vendorMonthlyFeeXAF,
        vendorYearlyFeeXAF,
      });
      toast.success(t("adminPayments.saved"));
      await loadData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("adminPayments.saveFailed"),
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("adminPayments.title")}
        </h1>
        <p className="mt-1 text-muted-foreground">
          {t("adminPayments.subtitle")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <BadgeCent className="h-4 w-4" />
              <span className="text-sm">{t("adminPayments.overview.totalRevenue")}</span>
            </div>
            <div className="text-2xl font-semibold">
              {formatXaf(insights?.overview.totalRevenueXAF ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <BanknoteArrowDown className="h-4 w-4" />
              <span className="text-sm">{t("adminPayments.overview.withdrawalFees")}</span>
            </div>
            <div className="text-2xl font-semibold">
              {formatXaf(insights?.overview.withdrawalFeesDisbursedXAF ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">{t("adminPayments.overview.vendorPayments")}</span>
            </div>
            <div className="text-2xl font-semibold">
              {formatXaf(insights?.overview.vendorPaymentsCollectedXAF ?? 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="mb-3 flex items-center gap-2 text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span className="text-sm">{t("adminPayments.overview.activeSubscriptions")}</span>
            </div>
            <div className="text-2xl font-semibold">
              {insights?.overview.activeVendorSubscriptions ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminPayments.withdrawals.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {withdrawalItems.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminPayments.withdrawals.cooperative")}</TableHead>
                  <TableHead>{t("adminPayments.withdrawals.amount")}</TableHead>
                  <TableHead>{t("adminPayments.withdrawals.platformFee")}</TableHead>
                  <TableHead>{t("adminPayments.withdrawals.destination")}</TableHead>
                  <TableHead>{t("adminPayments.withdrawals.status")}</TableHead>
                  <TableHead>{t("adminPayments.withdrawals.created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedWithdrawals.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.cooperative.name}</TableCell>
                    <TableCell>{formatXaf(item.amountXAF)}</TableCell>
                    <TableCell>{formatXaf(item.platformFeeXAF)}</TableCell>
                    <TableCell>{mapDestinationLabel(item.destinationType)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "DISBURSED" ? "default" : "secondary"}>
                        {mapStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("adminPayments.withdrawals.empty")}</p>
          )}

          {withdrawalItems.length > pageSize ? (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={withdrawalsPage <= 1}
                onClick={() => setWithdrawalsPage((previous) => Math.max(1, previous - 1))}
              >
                {t("adminPayments.pagination.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("adminPayments.pagination.page")} {withdrawalsPage} / {withdrawalsPageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={withdrawalsPage >= withdrawalsPageCount}
                onClick={() =>
                  setWithdrawalsPage((previous) => Math.min(withdrawalsPageCount, previous + 1))
                }
              >
                {t("adminPayments.pagination.next")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminPayments.vendors.title")}</CardTitle>
        </CardHeader>
        <CardContent>
          {vendorPaymentItems.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("adminPayments.vendors.vendor")}</TableHead>
                  <TableHead>{t("adminPayments.vendors.cycle")}</TableHead>
                  <TableHead>{t("adminPayments.vendors.amount")}</TableHead>
                  <TableHead>{t("adminPayments.vendors.status")}</TableHead>
                  <TableHead>{t("adminPayments.vendors.expires")}</TableHead>
                  <TableHead>{t("adminPayments.vendors.created")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedVendorPayments.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.vendor.businessName}</TableCell>
                    <TableCell>{mapCycleLabel(item.billingCycle)}</TableCell>
                    <TableCell>{formatXaf(item.priceXAF)}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "ACTIVE" ? "default" : "secondary"}>
                        {mapStatusLabel(item.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(item.expiresAt)}</TableCell>
                    <TableCell>{formatDate(item.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">{t("adminPayments.vendors.empty")}</p>
          )}

          {vendorPaymentItems.length > pageSize ? (
            <div className="mt-4 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={vendorPaymentsPage <= 1}
                onClick={() => setVendorPaymentsPage((previous) => Math.max(1, previous - 1))}
              >
                {t("adminPayments.pagination.previous")}
              </Button>
              <span className="text-sm text-muted-foreground">
                {t("adminPayments.pagination.page")} {vendorPaymentsPage} / {vendorPaymentsPageCount}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={vendorPaymentsPage >= vendorPaymentsPageCount}
                onClick={() =>
                  setVendorPaymentsPage((previous) => Math.min(vendorPaymentsPageCount, previous + 1))
                }
              >
                {t("adminPayments.pagination.next")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("adminPayments.editor.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="withdrawalFeePercent">
                {t("adminPayments.editor.withdrawalFeePercent")}
              </Label>
              <Input
                id="withdrawalFeePercent"
                type="number"
                min="0"
                max="50"
                value={withdrawalFeePercent}
                onChange={(event) =>
                  setWithdrawalFeePercent(Number(event.target.value || 0))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorPaymentModel">
                {t("adminPayments.editor.vendorPaymentModel")}
              </Label>
              <Select
                value={vendorPaymentModel}
                onValueChange={(value: "ONE_TIME" | "SUBSCRIPTION") =>
                  setVendorPaymentModel(value)
                }
              >
                <SelectTrigger id="vendorPaymentModel">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ONE_TIME">{t("adminPayments.model.oneTime")}</SelectItem>
                  <SelectItem value="SUBSCRIPTION">
                    {t("adminPayments.model.subscription")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="vendorOneTimeFeeXAF">
                {t("adminPayments.editor.vendorOneTimeFee")}
              </Label>
              <Input
                id="vendorOneTimeFeeXAF"
                type="number"
                min="0"
                value={vendorOneTimeFeeXAF}
                onChange={(event) =>
                  setVendorOneTimeFeeXAF(Number(event.target.value || 0))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorMonthlyFeeXAF">
                {t("adminPayments.editor.vendorMonthlyFee")}
              </Label>
              <Input
                id="vendorMonthlyFeeXAF"
                type="number"
                min="0"
                value={vendorMonthlyFeeXAF}
                onChange={(event) =>
                  setVendorMonthlyFeeXAF(Number(event.target.value || 0))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendorYearlyFeeXAF">
                {t("adminPayments.editor.vendorYearlyFee")}
              </Label>
              <Input
                id="vendorYearlyFeeXAF"
                type="number"
                min="0"
                value={vendorYearlyFeeXAF}
                onChange={(event) =>
                  setVendorYearlyFeeXAF(Number(event.target.value || 0))
                }
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button disabled={saving || !hasChanges} onClick={() => void saveMonetisation()}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? t("adminPayments.saving") : t("adminPayments.save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
