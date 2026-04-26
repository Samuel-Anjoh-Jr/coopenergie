"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { restClient } from "@/lib/rest-client";

type UserItem = {
  id: string;
  name: string;
  email: string;
  suspended: boolean;
  isPlatformAdmin: boolean;
  createdAt: string;
  memberships: Array<{
    role: "PLATFORM_ADMIN" | "COOP_ADMIN" | "MEMBER";
    cooperative: {
      id: string;
      name: string;
    };
  }>;
};

type AuditItem = {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name: string; email: string } | null;
  cooperative: { id: string; name: string; slug: string } | null;
};

type PagedResponse<T> = {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value);
  } catch {
    return "{}";
  }
}

function prettyAction(action: string) {
  return action
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function AdminUsersPage() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<Record<string, boolean>>({});

  const [usersPayload, setUsersPayload] = useState<PagedResponse<UserItem>>({
    items: [],
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const [auditPayload, setAuditPayload] = useState<PagedResponse<AuditItem>>({
    items: [],
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });

  const load = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [usersData, auditData] = await Promise.all([
        restClient.get<PagedResponse<UserItem>>(
          `/admin/users?page=1&limit=50${search.trim() ? `&search=${encodeURIComponent(search.trim())}` : ""}`,
        ),
        restClient.get<PagedResponse<AuditItem>>(
          `/admin/audit-logs?page=1&limit=50`,
        ),
      ]);
      setUsersPayload(usersData);
      setAuditPayload(auditData);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Failed to load users and audit logs.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return usersPayload.items;
    }

    return usersPayload.items.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q),
    );
  }, [search, usersPayload.items]);

  const setPendingState = (key: string, value: boolean) => {
    setPending((current) => ({ ...current, [key]: value }));
  };

  const togglePlatformAdmin = async (user: UserItem, nextValue: boolean) => {
    const warning = nextValue
      ? `Promote ${user.name} (${user.email}) to platform admin? They will be able to change all platform settings and critical controls.`
      : `Demote ${user.name} (${user.email}) from platform admin? They will lose all platform-level control permissions.`;

    if (!window.confirm(warning)) {
      return;
    }

    const key = `role:${user.id}`;
    setPendingState(key, true);

    try {
      const updated = await restClient.patch<
        Pick<UserItem, "id" | "isPlatformAdmin">
      >(`/admin/users/${user.id}/platform-admin`, {
        isPlatformAdmin: nextValue,
      });

      setUsersPayload((current) => ({
        ...current,
        items: current.items.map((item) =>
          item.id === user.id
            ? { ...item, isPlatformAdmin: updated.isPlatformAdmin }
            : item,
        ),
      }));

      toast.success(
        nextValue
          ? `${user.name} promoted to platform admin.`
          : `${user.name} demoted from platform admin.`,
      );
      void load(true);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update admin role.",
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
      <div>
        <h1 className="text-3xl font-bold text-foreground">Users and Audit</h1>
        <p className="text-muted-foreground mt-1">
          Manage platform-admin roles and review the full audit timeline.
        </p>
      </div>

      <Alert className="border-destructive/30 bg-destructive/5">
        <AlertTriangle className="h-4 w-4 text-destructive" />
        <AlertTitle>Blast-radius warning</AlertTitle>
        <AlertDescription>
          Platform admins can suspend cooperatives, lock withdrawals, rename
          cooperative slugs, and modify global governance settings. Promote with
          caution.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            Platform Role Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter users by name or email"
              className="sm:max-w-sm"
            />
            <Button
              variant="outline"
              size="sm"
              disabled={refreshing}
              onClick={() => void load(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {refreshing ? "Refreshing..." : "Refresh"}
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cooperative Roles</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={5}
                    className="py-8 text-center text-muted-foreground"
                  >
                    No users match your current filter.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {user.email}
                      </p>
                    </TableCell>
                    <TableCell className="space-x-2">
                      {user.isPlatformAdmin ? (
                        <Badge>Platform Admin</Badge>
                      ) : (
                        <Badge variant="outline">Standard User</Badge>
                      )}
                      {user.suspended ? (
                        <Badge variant="destructive">Suspended</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.memberships.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            No memberships
                          </span>
                        ) : (
                          user.memberships.slice(0, 3).map((membership) => (
                            <Badge
                              key={`${user.id}-${membership.cooperative.id}`}
                              variant="secondary"
                            >
                              {membership.role}
                            </Badge>
                          ))
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant={
                          user.isPlatformAdmin ? "destructive" : "default"
                        }
                        disabled={pending[`role:${user.id}`]}
                        onClick={() =>
                          void togglePlatformAdmin(user, !user.isPlatformAdmin)
                        }
                      >
                        {user.isPlatformAdmin ? "Demote" : "Promote"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Admin Audit Timeline</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {auditPayload.items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No audit records available.
            </p>
          ) : (
            auditPayload.items.slice(0, 40).map((item) => (
              <div
                key={item.id}
                className="rounded-lg border border-border/60 p-3"
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <p className="text-sm font-medium">
                      {prettyAction(item.action)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Actor: {item.user?.name ?? "System"} (
                      {item.user?.email ?? "n/a"})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Target: {item.entity}
                      {item.entityId ? ` (${item.entityId})` : ""}
                      {item.cooperative
                        ? ` • Cooperative: ${item.cooperative.name} (${item.cooperative.slug})`
                        : ""}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <p className="mt-2 break-all rounded bg-muted/50 px-2 py-1 text-xs text-muted-foreground">
                  Metadata: {safeJson(item.metadata)}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
