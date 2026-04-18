"use client";

import { useParams } from "next/navigation";
import { Locale, useTranslations } from "@/lib/translations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Download, CheckCircle, XCircle, Clock } from "lucide-react";

export default function ReportPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);

  // Mock data
  const cooperativeName = "Solar Communities Douala";
  const totalCollected = 3750000;
  const targetAmount = 5000000;
  const completionPercent = (totalCollected / targetAmount) * 100;
  const monthsToGoal = 3;

  const proposalStats = {
    total: 8,
    approved: 3,
    rejected: 2,
    pending: 3,
  };

  const currentDate = new Date().toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Escape CSV values (handle commas, quotes, newlines)
  const escapeCSV = (value: string) => {
    if (value.includes(",") || value.includes('"') || value.includes("\n") || value.includes(";")) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  };

  // Generate CSV report data for download - NGO/Reporting friendly format
  const generateReportCSV = () => {
    const generatedDate = new Date().toISOString();
    const dateFormatted = new Date().toLocaleDateString(locale === "en" ? "en-US" : "fr-FR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });

    // Metadata section
    const metadataSection = locale === "fr" 
      ? [
          ["# RAPPORT COOPENERGIE"],
          ["# Cooperative:", cooperativeName],
          ["# Date de Generation:", generatedDate],
          ["# Langue:", "Francais"],
          ["# Version:", "1.0"],
          [""],
        ]
      : [
          ["# COOPENERGIE REPORT"],
          ["# Cooperative:", cooperativeName],
          ["# Generated Date:", generatedDate],
          ["# Language:", "English"],
          ["# Version:", "1.0"],
          [""],
        ];

    // Headers
    const headers = locale === "fr" 
      ? ["Section", "Categorie", "Metrique", "Valeur", "Unite", "Notes"]
      : ["Section", "Category", "Metric", "Value", "Unit", "Notes"];
    
    // Data rows with sections
    const dataRows = [
      // === METADATA SECTION ===
      [
        locale === "fr" ? "Metadata" : "Metadata",
        locale === "fr" ? "Informations" : "Information",
        locale === "fr" ? "Nom de la Cooperative" : "Cooperative Name",
        cooperativeName,
        "",
        ""
      ],
      [
        locale === "fr" ? "Metadata" : "Metadata",
        locale === "fr" ? "Informations" : "Information",
        locale === "fr" ? "Date du Rapport" : "Report Date",
        dateFormatted,
        "",
        ""
      ],
      [
        locale === "fr" ? "Metadata" : "Metadata",
        locale === "fr" ? "Informations" : "Information",
        locale === "fr" ? "Horodatage de Generation" : "Generation Timestamp",
        generatedDate,
        "ISO 8601",
        ""
      ],
      [
        locale === "fr" ? "Metadata" : "Metadata",
        locale === "fr" ? "Informations" : "Information",
        locale === "fr" ? "Langue du Rapport" : "Report Language",
        locale === "fr" ? "Francais" : "English",
        "",
        ""
      ],
      // === FINANCIAL SECTION ===
      [
        locale === "fr" ? "Financier" : "Financial",
        locale === "fr" ? "Collecte de Fonds" : "Fundraising",
        locale === "fr" ? "Total Collecte" : "Total Collected",
        totalCollected.toString(),
        "FCFA",
        locale === "fr" ? "Montant total recu des membres" : "Total amount received from members"
      ],
      [
        locale === "fr" ? "Financier" : "Financial",
        locale === "fr" ? "Collecte de Fonds" : "Fundraising",
        locale === "fr" ? "Montant Cible" : "Target Amount",
        targetAmount.toString(),
        "FCFA",
        locale === "fr" ? "Objectif de financement du projet" : "Project funding goal"
      ],
      [
        locale === "fr" ? "Financier" : "Financial",
        locale === "fr" ? "Collecte de Fonds" : "Fundraising",
        locale === "fr" ? "Montant Restant" : "Remaining Amount",
        (targetAmount - totalCollected).toString(),
        "FCFA",
        locale === "fr" ? "Montant encore necessaire" : "Amount still needed"
      ],
      [
        locale === "fr" ? "Financier" : "Financial",
        locale === "fr" ? "Progression" : "Progress",
        locale === "fr" ? "Pourcentage Complete" : "Completion Percentage",
        Math.round(completionPercent).toString(),
        "%",
        locale === "fr" ? "Progression vers l'objectif" : "Progress towards goal"
      ],
      [
        locale === "fr" ? "Financier" : "Financial",
        locale === "fr" ? "Projection" : "Projection",
        locale === "fr" ? "Mois Estimes jusqu'a l'Objectif" : "Estimated Months to Goal",
        monthsToGoal.toString(),
        locale === "fr" ? "mois" : "months",
        locale === "fr" ? "Base sur le taux de contribution actuel" : "Based on current contribution rate"
      ],
      // === GOVERNANCE SECTION ===
      [
        locale === "fr" ? "Gouvernance" : "Governance",
        locale === "fr" ? "Propositions" : "Proposals",
        locale === "fr" ? "Total des Propositions" : "Total Proposals",
        proposalStats.total.toString(),
        locale === "fr" ? "nombre" : "count",
        locale === "fr" ? "Nombre total de propositions soumises" : "Total number of proposals submitted"
      ],
      [
        locale === "fr" ? "Gouvernance" : "Governance",
        locale === "fr" ? "Propositions" : "Proposals",
        locale === "fr" ? "Propositions Approuvees" : "Approved Proposals",
        proposalStats.approved.toString(),
        locale === "fr" ? "nombre" : "count",
        locale === "fr" ? "Propositions acceptees par vote" : "Proposals accepted by vote"
      ],
      [
        locale === "fr" ? "Gouvernance" : "Governance",
        locale === "fr" ? "Propositions" : "Proposals",
        locale === "fr" ? "Propositions en Attente" : "Pending Proposals",
        proposalStats.pending.toString(),
        locale === "fr" ? "nombre" : "count",
        locale === "fr" ? "Propositions en cours de vote" : "Proposals currently being voted on"
      ],
      [
        locale === "fr" ? "Gouvernance" : "Governance",
        locale === "fr" ? "Propositions" : "Proposals",
        locale === "fr" ? "Propositions Rejetees" : "Rejected Proposals",
        proposalStats.rejected.toString(),
        locale === "fr" ? "nombre" : "count",
        locale === "fr" ? "Propositions refusees par vote" : "Proposals rejected by vote"
      ],
      [
        locale === "fr" ? "Gouvernance" : "Governance",
        locale === "fr" ? "Statistiques" : "Statistics",
        locale === "fr" ? "Taux d'Approbation" : "Approval Rate",
        proposalStats.total > 0 ? Math.round((proposalStats.approved / proposalStats.total) * 100).toString() : "0",
        "%",
        locale === "fr" ? "Pourcentage de propositions approuvees" : "Percentage of proposals approved"
      ],
    ];

    // Build CSV content
    const csvLines: string[] = [];
    
    // Add metadata header comments
    metadataSection.forEach(line => {
      csvLines.push(line.map(escapeCSV).join(","));
    });

    // Add data headers
    csvLines.push(headers.map(escapeCSV).join(","));
    
    // Add empty row for visual separation
    csvLines.push("");

    // Add data rows
    dataRows.forEach(row => {
      csvLines.push(row.map(escapeCSV).join(","));
    });

    // Add footer
    csvLines.push("");
    csvLines.push(locale === "fr" 
      ? "# Genere par CoopEnergie - Plateforme de Transparence Cooperative"
      : "# Generated by CoopEnergie - Cooperative Transparency Platform"
    );
    csvLines.push(`# ${new Date().getFullYear()} ${cooperativeName}`);

    // Add BOM for Excel/Google Sheets UTF-8 compatibility
    return "\uFEFF" + csvLines.join("\n");
  };

  const handleDownloadReport = () => {
    const csvData = generateReportCSV();
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    // Standardized filename: coopenergie-report-YYYY-MM-DD.csv
    const dateStr = new Date().toISOString().split("T")[0];
    a.download = `coopenergie-report-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

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
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg btn-glow w-full sm:w-fit print:hidden group min-h-[44px]"
          >
            <Download className="w-4 h-4 mr-2 group-hover:translate-y-0.5 transition-transform duration-300" />
            {t("report.downloadReport")}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground print:text-gray-600">
          <p className="font-medium">
            {t("report.cooperative")}: <span className="font-bold text-foreground print:text-black">{cooperativeName}</span>
          </p>
          <p>
            {t("report.generateDate")}: {currentDate}
          </p>
        </div>
      </div>

      {/* Main Report Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 print:gap-4">
        {/* Funding Status Card */}
        <Card className="border-border/50 bg-card/50 backdrop-blur print:border-gray-300 print:bg-white card-hover-glow overflow-hidden relative">
          <CardHeader className="p-4 md:p-6 print:pb-2">
            <CardTitle className="text-lg md:text-xl print:text-lg">{t("report.fundingProgress")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-4 md:space-y-6 print:space-y-4">
            {/* Total Collected */}
            <div className="space-y-2 border-b border-border pb-3 md:pb-4 print:border-gray-200 print:pb-3">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.totalCollected")}
              </p>
              <p className="text-2xl md:text-4xl font-bold text-primary print:text-black">
                {totalCollected.toLocaleString()} FCFA
              </p>
            </div>

            {/* Target Amount */}
            <div className="space-y-2 border-b border-border pb-3 md:pb-4 print:border-gray-200 print:pb-3">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.targetAmount")}
              </p>
              <p className="text-xl md:text-2xl font-bold text-foreground print:text-black">
                {targetAmount.toLocaleString()} FCFA
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
                    className="h-full bg-gradient-to-r from-emerald-500 via-green-500 to-amber-500 transition-all duration-700 shadow-lg"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <span className="text-xl md:text-2xl font-bold text-primary min-w-fit print:text-lg print:text-black">
                  {Math.round(completionPercent)}%
                </span>
              </div>
            </div>

            {/* Estimated Time to Goal */}
            <div className="space-y-2">
              <p className="text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide print:text-gray-600">
                {t("report.estimatedTimeToGoal")}
              </p>
              <p className="text-xl md:text-2xl font-bold text-accent print:text-black">
                {monthsToGoal} {t("report.monthsRemaining")}
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
            <CardTitle className="text-lg md:text-xl print:text-lg">{t("report.proposalSummary")}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0 space-y-3 md:space-y-4 print:space-y-3">
            {/* Total Proposals */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg print:bg-gray-100 print:p-2">
              <span className="text-sm md:text-base text-muted-foreground font-medium print:text-gray-700">
                {t("report.totalProposals")}
              </span>
              <span className="text-xl md:text-2xl font-bold text-foreground print:text-black print:text-xl">
                {proposalStats.total}
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
                {proposalStats.approved}
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
              <Badge variant="outline" className="border-amber-600 text-amber-600 dark:border-amber-400 dark:text-amber-400 print:border-gray-600 print:text-gray-700">
                {proposalStats.pending}
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
              <Badge variant="outline" className="border-destructive text-destructive print:border-gray-600 print:text-gray-700">
                {proposalStats.rejected}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transparency Section */}
      <Card className="border-border bg-gradient-to-br from-primary/10 to-accent/10 print:border-gray-300 print:bg-gray-50">
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
        <p>&copy; {new Date().getFullYear()} Solar Communities Douala</p>
      </div>
    </div>
  );
}
