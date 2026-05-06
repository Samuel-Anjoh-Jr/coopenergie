"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  Building2,
  Users,
  Wallet,
  Activity,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
import { useAdminRealtime } from "@/lib/admin-realtime";
import { restClient } from "@/lib/rest-client";
import { useTranslations } from "@/lib/translations";
import { toast } from "sonner";

type Metrics = {
  totalCooperatives: number;
  totalUsers: number;
  totalContributionsXAF: number;
  totalPayments: number;
  activeSubscriptions: number;
};

type Cooperative = {
  id: string;
  name: string;
  slug: string;
  targetAmountXAF: number;
  confirmedBalanceXAF: number;
  createdAt: string;
};

function percentage(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAdminData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const [metricsData, coopsData] = await Promise.all([
        restClient.get<Metrics>("/admin/metrics"),
        restClient.get<{ items: Cooperative[] }>("/admin/cooperatives"),
      ]);
      setMetrics(metricsData);
      setCooperatives(coopsData.items);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("adminDashboard.loadFailed"),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAdminData(true);
  }, [loadAdminData]);

  useAdminRealtime(() => {
    void loadAdminData();
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          {t("adminDashboard.title")}
        </h1>
        <p className="text-muted-foreground mt-1">
          {t("adminDashboard.subtitle")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 xl:grid-cols-5">
        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold leading-tight wrap-anywhere md:text-2xl">
              {metrics?.totalCooperatives ?? 0}
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {t("adminDashboard.metrics.cooperatives")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold leading-tight wrap-anywhere md:text-2xl">
              {metrics?.totalUsers ?? 0}
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {t("adminDashboard.metrics.totalUsers")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold leading-tight wrap-anywhere md:text-2xl">
              {formatXaf(metrics?.totalContributionsXAF ?? 0)}
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {t("adminDashboard.metrics.totalContributions")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold leading-tight wrap-anywhere md:text-2xl">
              {metrics?.totalPayments ?? 0}
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {t("adminDashboard.metrics.totalPayments")}
            </p>
          </CardContent>
        </Card>

        <Card className="min-w-0 overflow-hidden">
          <CardContent className="min-w-0 p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="min-w-0 text-xl font-bold leading-tight wrap-anywhere md:text-2xl">
              {metrics?.activeSubscriptions ?? 0}
            </div>
            <p className="text-sm text-muted-foreground wrap-anywhere">
              {t("adminDashboard.metrics.activeSubscriptions")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("adminDashboard.actions.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {t("adminDashboard.actions.subtitle")}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/${locale}/admin/cooperatives`}>
                  {t("adminDashboard.actions.openCooperatives")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/admin/settings`}>
                  {t("adminDashboard.actions.openSettings")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/admin/users`}>
                  {t("adminDashboard.actions.openUsers")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/admin/payments`}>
                  {t("adminDashboard.openPayments")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("adminDashboard.settingsImpact.title")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">
                {t("adminDashboard.settingsImpact.withdrawalThresholds.title")}
              </p>
              <p className="text-muted-foreground">
                {t(
                  "adminDashboard.settingsImpact.withdrawalThresholds.description",
                )}
              </p>
            </div>
            <div>
              <p className="font-medium">
                {t("adminDashboard.settingsImpact.quorum.title")}
              </p>
              <p className="text-muted-foreground">
                {t("adminDashboard.settingsImpact.quorum.description")}
              </p>
            </div>
            <div>
              <p className="font-medium">
                {t("adminDashboard.settingsImpact.maintenance.title")}
              </p>
              <p className="text-muted-foreground">
                {t("adminDashboard.settingsImpact.maintenance.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Cooperatives</CardTitle>
        </CardHeader>
        <CardContent>
          {cooperatives.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No cooperatives yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperatives.slice(0, 10).map((coop) => {
                  const progress = percentage(
                    coop.confirmedBalanceXAF,
                    coop.targetAmountXAF,
                  );

                  return (
                    <TableRow key={coop.id}>
                      <TableCell className="font-medium">{coop.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {coop.slug}
                      </TableCell>
                      <TableCell>{formatXaf(coop.targetAmountXAF)}</TableCell>
                      <TableCell>
                        {formatXaf(coop.confirmedBalanceXAF)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={progress >= 100 ? "default" : "secondary"}
                        >
                          {progress}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(coop.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <div className="mt-4 flex justify-end">
            <Button asChild variant="outline" size="sm">
              <Link href={`/${locale}/admin/cooperatives`}>
                View Full Cooperative Manager
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
