"use client";

import { useMemo, useState } from "react";

import { useQuery, useSubscription } from "@apollo/client";
import { Calendar, Copy, ExternalLink, Plus } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CELOSCAN_BASE } from "@/lib/config";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import { GET_CONTRIBUTIONS } from "@/lib/graphql/queries/contributions";
import { SUBSCRIPTION_ON_CONTRIBUTION } from "@/lib/graphql/subscriptions/cooperative";
import { detectCameroonMobileMoney } from "@/lib/phone-utils";
import { Locale, useTranslations } from "@/lib/translations";
import { restClient } from "@/lib/rest-client";

type Contribution = {
  id: string;
  amountXAF: number;
  txHash?: string | null;
  status: string;
  createdAt: string;
  userName?: string | null;
};

type InitiatePaymentResponse = {
  paymentId: string;
  reference: string;
  status: string;
  message: string;
};

function formatXaf(amount: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amount)} FCFA`;
}

function formatDate(value: string): string {
  return new Date(value).toLocaleString();
}

function truncateHash(hash?: string | null): string {
  if (!hash) {
    return "-";
  }
  if (hash.length <= 16) {
    return hash;
  }
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

export default function ContributionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);

  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES);
  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id;

  const {
    data: contributionsData,
    loading: contributionsLoading,
    refetch: refetchContributions,
  } = useQuery(GET_CONTRIBUTIONS, {
    variables: { cooperativeId },
    skip: !cooperativeId,
  });

  useSubscription(SUBSCRIPTION_ON_CONTRIBUTION, {
    variables: { cooperativeId },
    skip: !cooperativeId,
    onData: () => {
      void refetchContributions();
    },
  });

  const contributions: Contribution[] = contributionsData?.contributions ?? [];

  const totalCollected = useMemo(
    () => contributions.reduce((sum, item) => sum + item.amountXAF, 0),
    [contributions],
  );

  const targetAmount = 5000000;
  const progressPercent =
    targetAmount > 0 ? Math.min((totalCollected / targetAmount) * 100, 100) : 0;

  const copyToClipboard = async (hash: string) => {
    try {
      await navigator.clipboard.writeText(hash);
      setCopiedHash(hash);
      setTimeout(() => setCopiedHash(null), 1500);
      toast.success(t("feedback.hashCopied"));
    } catch {
      toast.error(t("errors.copyFailed"));
    }
  };

  const handleAddContribution = async () => {
    const amountNumber = Number(amount);
    const detectedCarrier = detectCameroonMobileMoney(phoneNumber);

    if (!cooperativeId || !amountNumber || amountNumber <= 0) {
      toast.error(t("errors.invalidAmount"));
      return;
    }

    if (!detectedCarrier) {
      toast.error(t("errors.phoneRequired"));
      return;
    }

    setIsSubmitting(true);
    try {
      const idempotencyKey = `payment-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const response = await restClient.post<InitiatePaymentResponse>(
        "/payments/initiate",
        {
          cooperativeId,
          amountXAF: amountNumber,
          idempotencyKey,
          phoneNumber: detectedCarrier.normalizedPhone,
        },
      );

      setAmount("");
      setPhoneNumber("");
      setIsOpen(false);

      const query = new URLSearchParams({
        paymentId: response.paymentId,
        cooperativeId,
        amountXAF: amountNumber.toString(),
        phone: detectedCarrier.normalizedPhone,
      });
      router.push(`/${locale}/dashboard/contributions/payment?${query.toString()}`);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("errors.contributionFailed"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t("contributions.title")}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {t("contributions.description")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Button
            onClick={() => setIsOpen(true)}
            disabled={!cooperativeId}
            className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-lg btn-glow w-full sm:w-fit group min-h-[44px] active:animate-button-press ring-2 ring-primary/30 ring-offset-2 ring-offset-background"
          >
            <Plus className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform duration-300" />
            {t("contributions.addContribution")}
          </Button>
        </div>
      </div>

      <Card className="border-border/50 bg-gradient-to-br from-card via-card to-primary/5 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <CardContent className="p-4 md:p-6 relative">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                {t("contributions.totalCollected")}
              </span>
              <span className="text-lg font-bold text-gradient-green">
                {formatXaf(totalCollected)}
              </span>
            </div>
            <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-amber-500 rounded-full shadow-lg transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                {Math.round(progressPercent)}%{" "}
                {t("contributions.completeLabel")}
              </span>
              <span>
                {t("contributions.goalLabel")}: {formatXaf(targetAmount)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50 bg-card/50 backdrop-blur overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-full blur-3xl" />
        <CardHeader className="relative p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">
            {t("contributions.title")}
          </CardTitle>
        </CardHeader>
        <CardContent className="relative p-4 md:p-6 pt-0">
          {contributionsLoading ? (
            <div className="py-8 flex items-center justify-center">
              <Spinner className="h-6 w-6" />
            </div>
          ) : contributions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              {t("contributions.noContributions")}
            </p>
          ) : (
            <>
              <div className="hidden md:block overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead>{t("contributions.user")}</TableHead>
                      <TableHead>{t("contributions.amount")}</TableHead>
                      <TableHead>{t("contributions.txHashHeader")}</TableHead>
                      <TableHead>{t("contributions.date")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contributions.map((contribution) => {
                      const txHash = contribution.txHash ?? null;
                      const txUrl = txHash
                        ? `${CELOSCAN_BASE}/tx/${txHash}`
                        : null;

                      return (
                        <TableRow
                          key={contribution.id}
                          className="border-border/50 transition-all duration-300 hover:bg-primary/5 hover:translate-x-1 group"
                        >
                          <TableCell className="font-medium group-hover:text-primary transition-colors">
                            {contribution.userName ||
                              t("common.defaultMemberLabel")}
                          </TableCell>
                          <TableCell className="font-semibold text-gradient-green">
                            {formatXaf(contribution.amountXAF)}
                          </TableCell>
                          <TableCell>
                            {txHash ? (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs">
                                  {truncateHash(txHash)}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => void copyToClipboard(txHash)}
                                  title={
                                    copiedHash === txHash
                                      ? t("feedback.hashCopied")
                                      : t("common.copy")
                                  }
                                >
                                  <Copy className="h-3.5 w-3.5" />
                                </Button>
                                <a
                                  href={txUrl ?? "#"}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                                >
                                  {t("blockchain.viewOnCeloScan")}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {formatDate(contribution.createdAt)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="md:hidden space-y-3">
                {contributions.map((contribution) => {
                  const txHash = contribution.txHash ?? null;
                  const txUrl = txHash ? `${CELOSCAN_BASE}/tx/${txHash}` : null;

                  return (
                    <div
                      key={contribution.id}
                      className="p-4 rounded-xl bg-muted/30 border border-border/50 space-y-3 transition-all duration-300 active:scale-[0.98]"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {contribution.userName ||
                            t("common.defaultMemberLabel")}
                        </span>
                        <Badge className="bg-gradient-to-r from-emerald-500 to-green-600 text-white border-0">
                          {formatXaf(contribution.amountXAF)}
                        </Badge>
                      </div>

                      <div className="text-sm text-muted-foreground flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(contribution.createdAt)}</span>
                      </div>

                      <div className="text-sm flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs">
                          {truncateHash(txHash)}
                        </span>
                        {txHash ? (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => void copyToClipboard(txHash)}
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <a
                              href={txUrl ?? "#"}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
                            >
                              CeloScan
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="bg-card border-border sm:max-w-md w-[calc(100%-2rem)] mx-auto rounded-t-2xl sm:rounded-lg fixed bottom-0 sm:bottom-auto sm:top-1/2 sm:-translate-y-1/2 left-1/2 -translate-x-1/2 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("contributions.addNewContribution")}</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {t("contributions.addDescription")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                {t("contributions.user")}
              </label>
              <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 text-foreground font-medium">
                {session.user.name || session.user.email || "Member"}
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-foreground"
              >
                {t("contributions.amount")}
              </label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  placeholder={t("contributions.amountPlaceholder")}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pr-16 bg-input border-border text-foreground h-12 text-base"
                  min="100"
                  step="100"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium text-sm">
                  FCFA
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label
                htmlFor="phoneNumber"
                className="text-sm font-medium text-foreground"
              >
                {t("profile.phoneNumber")}
              </label>
              <Input
                id="phoneNumber"
                type="tel"
                placeholder={t("profile.phonePlaceholder")}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="bg-input border-border text-foreground h-12 text-base"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1 border-border hover:bg-muted min-h-[44px]"
                disabled={isSubmitting}
              >
                {t("common.cancel")}
              </Button>
              <Button
                onClick={() => void handleAddContribution()}
                disabled={!amount || !phoneNumber.trim() || isSubmitting || !cooperativeId}
                className="flex-1 bg-primary hover:bg-accent text-primary-foreground min-h-[44px] active:animate-button-press"
              >
                {isSubmitting ? (
                  <>
                    <Spinner className="mr-2" />
                    {locale === "fr" ? "En cours..." : "Submitting..."}
                  </>
                ) : (
                  t("common.submit")
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
