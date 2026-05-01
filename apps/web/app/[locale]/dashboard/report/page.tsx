"use client";

import { useState } from "react";
import { useQuery } from "@apollo/client";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Loader2,
  Download,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

import { Locale, useTranslations } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CELOSCAN_BASE } from "@/lib/config";
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import { GET_REPORT } from "@/lib/graphql/queries/report";
import { API_URL } from "@/lib/config";
import { DASHBOARD_REALTIME_POLL_INTERVAL_MS } from "@/lib/realtime";

type ReportData = {
  cooperativeName: string;
  walletAddress?: string | null;
  totalCollected: number;
  targetAmount: number;
  completionPercent: number;
  estimatedMonthsToGoal?: number | null;
  totalProposals: number;
  approvedProposals: number;
  rejectedProposals: number;
  pendingProposals: number;
  generatedAt: string;
};

export default function ReportPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();
  const [isDownloading, setIsDownloading] = useState(false);

  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES, {
    pollInterval: DASHBOARD_REALTIME_POLL_INTERVAL_MS,
  });
  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id;

  const {
    data: reportData,
    loading: loadingReport,
    error: reportError,
  } = useQuery(GET_REPORT, {
    variables: {
      cooperativeId,
    },
    skip: !cooperativeId,
    pollInterval: DASHBOARD_REALTIME_POLL_INTERVAL_MS,
  });

  const report: ReportData | undefined = reportData?.report;
  const isInitialReportLoading = loadingReport && !reportData?.report;

  const handleDownloadReport = async () => {
    if (!cooperativeId) {
      toast.error(t("errors.cooperativeNotFound"));
      return;
    }

    setIsDownloading(true);
    try {
      const token = session?.user?.token;
      if (!token) {
        toast.error(t("errors.notAuthenticated"));
        setIsDownloading(false);
        return;
      }

      const response = await fetch(
        `${API_URL}/api/v1/reports/cooperative/${cooperativeId}/csv?locale=${locale}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const errorMsg = `HTTP ${response.status}: ${response.statusText}`;
        toast.error(t("errors.downloadFailed"));
        console.error("Download failed:", errorMsg);
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = new Date().toISOString().split("T")[0];
      a.download = `coopenergie-report-${dateStr}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(t("feedback.reportDownloaded"));
    } catch (error) {
      console.error("Download failed:", error);
      toast.error(t("errors.downloadFailed"));
    } finally {
      setIsDownloading(false);
    }
  };

  if (!session?.user) {
    return null;
  }

  if (isInitialReportLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (reportError || !report) {
    return (
      <Card className="border-destructive/50 bg-destructive/10">
        <CardContent className="pt-6">
          <p className="text-destructive">{t("errors.reportLoadFailed")}</p>
        </CardContent>
      </Card>
    );
  }

  const celoScanAddressUrl = report.walletAddress
    ? `${CELOSCAN_BASE}/address/${report.walletAddress}`
    : "";

  const pendingProposals = report.pendingProposals;
  const rejectedProposals =
    report.totalProposals - report.approvedProposals - pendingProposals;
  const generatedAtDate = new Date(report.generatedAt).toLocaleDateString(
    locale === "en" ? "en-US" : "fr-FR",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    },
  );

  return (
    <div className="space-y-6 md:space-y-8 print:space-y-4">
      {/* Header Section */}
      <div className="space-y-4 border-b border-border pb-4 md:pb-6 print:pb-4 print:border-gray-300">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl md:text-4xl font-bold text-foreground print:text-black">
              {t("report.title")}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground print:text-gray-600">
              {t("report.reportCard")}
            </p>
          </div>
          <Button
            onClick={handleDownloadReport}
            disabled={isDownloading}
            className="bg-linear-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white shadow-lg btn-glow w-full sm:w-fit print:hidden group min-h-11"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {t("report.downloading")}
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform duration-300" />
                {t("report.downloadReport")}
              </>
            )}
          </Button>
        </div>
        <div className="space-y-2 text-sm text-muted-foreground print:text-gray-600">
          <p className="font-medium">
            {t("report.cooperative")}:{" "}
            <span className="font-bold text-foreground print:text-black">
              {report.cooperativeName}
            </span>
          </p>
          {report.walletAddress && (
            <div className="flex items-center gap-2">
              <span>{t("report.walletAddress")}:</span>
              <code className="font-mono text-xs bg-muted/50 px-2 py-1 rounded">
                {report.walletAddress.slice(0, 8)}...
                {report.walletAddress.slice(-8)}
              </code>
              <a
                href={celoScanAddressUrl}
                target="_blank"
                rel="noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 text-xs"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}
          <p>
            {t("report.generateDate")}: {generatedAtDate}
          </p>
        </div>
      </div>

      {/* Main Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 print:gap-4">
        {/* Funding Status Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur print:border-gray-300 print:bg-white card-hover-glow overflow-hidden relative">
          <CardHeader className="p-4 md:p-6 print:pb-2">
            <CardTitle className="text-lg md:text-xl print:text-lg">
              {t("report.fundingProgress")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6 print:space-y-4">
            {/* Total Collected */}
            <div className="space-y-2 border-b border-border pb-3 md:pb-4 print:border-gray-200 print:pb-3">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.totalCollected")}
              </p>
              <p className="text-2xl md:text-4xl font-bold text-primary print:text-black">
                {report.totalCollected.toLocaleString()} FCFA
              </p>
            </div>

            {/* Target Amount */}
            <div className="space-y-2 border-b border-border pb-3 md:pb-4 print:border-gray-200 print:pb-3">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.targetAmount")}
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground print:text-black">
                {report.targetAmount.toLocaleString()} FCFA
              </p>
            </div>

            {/* Completion Percentage */}
            <div className="space-y-2 border-b border-border pb-3 md:pb-4 print:border-gray-200 print:pb-3">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.completion")}
              </p>
              <div className="flex items-center gap-3">
                <div className="w-full h-3 md:h-4 bg-muted rounded-full overflow-hidden shadow-inner print:h-3">
                  <div
                    className="h-full bg-linear-to-r from-emerald-500 via-green-500 to-amber-500 transition-all duration-700 shadow-lg"
                    style={{ width: `${report.completionPercent}%` }}
                  />
                </div>
                <span className="text-xl md:text-2xl font-bold text-primary min-w-fit print:text-lg print:text-black">
                  {Math.round(report.completionPercent)}%
                </span>
              </div>
            </div>

            {/* Estimated Time to Goal */}
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.estimatedTimeToGoal")}
              </p>
              <p className="text-xl md:text-2xl font-bold text-accent print:text-black">
                {report.estimatedMonthsToGoal !== null &&
                report.estimatedMonthsToGoal !== undefined
                  ? Math.round(report.estimatedMonthsToGoal)
                  : "∞"}{" "}
                {t("report.monthsRemaining")}
              </p>
              <p className="text-xs text-muted-foreground print:text-gray-600">
                {t("report.atCurrentRate")}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Proposal Summary Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur print:border-gray-300 print:bg-white card-hover-glow overflow-hidden relative">
          <CardHeader className="p-4 md:p-6 print:pb-2">
            <CardTitle className="text-lg md:text-xl print:text-lg">
              {t("report.proposalSummary")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4 print:space-y-3">
            {/* Total Proposals */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg print:bg-gray-100 print:p-2">
              <span className="text-sm md:text-base text-muted-foreground font-medium print:text-gray-700">
                {t("report.totalProposals")}
              </span>
              <span className="text-xl md:text-2xl font-bold text-foreground print:text-black print:text-xl">
                {report.totalProposals}
              </span>
            </div>

            {/* Approved Proposals */}
            <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg print:bg-gray-100 print:p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 md:w-5 md:h-5 text-primary print:text-gray-700" />
                <span className="text-sm md:text-base text-foreground font-medium print:text-gray-700">
                  {t("report.approvedProposals")}
                </span>
              </div>
              <Badge className="bg-primary hover:bg-accent text-primary-foreground print:bg-gray-600 print:text-white">
                {report.approvedProposals}
              </Badge>
            </div>

            {/* Pending Proposals */}
            <div className="flex items-center justify-between p-3 bg-amber-100/20 rounded-lg print:bg-gray-100 print:p-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 md:w-5 md:h-5 text-amber-600 dark:text-amber-400 print:text-gray-700" />
                <span className="text-sm md:text-base text-foreground font-medium print:text-gray-700">
                  {t("report.pendingProposals")}
                </span>
              </div>
              <Badge
                variant="outline"
                className="border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400 print:border-gray-600 print:text-gray-700"
              >
                {pendingProposals}
              </Badge>
            </div>

            {/* Rejected Proposals */}
            <div className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg print:bg-gray-100 print:p-2">
              <div className="flex items-center gap-2">
                <XCircle className="w-4 h-4 md:w-5 md:h-5 text-destructive print:text-gray-700" />
                <span className="text-sm md:text-base text-foreground font-medium print:text-gray-700">
                  {t("report.rejectedProposals")}
                </span>
              </div>
              <Badge
                variant="outline"
                className="border-destructive text-destructive print:border-gray-600 print:text-gray-700"
              >
                {rejectedProposals}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transparency Section */}
      <Card className="border-border bg-linear-to-br from-primary/10 to-accent/10 print:border-gray-300 print:bg-gray-50">
        <CardContent className="pt-6 print:pt-4">
          <div className="text-center space-y-2">
            <p className="text-sm font-medium text-primary uppercase tracking-wide print:text-gray-700">
              {t("report.transparency")}
            </p>
            <p className="text-lg text-muted-foreground print:text-gray-600">
              {t("report.transparencyDesc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-muted-foreground border-t border-border pt-4 print:pt-3 print:border-gray-300 print:text-gray-600">
        <p>{t("report.generatedBy")}</p>
        <p>
          &copy; {new Date().getFullYear()} {report.cooperativeName}
        </p>
      </div>
    </div>
  );
}
