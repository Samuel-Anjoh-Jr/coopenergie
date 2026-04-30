"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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

type Cooperative = {
  id: string;
  name: string;
  slug: string;
  suspended: boolean;
  withdrawalsLocked: boolean;
  targetAmountXAF: number;
  confirmedBalanceXAF: number;
  createdAt: string;
};

type CooperativeResponse = {
  items: Cooperative[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function formatXaf(value: number) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function calcProgress(collected: number, target: number) {
  if (target <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((collected / target) * 100)));
}

export default function AdminCooperativesPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<CooperativeResponse>({
    items: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [slugDrafts, setSlugDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const fetchCooperatives = useCallback(
    async (nextPage: number, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const data = await restClient.get<CooperativeResponse>(
          `/admin/cooperatives?page=${nextPage}&limit=20`,
        );
        setPayload(data);
        setPage(data.page);
        setSlugDrafts(
          data.items.reduce<Record<string, string>>((accumulator, item) => {
            accumulator[item.id] = item.slug;
            return accumulator;
          }, {}),
        );
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : "Failed to load cooperatives.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useEffect(() => {
    void fetchCooperatives(1);
  }, [fetchCooperatives]);

  useAdminRealtime(() => {
    void fetchCooperatives(page, true);
  });

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return payload.items;
    }

    return payload.items.filter(
      (coop) =>
        coop.name.toLowerCase().includes(q) ||
        coop.slug.toLowerCase().includes(q),
    );
  }, [payload.items, search]);

  const applyCooperativeUpdate = (
    cooperativeId: string,
    next: Partial<Cooperative>,
  ) => {
    setPayload((current) => ({
      ...current,
      items: current.items.map((item) =>
        item.id === cooperativeId ? { ...item, ...next } : item,
      ),
    }));
  };

  const setPendingState = (key: string, value: boolean) => {
    setPending((current) => ({ ...current, [key]: value }));
  };

  const handleSuspendToggle = async (coop: Cooperative, nextValue: boolean) => {
    const confirmMessage = nextValue
      ? `Suspend ${coop.name}? This blocks administrative operations such as creating new withdrawal proposals.`
      : `Unsuspend ${coop.name}? Cooperative operations will resume.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const key = `suspend:${coop.id}`;
    setPendingState(key, true);

    try {
      const updated = await restClient.patch<Pick<Cooperative, "suspended">>(
        `/admin/cooperatives/${coop.id}/suspend`,
        { suspended: nextValue },
      );
      applyCooperativeUpdate(coop.id, { suspended: updated.suspended });
      toast.success(
        nextValue
          ? `${coop.name} has been suspended.`
          : `${coop.name} has been unsuspended.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update suspension.",
      );
    } finally {
      setPendingState(key, false);
    }
  };

  const handleWithdrawalLockToggle = async (
    coop: Cooperative,
    nextValue: boolean,
  ) => {
    const confirmMessage = nextValue
      ? `Lock withdrawals for ${coop.name}? New withdrawal proposals will be blocked.`
      : `Unlock withdrawals for ${coop.name}? Withdrawal proposals can be created again.`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    const key = `withdrawal-lock:${coop.id}`;
    setPendingState(key, true);

    try {
      const updated = await restClient.patch<
        Pick<Cooperative, "withdrawalsLocked">
      >(`/admin/cooperatives/${coop.id}/withdrawals-lock`, {
        withdrawalsLocked: nextValue,
      });
      applyCooperativeUpdate(coop.id, {
        withdrawalsLocked: updated.withdrawalsLocked,
      });
      toast.success(
        nextValue
          ? `Withdrawals locked for ${coop.name}.`
          : `Withdrawals unlocked for ${coop.name}.`,
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to update withdrawal lock.",
      );
    } finally {
      setPendingState(key, false);
    }
  };

  const handleRenameSlug = async (coop: Cooperative) => {
    const nextSlug = (slugDrafts[coop.id] ?? "").trim().toLowerCase();
    if (!nextSlug) {
      toast.error("Slug cannot be empty.");
      return;
    }

    if (nextSlug === coop.slug) {
      toast.message("Slug is unchanged.");
      return;
    }

    if (
      !window.confirm(
        `Rename slug for ${coop.name} from ${coop.slug} to ${nextSlug}?`,
      )
    ) {
      return;
    }

    const key = `rename:${coop.id}`;
    setPendingState(key, true);

    try {
      const updated = await restClient.patch<Pick<Cooperative, "slug">>(
        `/admin/cooperatives/${coop.id}/slug`,
        { slug: nextSlug },
      );
      applyCooperativeUpdate(coop.id, { slug: updated.slug });
      setSlugDrafts((current) => ({ ...current, [coop.id]: updated.slug }));
      toast.success(`Slug updated to ${updated.slug}.`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to rename slug.",
      );
    } finally {
      setPendingState(key, false);
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
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-foreground">
          Cooperative Manager
        </h1>
        <p className="text-muted-foreground">
          Review cooperative performance, monitor target progress, and inspect
          platform-wide health at a glance.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cooperative Directory</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert className="border-amber-500/30 bg-amber-500/10">
            <AlertTitle>High-impact controls</AlertTitle>
            <AlertDescription>
              Suspension blocks administrative cooperative operations.
              Withdrawal lock blocks new withdrawal proposals. Slug updates
              change public/route-facing cooperative identifiers.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search className="text-muted-foreground absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by cooperative name or slug"
                className="pl-9"
              />
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchCooperatives(page, true)}
              disabled={refreshing}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <p className="text-muted-foreground text-xs">
            Showing {filteredItems.length} of {payload.items.length}{" "}
            cooperatives on this page ({payload.total} total across all pages).
          </p>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cooperative</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Collected</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Controls</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredItems.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-muted-foreground py-8 text-center"
                  >
                    No cooperative matches your search on this page.
                  </TableCell>
                </TableRow>
              ) : (
                filteredItems.map((coop) => {
                  const progress = calcProgress(
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
                      <TableCell className="space-x-2">
                        {coop.suspended ? (
                          <Badge variant="destructive">Suspended</Badge>
                        ) : (
                          <Badge variant="outline">Active</Badge>
                        )}
                        {coop.withdrawalsLocked ? (
                          <Badge variant="secondary">Withdrawals Locked</Badge>
                        ) : (
                          <Badge variant="outline">Withdrawals Open</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-3">
                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              Suspend
                              <Switch
                                checked={coop.suspended}
                                disabled={pending[`suspend:${coop.id}`]}
                                onCheckedChange={(next) =>
                                  void handleSuspendToggle(coop, next)
                                }
                              />
                            </label>

                            <label className="flex items-center gap-2 text-xs text-muted-foreground">
                              Lock withdrawals
                              <Switch
                                checked={coop.withdrawalsLocked}
                                disabled={pending[`withdrawal-lock:${coop.id}`]}
                                onCheckedChange={(next) =>
                                  void handleWithdrawalLockToggle(coop, next)
                                }
                              />
                            </label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Input
                              value={slugDrafts[coop.id] ?? coop.slug}
                              onChange={(event) =>
                                setSlugDrafts((current) => ({
                                  ...current,
                                  [coop.id]: event.target.value,
                                }))
                              }
                              className="h-8 max-w-48"
                              placeholder="new-slug"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={pending[`rename:${coop.id}`]}
                              onClick={() => void handleRenameSlug(coop)}
                            >
                              <Save className="mr-1 h-3 w-3" />
                              Rename slug
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(coop.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground text-xs">
              Page {payload.page} of {Math.max(payload.totalPages, 1)}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => void fetchCooperatives(page - 1)}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= payload.totalPages}
                onClick={() => void fetchCooperatives(page + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
