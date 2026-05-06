import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { storage, tokenStorage } from "@/lib/storage";

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
      logout: "Logout",
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
      withdrawalRequestFailed: "Unable to create withdrawal proposal.",
      withdrawalFormIncomplete: "Complete the withdrawal form.",
      withdrawalRecipientRequired: "Provide the required recipient details.",
      amountExceedsBalance: "Amount exceeds available balance.",
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
      withdrawalQueued: "Withdrawal proposal queued for sync.",
      withdrawalCreated: "Withdrawal proposal created.",
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
      createWithdrawal: "Create withdrawal proposal",
      newProposal: "New proposal",
      newWithdrawal: "New withdrawal proposal",
      titlePlaceholder: "Title",
      descriptionPlaceholder: "Description",
      withdrawalDescription:
        "Create a withdrawal request for members to vote on.",
      amountLabel: "Amount (FCFA)",
      availableBalance: "Available balance",
      reasonLabel: "Reason",
      reasonPlaceholder: "Explain the reason for withdrawal...",
      destinationType: "Destination type",
      mtnMomo: "MTN MoMo",
      orangeMoney: "Orange Money",
      bankTransfer: "Bank transfer",
      phoneNumber: "Phone number",
      bankName: "Bank name",
      accountNumber: "Account number",
      recipientName: "Recipient name",
      phonePlaceholder: "6XXXXXXXX",
      bankPlaceholder: "Bank name",
      accountPlaceholder: "Account number",
      recipientPlaceholder: "Recipient name",
      withdrawalTag: "WITHDRAWAL",
      eligibleMembers: "Eligible members",
      thresholdRequired: "Threshold required",
      notEligibleWithdrawal: "Not eligible to vote on withdrawal",
      notEligibleWithdrawalDescription:
        "You must have at least one confirmed contribution to vote on withdrawals.",
      voteRatio: "Vote ratio",
      voteYes: "YES",
      voteNo: "NO",
      pending: "Pending",
      approved: "Approved",
      rejected: "Rejected",
      yesShort: "YES",
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
    adminPayments: {
      title: "Payments and monetisation",
      subtitle: "Track platform revenue and update fee settings.",
      loadFailed: "Failed to load payments data.",
      saveFailed: "Failed to save monetisation settings.",
      saved: "Monetisation settings saved.",
      withdrawalFeeRange: "Withdrawal fee must stay between 0 and 50%.",
      vendorFeeRange: "Vendor fees must be positive values.",
      overview: {
        totalRevenue: "Total revenue",
        withdrawalFees: "Withdrawal fees",
        vendorPayments: "Vendor payments",
        activeSubscriptions: "Active subscriptions",
      },
      withdrawals: {
        title: "Withdrawal fees",
        empty: "No withdrawal fee records yet.",
      },
      vendors: {
        title: "Vendor payments",
        empty: "No vendor payment records yet.",
      },
      editor: {
        title: "Monetisation editor",
        withdrawalFeePercent: "Withdrawal fee percent",
        vendorPaymentModel: "Vendor payment model",
        vendorOneTimeFee: "One-time fee (XAF)",
        vendorMonthlyFee: "Monthly fee (XAF)",
        vendorYearlyFee: "Yearly fee (XAF)",
      },
      model: {
        oneTime: "One-time",
        subscription: "Subscription",
      },
      pagination: {
        previous: "Previous",
        next: "Next",
        page: "Page",
      },
      status: {
        disbursed: "Disbursed",
        pending: "Pending",
        failed: "Failed",
        active: "Active",
        cancelled: "Cancelled",
        expired: "Expired",
      },
      cycle: {
        monthly: "Monthly",
        yearly: "Yearly",
      },
      destination: {
        mtnMomo: "MTN MoMo",
        orangeMoney: "Orange Money",
        bankTransfer: "Bank transfer",
      },
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
      logout: "Deconnexion",
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
      withdrawalRequestFailed: "Creation du retrait impossible",
      withdrawalFormIncomplete: "Completez le formulaire de retrait.",
      withdrawalRecipientRequired:
        "Renseignez les informations requises du beneficiaire.",
      amountExceedsBalance: "Le montant depasse le solde disponible.",
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
      withdrawalQueued: "Demande de retrait mise en file d'attente pour sync.",
      withdrawalCreated: "Proposition de retrait creee.",
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
      createWithdrawal: "Creer une proposition de retrait",
      newProposal: "Nouvelle proposition",
      newWithdrawal: "Nouvelle proposition de retrait",
      titlePlaceholder: "Titre",
      descriptionPlaceholder: "Description",
      withdrawalDescription:
        "Creez une demande de retrait pour que les membres puissent voter.",
      amountLabel: "Montant (FCFA)",
      availableBalance: "Solde disponible",
      reasonLabel: "Raison",
      reasonPlaceholder: "Expliquez la raison du retrait...",
      destinationType: "Type de destination",
      mtnMomo: "MTN MoMo",
      orangeMoney: "Orange Money",
      bankTransfer: "Virement bancaire",
      phoneNumber: "Numero de telephone",
      bankName: "Nom de la banque",
      accountNumber: "Numero de compte",
      recipientName: "Nom du beneficiaire",
      phonePlaceholder: "6XXXXXXXX",
      bankPlaceholder: "Nom de la banque",
      accountPlaceholder: "Numero de compte",
      recipientPlaceholder: "Nom du beneficiaire",
      withdrawalTag: "RETRAIT",
      eligibleMembers: "Membres eligibles",
      thresholdRequired: "Seuil requis",
      notEligibleWithdrawal: "Non eligible au vote de retrait",
      notEligibleWithdrawalDescription:
        "Vous devez avoir au moins une contribution confirmee pour voter sur les retraits.",
      voteRatio: "Ratio des votes",
      voteYes: "OUI",
      voteNo: "NON",
      pending: "En attente",
      approved: "Approuve",
      rejected: "Rejete",
      yesShort: "OUI",
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
    adminPayments: {
      title: "Paiements et monetisation",
      subtitle:
        "Suivez les revenus de la plateforme et mettez a jour les frais.",
      loadFailed: "Chargement des paiements impossible.",
      saveFailed: "Enregistrement des parametres impossible.",
      saved: "Parametres de monetisation enregistres.",
      withdrawalFeeRange: "Les frais de retrait doivent etre entre 0 et 50%.",
      vendorFeeRange: "Les frais fournisseur doivent etre positifs.",
      overview: {
        totalRevenue: "Revenus totaux",
        withdrawalFees: "Frais de retrait",
        vendorPayments: "Paiements fournisseurs",
        activeSubscriptions: "Abonnements actifs",
      },
      withdrawals: {
        title: "Frais de retrait",
        empty: "Aucun frais de retrait pour le moment.",
      },
      vendors: {
        title: "Paiements fournisseurs",
        empty: "Aucun paiement fournisseur pour le moment.",
      },
      editor: {
        title: "Editeur de monetisation",
        withdrawalFeePercent: "Pourcentage des frais de retrait",
        vendorPaymentModel: "Modele de paiement fournisseur",
        vendorOneTimeFee: "Frais unique (XAF)",
        vendorMonthlyFee: "Frais mensuel (XAF)",
        vendorYearlyFee: "Frais annuel (XAF)",
      },
      model: {
        oneTime: "Unique",
        subscription: "Abonnement",
      },
      pagination: {
        previous: "Precedent",
        next: "Suivant",
        page: "Page",
      },
      status: {
        disbursed: "Decaisse",
        pending: "En attente",
        failed: "Echoue",
        active: "Actif",
        cancelled: "Annule",
        expired: "Expire",
      },
      cycle: {
        monthly: "Mensuel",
        yearly: "Annuel",
      },
      destination: {
        mtnMomo: "MTN MoMo",
        orangeMoney: "Orange Money",
        bankTransfer: "Virement bancaire",
      },
    },
  },
} as const;

