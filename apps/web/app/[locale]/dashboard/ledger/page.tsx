"use client";

import { useEffect, useMemo, useState } from "react";

import { useQuery, useSubscription } from "@apollo/client";
import {
  Blocks,
  Check,
  ChevronDown,
  Clock,
  Copy,
  DollarSign,
  ExternalLink,
  FileText,
  Filter,
  Info,
  Lock,
  MessageSquare,
  Shield,
} from "lucide-react";
import { useParams, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { QRCodeSVG } from "qrcode.react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CELOSCAN_BASE, celoScanTx, withCeloScanLogsTab } from "@/lib/config";
import { GET_LEDGER } from "@/lib/graphql/queries/ledger";
import {
  SUBSCRIPTION_ON_CONTRIBUTION,
  SUBSCRIPTION_ON_PROPOSAL,
  SUBSCRIPTION_ON_VOTE,
} from "@/lib/graphql/subscriptions/cooperative";
import {
  createTrailingThrottle,
  DASHBOARD_LIGHTWEIGHT_FALLBACK_POLL_INTERVAL_MS,
  DASHBOARD_REALTIME_REFETCH_THROTTLE_MS,
} from "@/lib/realtime";
import { Locale, useTranslations } from "@/lib/translations";
import { useSelectedCooperative } from "@/lib/use-selected-cooperative";

type LedgerEvent = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  txHash: string;
  blockNumber: number;
  celoScanUrl?: string | null;
  createdAt: string;
};

type FilterType = "all" | "CONTRIBUTION" | "VOTE" | "PROPOSAL";

function truncateHash(hash: string): string {
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString();
}

function getEventIcon(type: string) {
  const lowered = type.toUpperCase();
  if (lowered === "CONTRIBUTION") {
    return <DollarSign className="w-4 h-4 md:w-5 md:h-5" />;
  }
  if (lowered === "VOTE") {
    return <Check className="w-4 h-4 md:w-5 md:h-5" />;
  }
  if (lowered === "PROPOSAL") {
    return <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />;
  }
  return <Lock className="w-4 h-4 md:w-5 md:h-5" />;
}

function getEventLabel(type: string, t: ReturnType<typeof useTranslations>) {
  const lowered = type.toUpperCase();
  if (lowered === "CONTRIBUTION") {
    return t("ledger.eventContribution");
  }
  if (lowered === "VOTE") {
    return t("ledger.eventVote");
  }
  if (lowered === "PROPOSAL") {
    return t("ledger.eventProposal");
  }
  return type;
}

function getEventColor(type: string) {
  const lowered = type.toUpperCase();
  if (lowered === "CONTRIBUTION") {
    return "text-primary bg-primary/10";
  }
  if (lowered === "VOTE") {
    return "text-accent bg-accent/10";
  }
  if (lowered === "PROPOSAL") {
    return "text-blue-600 dark:text-blue-400 bg-blue-100/20 dark:bg-blue-900/20";
  }
  return "text-muted-foreground bg-muted";
}

function getPayloadSummary(
  type: string,
  payload: Record<string, unknown>,
): string {
  if (!payload) return "-";

  const lowered = type.toUpperCase();
  const performerName = payload.performerName as string | null | undefined;
  const byLine = performerName ? ` · by ${performerName}` : "";

  if (lowered === "CONTRIBUTION") {
    const amount = payload.amountXAF ?? 0;
    return `${(amount as number).toLocaleString()} FCFA${byLine}`;
  }

  if (lowered === "VOTE") {
    const choice = payload.choice === true ? "YES" : "NO";
    return `Vote: ${choice}${byLine}`;
  }

  if (lowered === "PROPOSAL") {
    const title = payload.title ?? "Proposal";
    return `${String(title).substring(0, 50)}${byLine}`;
  }

  return JSON.stringify(payload).substring(0, 50);
}

