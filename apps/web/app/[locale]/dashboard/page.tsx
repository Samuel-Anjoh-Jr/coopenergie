"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery, useSubscription } from "@apollo/client";
import { Activity, Building2, TrendingUp, Users, Wallet } from "lucide-react";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { CELOSCAN_BASE } from "@/lib/config";
import {
  GET_COOPERATIVE_DETAIL,
  GET_COOPERATIVE_REPORT,
  GET_MY_COOPERATIVES,
} from "@/lib/graphql/queries/cooperative";
import {
  SUBSCRIPTION_ON_CONTRIBUTION,
  SUBSCRIPTION_ON_PROPOSAL,
  SUBSCRIPTION_ON_VOTE,
} from "@/lib/graphql/subscriptions/cooperative";
import { restClient } from "@/lib/rest-client";
import { useTranslations, type Locale } from "@/lib/translations";

type ActivityItem = {
  id: string;
  icon: string;
  action: string;
  description?: string;
  amount?: string;
  user: string;
  timestamp: string;
};

type DashboardPageProps = {
  params: Promise<{ locale: Locale }>;
};

function formatXaf(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(value);
}

function parsePayload(
  payload: string | null | undefined,
): Record<string, unknown> {
  if (!payload) {
    return {};
  }

  try {
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export default function DashboardPage({ params }: DashboardPageProps) {
  const [locale, setLocale] = useState<Locale>("en");
  const [activeCooperativeId, setActiveCooperativeId] = useState<string | null>(
    null,
  );
  const [recentSubscriptionTick, setRecentSubscriptionTick] = useState(0);
  const [coopName, setCoopName] = useState("");
  const [coopTarget, setCoopTarget] = useState("");
  const [isCreatingCoop, setIsCreatingCoop] = useState(false);
  const { data: session } = useSession();

  useEffect(() => {
    params.then(({ locale: resolvedLocale }) => setLocale(resolvedLocale));
  }, [params]);

  const t = useTranslations(locale);

  const {
    data: myCooperativesData,
    loading: loadingMyCooperatives,
    refetch: refetchMyCooperatives,
  } = useQuery(GET_MY_COOPERATIVES);

  useEffect(() => {
    if (
      !activeCooperativeId &&
      myCooperativesData?.myCooperatives?.length > 0
    ) {
      setActiveCooperativeId(myCooperativesData.myCooperatives[0].id);
    }
  }, [activeCooperativeId, myCooperativesData]);

  const {
    data: cooperativeDetailData,
    loading: loadingDetail,
    refetch: refetchCooperativeDetail,
  } = useQuery(GET_COOPERATIVE_DETAIL, {
    variables: { id: activeCooperativeId },
    skip: !activeCooperativeId,
  });

  const { data: reportData, refetch: refetchReport } = useQuery(
    GET_COOPERATIVE_REPORT,
    {
      variables: { cooperativeId: activeCooperativeId },
      skip: !activeCooperativeId,
    },
  );

  const onRealtimeEvent = () => {
    setRecentSubscriptionTick((tick) => tick + 1);
    void refetchCooperativeDetail();
    void refetchReport();
  };

  useSubscription(SUBSCRIPTION_ON_CONTRIBUTION, {
    variables: { cooperativeId: activeCooperativeId },
    skip: !activeCooperativeId,
    onData: onRealtimeEvent,
  });

  useSubscription(SUBSCRIPTION_ON_VOTE, {
    variables: { cooperativeId: activeCooperativeId },
    skip: !activeCooperativeId,
    onData: onRealtimeEvent,
  });

  useSubscription(SUBSCRIPTION_ON_PROPOSAL, {
    variables: { cooperativeId: activeCooperativeId },
    skip: !activeCooperativeId,
    onData: onRealtimeEvent,
  });

  const cooperative = cooperativeDetailData?.cooperative;
  const report = reportData?.report;

  const targetAmount = cooperative?.targetAmountXAF ?? 0;
  const totalCollected = cooperative?.totalCollected ?? 0;
  const remainingAmount = Math.max(targetAmount - totalCollected, 0);
  const progress = cooperative?.progress ?? 0;
  const memberCount = cooperative?.memberCount ?? 0;

  const formatActivity = (event: {
    id: string;
    type: string;
    payload?: string;
    createdAt: string;
  }): ActivityItem => {
    const payload = parsePayload(event.payload);
    const eventType = event.type.toUpperCase();

    if (eventType === "CONTRIBUTION") {
      const amount = Number(payload.amountXAF ?? 0);
      const contributor = String(payload.member ?? payload.user ?? "Member");
      return {
        id: event.id,
        icon: "money",
        action: t("dashboard.contribution"),
        description: amount > 0 ? formatXaf(amount) : undefined,
        amount: amount > 0 ? formatXaf(amount) : undefined,
        user: contributor,
        timestamp: new Date(event.createdAt).toLocaleString(),
      };
    }

    if (eventType === "VOTE") {
      const voter = String(payload.voter ?? "Member");
      const choice = String(payload.choice ?? "VOTE").toUpperCase();
      return {
        id: event.id,
        icon: "vote",
        action: `${t("dashboard.vote")} (${choice})`,
        description: payload.proposalId
          ? String(payload.proposalId)
          : undefined,
        user: voter,
        timestamp: new Date(event.createdAt).toLocaleString(),
      };
    }

    return {
      id: event.id,
      icon: "proposal",
      action: t("dashboard.proposalCreated"),
      description: payload.title ? String(payload.title) : undefined,
      user: String(payload.creator ?? "Member"),
      timestamp: new Date(event.createdAt).toLocaleString(),
    };
  };

  const recentActivity: ActivityItem[] = useMemo(() => {
    if (!cooperative?.recentActivity?.length) {
      return [] as ActivityItem[];
    }

    return cooperative.recentActivity.slice(0, 5).map(formatActivity);
  }, [
    cooperative,
    t("dashboard.contribution"),
    t("dashboard.proposalCreated"),
    t("dashboard.vote"),
  ]);

  const activeProposals = report?.totalProposals ?? 0;
  const cooperativeName = cooperative?.name ?? "-";
  const vaultAddress = cooperative?.vaultAddress ?? "";
  const celoScanUrl =
    cooperative?.celoScanUrl ??
    (vaultAddress ? `${CELOSCAN_BASE}/address/${vaultAddress}` : "");

  const loadingOverview = loadingMyCooperatives || loadingDetail;

  const hasNoCooperative =
    !loadingMyCooperatives && myCooperativesData?.myCooperatives?.length === 0;

  const handleCreateCooperative = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetXAF = parseInt(coopTarget, 10);
    if (!coopName.trim() || isNaN(targetXAF) || targetXAF <= 0) return;
    setIsCreatingCoop(true);
    try {
      await restClient.post("/cooperatives", {
        name: coopName.trim(),
        targetAmountXAF: targetXAF,
      });
      toast.success(t("toasts.cooperativeCreated"));
      setCoopName("");
      setCoopTarget("");
      await refetchMyCooperatives();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("toasts.cooperativeCreationFailed"),
      );
    } finally {
      setIsCreatingCoop(false);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 px-4 md:px-0">
      <div className="space-y-3 md:space-y-4 animate-in slide-in-from-top-4 duration-700">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-gradient leading-tight">
          {t("dashboard.welcome")}
        </h1>
        <p className="text-base sm:text-lg text-muted-foreground max-w-2xl leading-relaxed">
          {t("dashboard.welcomeDesc")}
        </p>
      </div>

      {hasNoCooperative && (
        <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 border-primary/30">
          <CardHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 rounded-xl bg-primary/10">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <CardTitle className="text-xl text-gradient">
                {t("createCooperative.title")}
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("createCooperative.description")}
            </p>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => void handleCreateCooperative(e)}
              className="space-y-4 max-w-md"
            >
              <div className="space-y-1.5">
                <Label htmlFor="coop-name">
                  {t("createCooperative.nameLabel")}
                </Label>
                <Input
                  id="coop-name"
                  value={coopName}
                  onChange={(e) => setCoopName(e.target.value)}
                  placeholder={t("createCooperative.namePlaceholder")}
                  disabled={isCreatingCoop}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="coop-target">
                  {t("createCooperative.targetLabel")}
                </Label>
                <Input
                  id="coop-target"
                  type="number"
                  min="1"
                  value={coopTarget}
                  onChange={(e) => setCoopTarget(e.target.value)}
                  placeholder={t("createCooperative.targetPlaceholder")}
                  disabled={isCreatingCoop}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={isCreatingCoop || !coopName.trim() || !coopTarget}
              >
                {isCreatingCoop ? (
                  <>
                    <Spinner className="mr-2" />
                    {t("createCooperative.submitting")}
                  </>
                ) : (
                  t("createCooperative.submit")
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {!hasNoCooperative && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
            <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 hover-lift">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 md:p-3 rounded-xl bg-linear-to-r from-primary/20 to-primary/10">
                    <Wallet className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                  </div>
                </div>
                <div className="text-xl md:text-3xl font-black mb-1 text-gradient-green">
                  {loadingOverview ? "..." : formatXaf(totalCollected)}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  {t("dashboard.totalContributions")}
                </p>
              </CardContent>
            </Card>

            <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 delay-100 hover-lift">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 md:p-3 rounded-xl bg-linear-to-r from-secondary/20 to-secondary/10">
                    <Activity className="h-4 w-4 md:h-6 md:w-6 text-secondary" />
                  </div>
                </div>
                <div className="text-xl md:text-3xl font-black mb-1 text-gradient-green">
                  {activeProposals}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  {t("dashboard.activeProposals")}
                </p>
              </CardContent>
            </Card>

            <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 delay-200 hover-lift">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 md:p-3 rounded-xl bg-linear-to-r from-primary/20 to-primary/10">
                    <Users className="h-4 w-4 md:h-6 md:w-6 text-primary" />
                  </div>
                </div>
                <div className="text-xl md:text-3xl font-black mb-1 text-gradient-green">
                  {memberCount}
                </div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  {t("dashboard.members")}
                </p>
              </CardContent>
            </Card>

            <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 delay-300 hover-lift">
              <CardContent className="p-4 md:p-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-2 md:p-3 rounded-xl bg-linear-to-r from-secondary/20 to-secondary/10">
                    <TrendingUp className="h-4 w-4 md:h-6 md:w-6 text-secondary" />
                  </div>
                </div>
                <div className="text-xl md:text-3xl font-black mb-1 text-gradient-green">
                  {progress.toFixed(1)}%
                </div>
                <p className="text-xs md:text-sm text-muted-foreground font-medium">
                  {t("dashboard.progress")}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 delay-400">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-xl md:text-2xl font-bold text-gradient">
                {t("dashboard.cooperativeSummary")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6 text-sm md:text-base">
                <div>
                  <p className="text-muted-foreground mb-1">
                    {t("dashboard.cooperativeName")}
                  </p>
                  <p className="font-semibold text-base md:text-lg wrap-break-word">
                    {cooperativeName}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    {t("dashboard.targetAmount")}
                  </p>
                  <p className="font-semibold text-base md:text-lg text-gradient-green">
                    {formatXaf(targetAmount)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    {t("dashboard.totalCollected")}
                  </p>
                  <p className="font-semibold text-base md:text-lg text-gradient-green">
                    {formatXaf(totalCollected)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">
                    {t("dashboard.remainingAmount")}
                  </p>
                  <p className="font-semibold text-base md:text-lg">
                    {formatXaf(remainingAmount)}
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                  <span className="text-sm md:text-base font-medium">
                    {t("dashboard.progress")}
                  </span>
                  <span className="text-lg md:text-xl font-bold text-gradient-green">
                    {progress.toFixed(1)}%
                  </span>
                </div>
                <Progress value={progress} className="h-3 md:h-4" />
              </div>

              <div className="pt-2 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-start">
                <div className="space-y-2">
                  <p className="text-muted-foreground text-sm">{t("dashboard.vaultAddress")}</p>
                  <p className="font-mono text-xs sm:text-sm break-all">
                    {vaultAddress || "-"}
                  </p>
                  {celoScanUrl ? (
                    <a
                      href={celoScanUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline"
                    >
                      {t("dashboard.viewOnCeloScan")}
                    </a>
                  ) : null}
                </div>

                {celoScanUrl ? (
                  <div className="rounded-xl border border-border p-3 bg-card/80 w-fit">
                    <QRCodeSVG value={celoScanUrl} size={92} aria-label={t("dashboard.qrAlt")}/>
                    <div className="text-xs text-muted-foreground mt-2 text-center">
                      {t("dashboard.walletAddress")}
                    </div>
                    <a
                      href={celoScanUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 underline mt-1 text-center"
                    >
                      {t("dashboard.viewOnCeloScan")}
                    </a>
                  </div>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="card-glow animate-in slide-in-from-bottom-4 duration-700 delay-500">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-xl md:text-2xl font-bold text-gradient">
                {t("dashboard.recentActivity")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 md:space-y-6">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {t("dashboard.noRecentActivity")}
                  </p>
                ) : null}

                {recentActivity.map((activity: ActivityItem) => (
                  <div
                    key={`${activity.id}-${recentSubscriptionTick}`}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3 md:p-4 rounded-xl bg-linear-to-r from-background/50 to-background/30 border border-border/50 gap-3 sm:gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3 md:gap-4 min-w-0 flex-1">
                      <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-linear-to-r from-primary/20 to-secondary/20 flex items-center justify-center shrink-0">
                        <span className="text-base md:text-lg">
                          {activity.icon === "money"
                            ? "💰"
                            : activity.icon === "vote"
                              ? "🗳️"
                              : "📋"}
                        </span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm md:text-base truncate">
                          {activity.user}
                        </p>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {activity.action}
                          {activity.description && ` - ${activity.description}`}
                        </p>
                      </div>
                    </div>
                    <div className="text-left sm:text-right shrink-0 pl-12 sm:pl-0">
                      {activity.amount && (
                        <p className="font-semibold text-sm md:text-base text-gradient-green">
                          {activity.amount}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
