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
        error instanceof Error ? error.message : "Failed to load admin data",
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
          Platform Overview
        </h1>
        <p className="text-muted-foreground mt-1">
          Monitor platform health, review cooperatives, and enforce global
          safeguards.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {metrics?.totalCooperatives ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Cooperatives</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">{metrics?.totalUsers ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Wallet className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {formatXaf(metrics?.totalContributionsXAF ?? 0)}
            </div>
            <p className="text-sm text-muted-foreground">Total Contributions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Activity className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {metrics?.totalPayments ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ShieldAlert className="h-5 w-5 text-primary" />
              </div>
            </div>
            <div className="text-2xl font-bold">
              {metrics?.activeSubscriptions ?? 0}
            </div>
            <p className="text-sm text-muted-foreground">
              Active Subscriptions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Admin Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Use these entry points to manage cooperatives and platform-wide
              governance.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href={`/${locale}/admin/cooperatives`}>
                  Open Cooperative Manager
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/admin/settings`}>
                  Open Global Settings
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/${locale}/admin/users`}>
                  Open Users & Audit
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>What Settings Affect</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="font-medium">Withdrawal Thresholds</p>
              <p className="text-muted-foreground">
                Controls pass conditions for withdrawal proposals across all
                cooperatives.
              </p>
            </div>
            <div>
              <p className="font-medium">Quorum Minimum Votes</p>
              <p className="text-muted-foreground">
                Sets the minimum number of votes required before any withdrawal
                vote can pass.
              </p>
            </div>
            <div>
              <p className="font-medium">Maintenance Mode</p>
              <p className="text-muted-foreground">
                Globally blocks withdrawal processing platform-wide until
                switched off.
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