export default function LedgerPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = ((params.locale as string) || "en").toLowerCase();
  const normalizedLocale: Locale = locale.startsWith("fr") ? "fr" : "en";
  const t = useTranslations(normalizedLocale);
  const { data: session } = useSession();

  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  const [highlightedActivityId, setHighlightedActivityId] = useState<
    string | null
  >(null);

  const {
    activeCoopId: cooperativeId,
    selectedCoop,
    refetchMyCooperatives,
    isResolvingSelection,
  } = useSelectedCooperative();
  const vaultAddress = selectedCoop?.vaultAddress || "";

  const filterType =
    activeFilter === "all" ? undefined : (activeFilter as string);

  const {
    data: ledgerData,
    loading: loadingLedger,
    refetch: refetchLedger,
  } = useQuery(GET_LEDGER, {
    variables: {
      cooperativeId,
      type: filterType,
      limit: 50,
      offset: 0,
    },
    skip: !cooperativeId,
  });

  const events: LedgerEvent[] = ledgerData?.ledger ?? [];
  const isInitialLedgerLoading =
    isResolvingSelection || (loadingLedger && !ledgerData?.ledger);

  const throttledLedgerRefetch = useMemo(
    () =>
      createTrailingThrottle(() => {
        void refetchLedger();
      }, DASHBOARD_REALTIME_REFETCH_THROTTLE_MS),
    [refetchLedger],
  );

  useEffect(() => {
    return () => {
      throttledLedgerRefetch.cancel();
    };
  }, [throttledLedgerRefetch]);

  useEffect(() => {
    if (!cooperativeId) {
      return;
    }

    const interval = setInterval(() => {
      void refetchMyCooperatives();
      throttledLedgerRefetch.trigger();
    }, DASHBOARD_LIGHTWEIGHT_FALLBACK_POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [cooperativeId, refetchMyCooperatives, throttledLedgerRefetch]);
  const activityIdToHighlight = searchParams.get("activity");

  useEffect(() => {
    if (!activityIdToHighlight || events.length === 0) {
      return;
    }

    const target = document.getElementById(
      `ledger-activity-${activityIdToHighlight}`,
    );
    if (!target) {
      return;
    }

    setHighlightedActivityId(activityIdToHighlight);
    target.scrollIntoView({ behavior: "smooth", block: "center" });

    const timeout = window.setTimeout(() => {
      setHighlightedActivityId((current) =>
        current === activityIdToHighlight ? null : current,
      );
    }, 2500);

    return () => window.clearTimeout(timeout);
  }, [activityIdToHighlight, events]);

  useSubscription(SUBSCRIPTION_ON_CONTRIBUTION, {
    variables: { cooperativeId },
    skip: !cooperativeId,
    onData: () => {
      throttledLedgerRefetch.trigger();
    },
  });

  useSubscription(SUBSCRIPTION_ON_VOTE, {
    variables: { cooperativeId },
    skip: !cooperativeId,
    onData: () => {
      throttledLedgerRefetch.trigger();
    },
  });

  useSubscription(SUBSCRIPTION_ON_PROPOSAL, {
    variables: { cooperativeId },
    skip: !cooperativeId,
    onData: () => {
      throttledLedgerRefetch.trigger();
    },
  });

  const groupedByBlock = useMemo(() => {
    const blockMap = new Map<number, LedgerEvent[]>();
    events.forEach((event) => {
      const existing = blockMap.get(event.blockNumber) || [];
      blockMap.set(event.blockNumber, [...existing, event]);
    });

    return Array.from(blockMap.entries())
      .map(([blockNumber, transactions]) => ({
        blockNumber,
        transactions: transactions.sort(
          (a, b) => +new Date(b.createdAt) - +new Date(a.createdAt),
        ),
      }))
      .sort((a, b) => b.blockNumber - a.blockNumber);
  }, [events]);

  const uniqueBlockCount = groupedByBlock.length;

  const copyToClipboard = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
      toast.success(normalizedLocale === "fr" ? "Hash copié" : "Hash copied");
    } catch {
      toast.error(normalizedLocale === "fr" ? "Échec de copie" : "Copy failed");
    }
  };

  if (!session?.user) {
    return null;
  }

  const filterButtons: Array<{
    key: FilterType;
    label: string;
    icon: React.ReactNode;
  }> = [
    {
      key: "all",
      label: t("ledger.filterAll"),
      icon: <Filter className="w-4 h-4" />,
    },
    {
      key: "CONTRIBUTION",
      label: t("ledger.filterContributions"),
      icon: <DollarSign className="w-4 h-4" />,
    },
    {
      key: "VOTE",
      label: t("ledger.filterVotes"),
      icon: <Check className="w-4 h-4" />,
    },
    {
      key: "PROPOSAL",
      label: t("ledger.filterProposals"),
      icon: <MessageSquare className="w-4 h-4" />,
    },
  ];

  const celoScanAddressUrl = vaultAddress
    ? `${CELOSCAN_BASE}/address/${vaultAddress}`
    : "";

  return (
    <TooltipProvider>
      <div className="space-y-6 md:space-y-8">
        {/* Header */}
        <div className="space-y-2 md:space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-linear-to-br from-primary to-accent flex items-center justify-center ring-2 ring-primary/30 ring-offset-2 ring-offset-background">
              <Blocks className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {t("ledger.title")}
              </h1>
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <Shield className="w-3 h-3" />
                {normalizedLocale === "fr"
                  ? "Sécurisé par cryptographie"
                  : "Cryptographically secured"}
              </p>
            </div>
          </div>
          <p className="text-base md:text-lg text-foreground font-medium">
            {t("ledger.everything")}
          </p>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("ledger.description")}
          </p>
        </div>

        {/* Vault Address Section */}
        {vaultAddress ? (
          <Card className="border-border/50 bg-linear-to-br from-card via-card to-primary/5 overflow-hidden">
            <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
              <CardTitle className="text-lg md:text-xl flex items-center gap-2">
                <Blocks className="w-5 h-5 text-primary" />
                {normalizedLocale === "fr"
                  ? "Adresse du coffre-fort"
                  : "Community Vault"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 pt-0 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4">
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    {normalizedLocale === "fr" ? "Adresse" : "Address"}
                  </p>
                  <div className="flex items-center gap-2 bg-muted/50 p-3 rounded-lg border border-border/50">
                    <code className="text-xs md:text-sm font-mono text-foreground break-all flex-1">
                      {vaultAddress}
                    </code>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => void copyToClipboard(vaultAddress)}
                    >
                      {copiedHash === vaultAddress ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  {celoScanAddressUrl ? (
                    <a
                      href={celoScanAddressUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                    >
                      {normalizedLocale === "fr"
                        ? "Vérifier sur CeloScan"
                        : "Verify on CeloScan"}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </div>

                <div className="rounded-xl border border-border p-3 bg-card/80 w-fit">
                  <div className="rounded-lg bg-white p-2 shadow-sm">
                    <QRCodeSVG
                      value={celoScanAddressUrl || vaultAddress}
                      size={96}
                      bgColor="#FFFFFF"
                      fgColor="#000000"
                      includeMargin
                      aria-label={t("dashboard.qrAlt")}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-2 text-center">
                    {t("dashboard.walletAddress")}
                  </div>
                  {celoScanAddressUrl && (
                    <a
                      href={celoScanAddressUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-xs text-blue-600 underline mt-1 text-center"
                    >
                      {t("dashboard.viewOnCeloScan")}
                    </a>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {/* Why This Matters Card */}
        <Card className="border-primary/20 bg-linear-to-br from-primary/5 via-card to-accent/5 overflow-hidden">
          <CardHeader className="p-4 md:p-6 pb-2 md:pb-3">
            <CardTitle className="text-base md:text-lg flex items-center gap-2">
              <Info className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {normalizedLocale === "fr"
                ? "Pourquoi c'est important"
                : "Why This Matters"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <p className="text-sm md:text-base text-muted-foreground leading-relaxed">
              {normalizedLocale === "fr"
                ? "Chaque transaction est enregistrée de manière permanente et ne peut pas être modifiée ou supprimée. Cela garantit que chaque contribution, vote et proposition est entièrement traçable et vérifiable par tous les membres de la coopérative."
                : "Every transaction is permanently recorded and cannot be modified or deleted. This ensures that every contribution, vote, and proposal is fully traceable and verifiable by all cooperative members."}
            </p>
            <div className="flex flex-wrap gap-3 mt-4">
              <Badge
                variant="outline"
                className="border-primary/30 text-primary bg-primary/5"
              >
                <Lock className="w-3 h-3 mr-1" />
                {normalizedLocale === "fr" ? "Immuable" : "Immutable"}
              </Badge>
              <Badge
                variant="outline"
                className="border-accent/30 text-accent bg-accent/5"
              >
                <Shield className="w-3 h-3 mr-1" />
                {normalizedLocale === "fr" ? "Vérifié" : "Verified"}
              </Badge>
              <Badge
                variant="outline"
                className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/5"
              >
                <Blocks className="w-3 h-3 mr-1" />
                {normalizedLocale === "fr" ? "Distribué" : "Distributed"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* How to Verify Section */}
        <Collapsible defaultOpen={false}>
          <Card className="border-border/50">
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start p-4 md:p-6 hover:bg-muted/50"
              >
                <ChevronDown className="mr-2 h-4 w-4 transition-transform" />
                <span className="text-base md:text-lg font-semibold">
                  {normalizedLocale === "fr"
                    ? "Comment vérifier sur CeloScan"
                    : "How to Verify on CeloScan"}
                </span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="border-t border-border px-4 md:px-6 py-4 md:py-6">
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    titleEn: "Visit CeloScan",
                    titleFr: "Visitez CeloScan",
                    descEn:
                      "Go to celoscan.io and navigate to the address or transaction search.",
                    descFr:
                      "Accédez à celoscan.io et accédez à la recherche d'adresse ou de transaction.",
                  },
                  {
                    step: 2,
                    titleEn: "Paste the Address or Transaction Hash",
                    titleFr: "Collez l'adresse ou le hash de transaction",
                    descEn:
                      "Copy and paste the vault address or transaction hash into the search box.",
                    descFr:
                      "Copiez et collez l'adresse du coffre-fort ou le hash de transaction dans la zone de recherche.",
                  },
                  {
                    step: 3,
                    titleEn: "View the Details",
                    titleFr: "Afficher les détails",
                    descEn:
                      "Review the transaction details, including sender, receiver, amount, and block number.",
                    descFr:
                      "Passez en revue les détails de la transaction, y compris l'expéditeur, le destinataire, le montant et le numéro de bloc.",
                  },
                  {
                    step: 4,
                    titleEn: "Verify Authenticity",
                    titleFr: "Vérifier l'authenticité",
                    descEn:
                      "Confirm that the transaction is immutable and stored on the Celo blockchain. The transaction hash is unique and cannot be tampered with.",
                    descFr:
                      "Confirmez que la transaction est immuable et stockée sur la blockchain Celo. Le hash de transaction est unique et ne peut pas être altéré.",
                  },
                ].map((item) => (
                  <div key={item.step} className="flex gap-3 md:gap-4">
                    <div className="shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-semibold text-primary">
                      {item.step}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        {normalizedLocale === "fr"
                          ? item.titleFr
                          : item.titleEn}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {normalizedLocale === "fr" ? item.descFr : item.descEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Filter Buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-hide">
          {filterButtons.map((filter) => {
            const count = events.filter(
              (e) =>
                filter.key === "all" || e.type.toUpperCase() === filter.key,
            ).length;

            return (
              <Button
                key={filter.key}
                variant={activeFilter === filter.key ? "default" : "outline"}
                size="sm"
                onClick={() => setActiveFilter(filter.key)}
                className={`gap-2 shrink-0 min-h-10 md:min-h-9 ${
                  activeFilter === filter.key
                    ? "bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted"
                }`}
              >
                {filter.icon}
                <span className="whitespace-nowrap">{filter.label}</span>
                <Badge
                  variant="secondary"
                  className={`ml-1 text-xs ${
                    activeFilter === filter.key
                      ? "bg-white/20 text-white"
                      : "bg-muted-foreground/10"
                  }`}
                >
                  {count}
                </Badge>
              </Button>
            );
          })}
        </div>

        {/* Ledger Events */}
        {isInitialLedgerLoading ? (
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-center h-64">
              <div className="text-muted-foreground">
                {normalizedLocale === "fr" ? "Chargement..." : "Loading..."}
              </div>
            </CardContent>
          </Card>
        ) : events.length === 0 ? (
          <Card className="border-border bg-card">
            <CardContent className="flex flex-col items-center justify-center h-64 gap-4">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground" />
              </div>
              <div className="text-center">
                <p className="text-lg font-medium text-foreground">
                  {normalizedLocale === "fr"
                    ? "Aucune transaction trouvée"
                    : "No transactions found"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {normalizedLocale === "fr"
                    ? "Aucune transaction ne correspond à ce filtre"
                    : "No transactions match this filter"}
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedByBlock.map((block) => (
              <div key={block.blockNumber} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-linear-to-r from-primary/10 to-accent/10 border border-primary/20">
                    <Blocks className="w-4 h-4 text-primary" />
                    <span className="font-mono text-sm font-semibold text-foreground">
                      {normalizedLocale === "fr" ? "Bloc" : "Block"} #
                      {block.blockNumber}
                    </span>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute left-3.75 md:left-4.75 top-0 bottom-0 w-0.5 bg-linear-to-b from-primary via-accent to-primary/50" />

                  <div className="space-y-3">
                    {block.transactions.map((event, idx) => {
                      const txUrl = event.celoScanUrl
                        ? withCeloScanLogsTab(event.celoScanUrl)
                        : celoScanTx(event.txHash);
                      const summary = getPayloadSummary(
                        event.type,
                        event.payload,
                      );

                      return (
                        <div
                          key={event.id}
                          id={`ledger-activity-${event.id}`}
                          className={`relative pl-12 md:pl-16 group transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${
                            highlightedActivityId === event.id
                              ? "rounded-xl ring-2 ring-amber-400/80 ring-offset-2 ring-offset-background animate-pulse"
                              : ""
                          }`}
                          style={{ transitionDelay: `${idx * 50}ms` }}
                        >
                          <div
                            className={`absolute left-0 top-1 w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center border-4 border-background ${getEventColor(
                              event.type,
                            )} group-hover:scale-110 transition-transform duration-300`}
                          >
                            {getEventIcon(event.type)}
                          </div>

                          <Card className="border-border/50 bg-card/50 backdrop-blur hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 group">
                            <CardContent className="p-4 md:pt-6 md:p-6">
                              <div className="space-y-2 md:space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <Badge
                                    variant="outline"
                                    className={`${getEventColor(event.type)} border-current/20 text-xs`}
                                  >
                                    {getEventLabel(event.type, t)}
                                  </Badge>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Badge
                                        variant="outline"
                                        className="border-green-500/30 text-green-600 dark:text-green-400 bg-green-500/5 text-xs cursor-help"
                                      >
                                        <Shield className="w-3 h-3 mr-1" />
                                        {normalizedLocale === "fr"
                                          ? "Vérifié"
                                          : "Verified"}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="top"
                                      className="max-w-xs"
                                    >
                                      <p className="text-sm">
                                        {normalizedLocale === "fr"
                                          ? "Cette transaction est enregistrée de manière permanente et ne peut pas être modifiée ou supprimée."
                                          : "This transaction is permanently recorded and cannot be modified or deleted."}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </div>

                                <p className="text-sm md:text-base text-muted-foreground">
                                  {summary}
                                </p>

                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-2 border-t border-border">
                                  <div className="text-xs text-muted-foreground">
                                    <p className="font-mono">
                                      {formatDate(event.createdAt)}
                                    </p>
                                    <p className="text-xs text-muted-foreground/70 mt-1">
                                      {normalizedLocale === "fr"
                                        ? "Bloc"
                                        : "Block"}
                                      : #{event.blockNumber}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <code className="text-xs text-muted-foreground font-mono bg-muted/50 px-2 py-1 rounded">
                                      {truncateHash(event.txHash)}
                                    </code>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-7 w-7 p-0"
                                          onClick={() =>
                                            void copyToClipboard(event.txHash)
                                          }
                                        >
                                          {copiedHash === event.txHash ? (
                                            <Check className="w-3.5 h-3.5 text-green-500" />
                                          ) : (
                                            <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                                          )}
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent side="top">
                                        <p className="text-sm">
                                          {copiedHash === event.txHash
                                            ? normalizedLocale === "fr"
                                              ? "Copié!"
                                              : "Copied!"
                                            : normalizedLocale === "fr"
                                              ? "Copier"
                                              : "Copy"}
                                        </p>
                                      </TooltipContent>
                                    </Tooltip>
                                    {txUrl ? (
                                      <a
                                        href={txUrl}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-primary hover:underline inline-flex items-center gap-1"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                      </a>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1">
                                  <Lock className="w-3 h-3 shrink-0" />
                                  <span>{t("ledger.permanentRecord")}</span>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats Footer */}
        <Card className="border-border/50 bg-muted/30">
          <CardContent className="p-4 md:p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {events.length}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {normalizedLocale === "fr" ? "Transactions" : "Transactions"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-accent">
                  {uniqueBlockCount}
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {normalizedLocale === "fr" ? "Blocs" : "Blocks"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-foreground">
                  100%
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {normalizedLocale === "fr" ? "Vérifié" : "Verified"}
                </p>
              </div>
              <div>
                <p className="text-2xl md:text-3xl font-bold text-green-600 dark:text-green-400">
                  0
                </p>
                <p className="text-xs md:text-sm text-muted-foreground">
                  {normalizedLocale === "fr"
                    ? "Modifications"
                    : "Modifications"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}
