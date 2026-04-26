"use client";

import { useEffect, useState } from "react";
import { Building2, Users, Wallet, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Spinner } from "@/components/ui/spinner";
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

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminPage() {
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const [metricsData, coopsData] = await Promise.all([
          restClient.get<Metrics>("/admin/metrics"),
          restClient.get<{ items: Cooperative[] }>("/admin/cooperatives"),
        ]);
        setMetrics(metricsData);
        setCooperatives(coopsData.items);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to load admin data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
        <h1 className="text-3xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground mt-1">
          Monitor all cooperatives and platform activity
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
            <div className="text-2xl font-bold">{metrics?.totalCooperatives ?? 0}</div>
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
            <div className="text-2xl font-bold">{metrics?.totalPayments ?? 0}</div>
            <p className="text-sm text-muted-foreground">Total Payments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Cooperatives</CardTitle>
        </CardHeader>
        <CardContent>
          {cooperatives.length === 0 ? (
            <p className="text-sm text-muted-foreground">No cooperatives yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Collected</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cooperatives.map((coop) => (
                  <TableRow key={coop.id}>
                    <TableCell className="font-medium">{coop.name}</TableCell>
                    <TableCell>{formatXaf(coop.targetAmountXAF)}</TableCell>
                    <TableCell>{formatXaf(coop.confirmedBalanceXAF)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(coop.createdAt).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
