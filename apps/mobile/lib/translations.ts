import { useMemo } from "react";

const translations = {
  en: {
    auth: {
      loginSubtitle: "Sign in to your cooperative.",
      registerTitle: "Register",
      registerSubtitle: "Create your CoopEnergie account.",
      processingInvitation: "Processing your invitation...",
      emailPlaceholder: "name@example.com",
      passwordPlaceholder: "Enter your password",
      namePlaceholder: "Your name",
      createAccount: "Create an account",
      backToLogin: "Back to login",
    },
    common: {
      email: "Email",
      password: "Password",
      name: "Name",
      login: "Login",
      register: "Register",
      contribute: "Contribute",
      copy: "Copy",
      close: "Close",
      cancel: "Cancel",
      submit: "Submit",
      cooperative: "Cooperative",
      members: "Members",
      recentActivity: "Recent Activity",
      walletAddress: "Wallet Address",
    },
    tabs: {
      dashboard: "Dashboard",
      contributions: "Contributions",
      proposals: "Proposals",
      ledger: "Ledger",
      report: "Report",
    },
    errors: {
      loginFailed: "Login failed",
      registrationFailed: "Registration failed",
      invalidInvitation: "Invalid invitation",
      missingInvitationToken: "The invitation token is missing.",
      unknownError: "An error occurred.",
      invalidAmount: "Invalid amount",
      enterValidAmount: "Enter a valid amount.",
      contributionFailed: "Unable to contribute.",
      voteFailed: "Unable to vote.",
      invalidFormValues: "Enter a title and a description.",
      proposalFailed: "Unable to create proposal.",
      csvFailed: "Unable to download the CSV.",
      error: "Error",
    },
    feedback: {
      contributionQueued: "Contribution queued for sync.",
      contributionConfirmed: "Contribution confirmed",
      contributionSent: "Contribution sent",
      contributionRecorded: "Your contribution has been recorded.",
      voteQueued: "Vote queued for sync.",
      proposalQueued: "Proposal queued for sync.",
    },
    status: {
      offlineDashboard: "Offline mode: local data displayed.",
      offlineContributions: "Offline: contributions will be queued.",
      offlineProposals: "Offline: votes and proposals will be queued.",
      offlineLedger: "Offline: local cache displayed.",
      offlineReport: "Offline: report built from local cache.",
      loadingDashboard: "Loading dashboard...",
      loadingContributions: "Loading contributions...",
      loadingProposals: "Loading proposals...",
      loadingLedger: "Loading ledger...",
      loadingReport: "Loading report...",
    },
    blockchain: {
      viewOnCeloScan: "View on CeloScan",
      verifyOnCeloScan: "Verify on CeloScan",
      txPrefix: "TX:",
      blockPrefix: "Block",
    },
    dashboard: {
      target: "Target",
      collected: "Collected",
      noRecentActivity: "No recent activity.",
    },
    contributions: {
      newContribution: "New contribution",
      amountPlaceholder: "Amount XAF",
    },
    proposals: {
      createProposal: "Create a proposal",
      newProposal: "New proposal",
      titlePlaceholder: "Title",
      descriptionPlaceholder: "Description",
      yes: "YES",
      no: "NO",
    },
    ledger: {
      all: "All",
      contributions: "Contributions",
      votes: "Votes",
      proposals: "Proposals",
      wallet: "Wallet",
    },
    report: {
      localTitle: "Local report",
      totalCollected: "Collected",
      targetAmount: "Target",
      completion: "Completion",
      proposals: "Proposals",
      approved: "Approved",
      rejected: "Rejected",
      estimationMonths: "Estimated months",
      downloadCsv: "Download CSV",
      csvTitle: "CoopEnergie CSV report",
    },
  },
  fr: {
    auth: {
      loginSubtitle: "Connectez-vous a votre cooperative.",
      registerTitle: "Inscription",
      registerSubtitle: "Creez votre compte CoopEnergie.",
      processingInvitation: "Traitement de votre invitation...",
      emailPlaceholder: "vous@exemple.com",
      passwordPlaceholder: "********",
      namePlaceholder: "Votre nom",
      createAccount: "Creer un compte",
      backToLogin: "Retour a la connexion",
    },
    common: {
      email: "Email",
      password: "Mot de passe",
      name: "Nom",
      login: "Connexion",
      register: "Inscription",
      contribute: "Cotiser",
      copy: "Copier",
      close: "Fermer",
      cancel: "Annuler",
      submit: "Valider",
      cooperative: "Cooperative",
      members: "Membres",
      recentActivity: "Activite recente",
      walletAddress: "Adresse du wallet",
    },
    tabs: {
      dashboard: "Tableau de bord",
      contributions: "Contributions",
      proposals: "Propositions",
      ledger: "Grand livre",
      report: "Rapport",
    },
    errors: {
      loginFailed: "Connexion impossible",
      registrationFailed: "Inscription impossible",
      invalidInvitation: "Invitation invalide",
      missingInvitationToken: "Le token d'invitation est manquant.",
      unknownError: "Une erreur est survenue.",
      invalidAmount: "Montant invalide",
      enterValidAmount: "Entrez un montant valide.",
      contributionFailed: "Impossible de cotiser.",
      voteFailed: "Vote impossible",
      invalidFormValues: "Entrez un titre et une description.",
      proposalFailed: "Creation impossible",
      csvFailed: "Impossible de telecharger le CSV.",
      error: "Erreur",
    },
    feedback: {
      contributionQueued: "Contribution mise en file d'attente pour sync.",
      contributionConfirmed: "Contribution confirmee",
      contributionSent: "Contribution envoyee",
      contributionRecorded: "Votre contribution a ete enregistree.",
      voteQueued: "Vote mis en file d'attente pour sync.",
      proposalQueued: "Proposition mise en file d'attente pour sync.",
    },
    status: {
      offlineDashboard: "Mode hors ligne: donnees locales affichees.",
      offlineContributions:
        "Hors ligne: les contributions seront mises en file d'attente.",
      offlineProposals:
        "Hors ligne: votes et propositions seront mis en file d'attente.",
      offlineLedger: "Hors ligne: affichage du cache local.",
      offlineReport: "Hors ligne: rapport construit depuis le cache local.",
      loadingDashboard: "Chargement du dashboard...",
      loadingContributions: "Chargement des contributions...",
      loadingProposals: "Chargement des propositions...",
      loadingLedger: "Chargement du ledger...",
      loadingReport: "Chargement du rapport...",
    },
    blockchain: {
      viewOnCeloScan: "Voir sur CeloScan",
      verifyOnCeloScan: "Verifier sur CeloScan",
      txPrefix: "TX:",
      blockPrefix: "Bloc",
    },
    dashboard: {
      target: "Cible",
      collected: "Collecte",
      noRecentActivity: "Aucune activite recente.",
    },
    contributions: {
      newContribution: "Nouvelle contribution",
      amountPlaceholder: "Montant XAF",
    },
    proposals: {
      createProposal: "Creer une proposition",
      newProposal: "Nouvelle proposition",
      titlePlaceholder: "Titre",
      descriptionPlaceholder: "Description",
      yes: "OUI",
      no: "NON",
    },
    ledger: {
      all: "Tout",
      contributions: "Contributions",
      votes: "Votes",
      proposals: "Propositions",
      wallet: "Wallet",
    },
    report: {
      localTitle: "Rapport local",
      totalCollected: "Collecte",
      targetAmount: "Objectif",
      completion: "Completion",
      proposals: "Propositions",
      approved: "Approuve",
      rejected: "Rejete",
      estimationMonths: "Estimation (mois)",
      downloadCsv: "Telecharger CSV",
      csvTitle: "Rapport CSV CoopEnergie",
    },
  },
} as const;

export type MobileLocale = keyof typeof translations;
export type TranslationKey = string;

function resolveLocale(): MobileLocale {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
  return locale.startsWith("fr") ? "fr" : "en";
}

export function translate(locale: MobileLocale, key: TranslationKey): string {
  const keys = key.split(".");
  let value: unknown = translations[locale];

  for (const segment of keys) {
    value = (value as Record<string, unknown> | undefined)?.[segment];
  }

  return typeof value === "string" ? value : key;
}

export function useMobileTranslations(localeOverride?: MobileLocale) {
  const locale = localeOverride ?? resolveLocale();

  return useMemo(
    () => ({
      locale,
      t: (key: TranslationKey) => translate(locale, key),
    }),
    [locale],
  );
}
