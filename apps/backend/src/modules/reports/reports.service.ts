import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { ContributionStatus, ProposalStatus } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

type ReportLocale = "fr" | "en";

type StructuredReport = {
  metadata: {
    cooperativeId: string;
    cooperativeName: string;
    generatedAt: string;
    locale: ReportLocale;
    vaultAddress: string | null;
    celoScanUrl: string | null;
  };
  financial: {
    targetAmountXAF: number;
    totalCollectedXAF: number;
    confirmedBalanceXAF: number;
    successfulPaymentsCount: number;
    successfulPaymentsAmountXAF: number;
    contributionsCount: number;
    averageContributionXAF: number;
  };
  governance: {
    totalProposals: number;
    approvedProposals: number;
    rejectedProposals: number;
    pendingProposals: number;
    totalVotes: number;
    memberCount: number;
    voteParticipationPercent: number;
  };
};

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateReport(
    cooperativeId: string,
    userId: string,
    locale: ReportLocale = "fr",
  ): Promise<StructuredReport> {
    await this.assertMembership(userId, cooperativeId);

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        name: true,
        vaultAddress: true,
        celoScanUrl: true,
        targetAmountXAF: true,
        confirmedBalanceXAF: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    const [
      contributionsAggregate,
      contributionsCount,
      successfulPaymentsAggregate,
      successfulPaymentsCount,
      proposalCounts,
      totalVotes,
      memberCount,
    ] = await Promise.all([
      this.prisma.contribution.aggregate({
        where: {
          cooperativeId,
          status: ContributionStatus.CONFIRMED,
        },
        _sum: {
          amountXAF: true,
        },
      }),
      this.prisma.contribution.count({
        where: {
          cooperativeId,
          status: ContributionStatus.CONFIRMED,
        },
      }),
      this.prisma.payment.aggregate({
        where: {
          cooperativeId,
          status: "SUCCESS",
        },
        _sum: {
          amountXAF: true,
        },
      }),
      this.prisma.payment.count({
        where: {
          cooperativeId,
          status: "SUCCESS",
        },
      }),
      this.prisma.proposal.groupBy({
        by: ["status"],
        where: {
          cooperativeId,
        },
        _count: {
          _all: true,
        },
      }),
      this.prisma.vote.count({
        where: {
          proposal: {
            cooperativeId,
          },
        },
      }),
      this.prisma.membership.count({
        where: {
          cooperativeId,
        },
      }),
    ]);

    const totalCollectedXAF = contributionsAggregate._sum.amountXAF ?? 0;
    const successfulPaymentsAmountXAF =
      successfulPaymentsAggregate._sum.amountXAF ?? 0;
    const approvedProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.APPROVED)
        ?._count._all ?? 0;
    const rejectedProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.REJECTED)
        ?._count._all ?? 0;
    const pendingProposals =
      proposalCounts.find((entry) => entry.status === ProposalStatus.PENDING)
        ?._count._all ?? 0;
    const totalProposals =
      approvedProposals + rejectedProposals + pendingProposals;
    const voteParticipationPercent =
      memberCount > 0 && totalProposals > 0
        ? Number(
            ((totalVotes / (memberCount * totalProposals)) * 100).toFixed(2),
          )
        : 0;

    return {
      metadata: {
        cooperativeId: cooperative.id,
        cooperativeName: cooperative.name,
        generatedAt: new Date().toISOString(),
        locale,
        vaultAddress: cooperative.vaultAddress,
        celoScanUrl:
          cooperative.celoScanUrl ??
          (cooperative.vaultAddress
            ? `${(
                process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() ||
                "https://celo-sepolia.blockscout.com"
              ).replace(/\/+$/, "")}/address/${cooperative.vaultAddress}`
            : null),
      },
      financial: {
        targetAmountXAF: cooperative.targetAmountXAF,
        totalCollectedXAF,
        confirmedBalanceXAF: cooperative.confirmedBalanceXAF,
        successfulPaymentsCount,
        successfulPaymentsAmountXAF,
        contributionsCount,
        averageContributionXAF:
          contributionsCount > 0
            ? Number((totalCollectedXAF / contributionsCount).toFixed(2))
            : 0,
      },
      governance: {
        totalProposals,
        approvedProposals,
        rejectedProposals,
        pendingProposals,
        totalVotes,
        memberCount,
        voteParticipationPercent,
      },
    };
  }

  async generateCsv(
    cooperativeId: string,
    userId: string,
    locale: ReportLocale = "fr",
  ) {
    const report = await this.generateReport(cooperativeId, userId, locale);
    const i18n = this.getTranslations(locale);

    const rows: string[][] = [
      [
        "Section",
        "Catégorie/Category",
        "Indicateur/Metric",
        "Valeur/Value",
        "Unité/Unit",
        "Notes",
      ],
      [
        "Métadonnées",
        "Coopérative",
        "Nom",
        report.metadata.cooperativeName,
        "",
        "",
      ],
      [
        "Métadonnées",
        "Rapport",
        "Date générée",
        report.metadata.generatedAt,
        "",
        "",
      ],
      [
        "Métadonnées",
        "Blockchain",
        "Adresse portefeuille",
        report.metadata.vaultAddress ?? "",
        "CeloScan",
        report.metadata.celoScanUrl ?? "",
      ],
      ["Métadonnées", "Langue", "Locale", report.metadata.locale, "", ""],
      ["", "", "", "", "", ""],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.target,
        String(report.financial.targetAmountXAF),
        "XAF",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.collected,
        String(report.financial.totalCollectedXAF),
        "XAF",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.confirmedBalance,
        String(report.financial.confirmedBalanceXAF),
        "XAF",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.successfulPaymentsCount,
        String(report.financial.successfulPaymentsCount),
        "",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.successfulPaymentsAmount,
        String(report.financial.successfulPaymentsAmountXAF),
        "XAF",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.contributionsCount,
        String(report.financial.contributionsCount),
        "",
        "",
      ],
      [
        i18n.financial.section,
        i18n.financial.category,
        i18n.financial.avgContribution,
        String(report.financial.averageContributionXAF),
        "XAF",
        "",
      ],
      ["", "", "", "", "", ""],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.totalProposals,
        String(report.governance.totalProposals),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.approved,
        String(report.governance.approvedProposals),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.rejected,
        String(report.governance.rejectedProposals),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.pending,
        String(report.governance.pendingProposals),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.totalVotes,
        String(report.governance.totalVotes),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.memberCount,
        String(report.governance.memberCount),
        "",
        "",
      ],
      [
        i18n.governance.section,
        i18n.governance.category,
        i18n.governance.participation,
        String(report.governance.voteParticipationPercent),
        "%",
        "",
      ],
    ];

    const csv = rows
      .map((row) => row.map((value) => this.escapeCsv(value)).join(","))
      .join("\n");

    return `\uFEFF${csv}`;
  }

  private getTranslations(locale: ReportLocale) {
    if (locale === "en") {
      return {
        financial: {
          section: "Financial",
          category: "Finance",
          target: "Target amount",
          collected: "Total collected",
          confirmedBalance: "Confirmed balance",
          successfulPaymentsCount: "Successful payments count",
          successfulPaymentsAmount: "Successful payments amount",
          contributionsCount: "Confirmed contributions count",
          avgContribution: "Average contribution",
        },
        governance: {
          section: "Governance",
          category: "Voting",
          totalProposals: "Total proposals",
          approved: "Approved proposals",
          rejected: "Rejected proposals",
          pending: "Pending proposals",
          totalVotes: "Total votes",
          memberCount: "Members",
          participation: "Vote participation",
        },
      };
    }

    return {
      financial: {
        section: "Financier",
        category: "Finance",
        target: "Montant cible",
        collected: "Total collecté",
        confirmedBalance: "Solde confirmé",
        successfulPaymentsCount: "Nombre de paiements réussis",
        successfulPaymentsAmount: "Montant des paiements réussis",
        contributionsCount: "Nombre de contributions confirmées",
        avgContribution: "Contribution moyenne",
      },
      governance: {
        section: "Gouvernance",
        category: "Vote",
        totalProposals: "Nombre total de propositions",
        approved: "Propositions approuvées",
        rejected: "Propositions rejetées",
        pending: "Propositions en attente",
        totalVotes: "Nombre total de votes",
        memberCount: "Membres",
        participation: "Participation au vote",
      },
    };
  }

  private escapeCsv(value: string) {
    const normalized = (value ?? "").toString();
    const escaped = normalized.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  private async assertMembership(userId: string, cooperativeId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId,
        },
      },
      select: {
        userId: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }
  }
}