export type MobileLocale = keyof typeof translations;
export type TranslationKey = string;

const MOBILE_LOCALE_STORAGE_KEY = "mobile_locale";

function normalizeLocale(value?: string | null): MobileLocale {
  return value?.toLowerCase().startsWith("en") ? "en" : "fr";
}

function resolveLocale(): MobileLocale {
  const locale = Intl.DateTimeFormat().resolvedOptions().locale;
  return normalizeLocale(locale);
}

function resolveStoredLocale(): MobileLocale | null {
  const stored = storage.getString(MOBILE_LOCALE_STORAGE_KEY);

  if (!stored) {
    return null;
  }

  return normalizeLocale(stored);
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
  const [locale, setLocaleState] = useState<MobileLocale>(
    () => localeOverride ?? resolveStoredLocale() ?? resolveLocale(),
  );

  useEffect(() => {
    if (!localeOverride) {
      return;
    }

    setLocaleState(localeOverride);
  }, [localeOverride]);

  useEffect(() => {
    if (localeOverride) {
      return;
    }

    if (!tokenStorage.get()) {
      return;
    }

    let active = true;

    void api
      .get<{ preferredLocale?: string }>("/users/me")
      .then((profile) => {
        if (!active || !profile.preferredLocale) {
          return;
        }

        const nextLocale = normalizeLocale(profile.preferredLocale);
        setLocaleState(nextLocale);
        storage.set(MOBILE_LOCALE_STORAGE_KEY, nextLocale);
      })
      .catch(() => {
        // Keep local locale when profile sync fails.
      });

    return () => {
      active = false;
    };
  }, [localeOverride]);

  const setLocale = async (nextLocale: MobileLocale) => {
    setLocaleState(nextLocale);

    if (!localeOverride) {
      storage.set(MOBILE_LOCALE_STORAGE_KEY, nextLocale);
    }

    if (!tokenStorage.get()) {
      return;
    }

    try {
      await api.patch("/users/me", { preferredLocale: nextLocale });
    } catch {
      // Locale still stays updated locally even if backend sync fails.
    }
  };

  return useMemo(
    () => ({
      locale,
      t: (key: TranslationKey) => translate(locale, key),
      setLocale,
    }),
    [locale],
  );
}
