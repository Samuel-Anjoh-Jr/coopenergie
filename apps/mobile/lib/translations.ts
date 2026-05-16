import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { storage, tokenStorage } from "@/lib/storage";

const translations = {
  en: {
    auth: {
      loginTitle: "Login",
      loginSubtitle: "Sign in to your cooperative.",
      registerTitle: "Register",
      vendorRegisterTitle: "Vendor registration",
      invitationTitle: "Invitation",
      registerSubtitle: "Create your CoopEnergie account.",
      processingInvitation: "Processing your invitation...",
      checkingBackend: "Checking backend connectivity...",
      backendUnreachableTitle: "Backend unreachable",
      backendUnreachableMessage:
        "Cannot reach the backend right now. Check that your API is running and your EXPO_PUBLIC_API_URL is reachable from this device.",
      emailPlaceholder: "name@example.com",
      passwordPlaceholder: "Enter your password",
      namePlaceholder: "Your name",
      createAccount: "Create an account",
      backToLogin: "Back to login",
      vendorSignupCta: "Register as a solar vendor",
      vendorSignupPrompt: "Are you a solar panel vendor? Register here",
      legalConsentPrefix: "By continuing, you agree to our",
      legalAnd: "and",
      termsTitle: "Terms",
      privacyTitle: "Privacy",
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
      retry: "Retry",
      refresh: "Refresh",
      submit: "Submit",
      language: "Language",
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
      activityActor: "Actor",
      activityLedger: "Ledger",
      quickActionsTitle: "Quick actions",
      quickProfile: "Profile",
      quickInvitations: "Invitations",
      quickSettings: "Settings",
    },
    legal: {
      termsHeading: "Terms and Conditions",
      termsBody1:
        "CoopEnergie helps cooperatives collect and manage member contributions in a transparent way.",
      termsBody2:
        "By using this app, you agree to provide accurate information and respect your cooperative governance rules.",
      termsBody3:
        "Transactions are recorded for accountability and may be reviewed by authorized administrators.",
      privacyHeading: "Privacy Policy",
      privacyBody1:
        "We collect only the data required to provide cooperative services, including account and transaction information.",
      privacyBody2:
        "Your information is used for operations, notifications, and security. We do not sell personal data.",
      privacyBody3:
        "You can request updates to your profile data and review your cooperative records at any time.",
    },
    profile: {
      title: "Profile",
      subtitle: "Manage your personal details and withdrawal destination.",
      nameLabel: "Full name",
      emailLabel: "Email",
      withdrawalMethod: "Withdrawal method",
      methodMtn: "MTN MoMo",
      methodOrange: "Orange Money",
      methodBank: "Bank transfer",
      bankName: "Bank name",
      bankAccount: "Account number",
      withdrawalPhone: "Mobile money number",
      save: "Save profile",
      saved: "Profile updated.",
      loadFailed: "Unable to load profile.",
      saveFailed: "Unable to save profile.",
    },
    invitations: {
      adminOnlyTitle: "Admin access required",
      adminOnlyDescription:
        "Only cooperative admins can manage invitations and member roles.",
      title: "Invitations",
      description: "Invite members and manage cooperative roles.",
      emailInviteTitle: "Invite by email",
      emailPlaceholder: "member@example.com",
      sendInvite: "Send invite",
      generateLink: "Generate link",
      latestLink: "Latest join link",
      membersTitle: "Members",
      noMembers: "No members found.",
      promoteToAdmin: "Promote to admin",
      demoteToMember: "Demote to member",
      removeMember: "Remove member",
      noPending: "No pending invitations.",
      expiresAt: "Expires",
      revoke: "Revoke",
      invitationSent: "Invitation sent.",
      linkGenerated: "Invitation link generated.",
      invitationRevoked: "Invitation revoked.",
      linkCopied: "Invitation link copied.",
      memberPromoted: "Member promoted.",
      memberDemoted: "Member demoted.",
      memberRemoved: "Member removed.",
    },
    settings: {
      title: "Settings",
      subtitle: "Manage language, cooperative context, and thresholds.",
      activeCooperative: "Active cooperative",
      language: "Language",
      english: "English",
      french: "French",
      coopThreshold: "Cooperative withdrawal threshold",
      saveCoop: "Save cooperative threshold",
      platformThresholds: "Platform thresholds",
      thresholdMin: "Minimum threshold",
      thresholdDefault: "Default threshold",
      thresholdMax: "Maximum threshold",
      appStoreUrl: "App Store URL",
      playStoreUrl: "Play Store URL",
      savePlatform: "Save platform thresholds",
      logoutAction: "Log out",
      loadFailed: "Unable to load settings.",
      savedCoop: "Cooperative settings updated.",
      savedPlatform: "Platform settings updated.",
      saveFailed: "Unable to save settings.",
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
    vendorSignup: {
      title: "Vendor registration",
      subtitle: "Create your solar vendor account.",
      fullName: "Full name",
      email: "Email",
      password: "Password",
      businessName: "Business name",
      city: "City",
      whatsapp: "WhatsApp number",
      description: "Business description",
      acceptTerms: "I accept the vendor terms and conditions",
      submit: "Create vendor account",
      switchToCoopSignup: "Register as cooperative member instead",
      termsTitle: "Terms required",
      termsRequiredMessage: "You must accept terms before continuing.",
      accountCreatedTitle: "Account created",
      completePaymentMessage:
        "Complete your vendor payment to activate your account.",
      registrationFailedTitle: "Registration failed",
      unknownError: "An unexpected error occurred.",
      sessionTitle: "Session expired",
      reconnectMessage: "Please sign in again before making payment.",
      paymentTitle: "Payment required",
      paymentPhoneRequired: "Enter a payment phone number.",
      paymentFailedTitle: "Payment failed",
      paymentStartedTitle: "Payment started",
      paymentStartedMessage:
        "Payment request sent. We are checking your activation status.",
      paymentPendingTitle: "Activation pending",
      paymentPendingMessage:
        "Your payment is still processing. Please try again in a moment.",
      paymentRequired: "Vendor payment required",
      amount: "Amount:",
      paymentPhone: "Payment phone number",
      later: "Later",
      pay: "Pay now",
    },
  },
  fr: {
    auth: {
      loginTitle: "Connexion",
      loginSubtitle: "Connectez-vous a votre cooperative.",
      registerTitle: "Inscription",
      vendorRegisterTitle: "Inscription fournisseur",
      invitationTitle: "Invitation",
      registerSubtitle: "Creez votre compte CoopEnergie.",
      processingInvitation: "Traitement de votre invitation...",
      checkingBackend: "Verification de la connectivite du backend...",
      backendUnreachableTitle: "Backend inaccessible",
      backendUnreachableMessage:
        "Impossible de joindre le backend. Verifiez que l'API tourne et que EXPO_PUBLIC_API_URL est accessible depuis cet appareil.",
      emailPlaceholder: "vous@exemple.com",
      passwordPlaceholder: "********",
      namePlaceholder: "Votre nom",
      createAccount: "Creer un compte",
      backToLogin: "Retour a la connexion",
      vendorSignupCta: "Inscription fournisseur solaire",
      vendorSignupPrompt:
        "Vous etes fournisseur de panneaux solaires ? Inscrivez-vous ici",
      legalConsentPrefix: "En continuant, vous acceptez nos",
      legalAnd: "et",
      termsTitle: "Conditions",
      privacyTitle: "Confidentialite",
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
      retry: "Reessayer",
      refresh: "Actualiser",
      submit: "Valider",
      language: "Langue",
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
      activityActor: "Acteur",
      activityLedger: "Ledger",
      quickActionsTitle: "Actions rapides",
      quickProfile: "Profil",
      quickInvitations: "Invitations",
      quickSettings: "Parametres",
    },
    legal: {
      termsHeading: "Conditions generales",
      termsBody1:
        "CoopEnergie aide les cooperatives a collecter et gerer les contributions de maniere transparente.",
      termsBody2:
        "En utilisant cette application, vous acceptez de fournir des informations exactes et de respecter les regles de gouvernance de votre cooperative.",
      termsBody3:
        "Les transactions sont enregistrees pour la tracabilite et peuvent etre examinees par les administrateurs autorises.",
      privacyHeading: "Politique de confidentialite",
      privacyBody1:
        "Nous collectons uniquement les donnees necessaires aux services de cooperative, y compris les informations de compte et de transaction.",
      privacyBody2:
        "Vos informations sont utilisees pour les operations, les notifications et la securite. Nous ne vendons pas les donnees personnelles.",
      privacyBody3:
        "Vous pouvez demander la mise a jour de vos donnees de profil et consulter les enregistrements de votre cooperative a tout moment.",
    },
    profile: {
      title: "Profil",
      subtitle: "Gerez vos informations et votre destination de retrait.",
      nameLabel: "Nom complet",
      emailLabel: "Email",
      withdrawalMethod: "Methode de retrait",
      methodMtn: "MTN MoMo",
      methodOrange: "Orange Money",
      methodBank: "Virement bancaire",
      bankName: "Nom de la banque",
      bankAccount: "Numero de compte",
      withdrawalPhone: "Numero mobile money",
      save: "Enregistrer le profil",
      saved: "Profil mis a jour.",
      loadFailed: "Impossible de charger le profil.",
      saveFailed: "Impossible d'enregistrer le profil.",
    },
    invitations: {
      adminOnlyTitle: "Acces administrateur requis",
      adminOnlyDescription:
        "Seuls les administrateurs de cooperative peuvent gerer les invitations et les roles.",
      title: "Invitations",
      description: "Invitez des membres et gerez les roles de la cooperative.",
      emailInviteTitle: "Inviter par email",
      emailPlaceholder: "membre@exemple.com",
      sendInvite: "Envoyer l'invitation",
      generateLink: "Generer un lien",
      latestLink: "Dernier lien d'inscription",
      membersTitle: "Membres",
      noMembers: "Aucun membre trouve.",
      promoteToAdmin: "Promouvoir admin",
      demoteToMember: "Retrograder membre",
      removeMember: "Retirer le membre",
      noPending: "Aucune invitation en attente.",
      expiresAt: "Expire le",
      revoke: "Revoquer",
      invitationSent: "Invitation envoyee.",
      linkGenerated: "Lien d'invitation genere.",
      invitationRevoked: "Invitation revoquee.",
      linkCopied: "Lien d'invitation copie.",
      memberPromoted: "Membre promu.",
      memberDemoted: "Membre retrograde.",
      memberRemoved: "Membre retire.",
    },
    settings: {
      title: "Parametres",
      subtitle: "Gerez la langue, la cooperative active et les seuils.",
      activeCooperative: "Cooperative active",
      language: "Langue",
      english: "Anglais",
      french: "Francais",
      coopThreshold: "Seuil de retrait cooperative",
      saveCoop: "Enregistrer le seuil cooperative",
      platformThresholds: "Seuils plateforme",
      thresholdMin: "Seuil minimum",
      thresholdDefault: "Seuil par defaut",
      thresholdMax: "Seuil maximum",
      appStoreUrl: "URL App Store",
      playStoreUrl: "URL Play Store",
      savePlatform: "Enregistrer les seuils plateforme",
      logoutAction: "Deconnexion",
      loadFailed: "Impossible de charger les parametres.",
      savedCoop: "Parametres cooperative mis a jour.",
      savedPlatform: "Parametres plateforme mis a jour.",
      saveFailed: "Impossible d'enregistrer les parametres.",
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
    vendorSignup: {
      title: "Inscription fournisseur",
      subtitle: "Creez votre compte fournisseur solaire.",
      fullName: "Nom complet",
      email: "Email",
      password: "Mot de passe",
      businessName: "Nom de l'entreprise",
      city: "Ville",
      whatsapp: "Numero WhatsApp",
      description: "Description de l'activite",
      acceptTerms: "J'accepte les conditions fournisseur",
      submit: "Creer le compte fournisseur",
      switchToCoopSignup: "S'inscrire comme membre de cooperative",
      termsTitle: "Conditions requises",
      termsRequiredMessage: "Vous devez accepter les conditions pour continuer.",
      accountCreatedTitle: "Compte cree",
      completePaymentMessage:
        "Finalisez le paiement fournisseur pour activer votre compte.",
      registrationFailedTitle: "Inscription impossible",
      unknownError: "Une erreur inattendue est survenue.",
      sessionTitle: "Session expiree",
      reconnectMessage: "Reconnectez-vous avant d'effectuer le paiement.",
      paymentTitle: "Paiement requis",
      paymentPhoneRequired: "Renseignez un numero de paiement.",
      paymentFailedTitle: "Paiement echoue",
      paymentStartedTitle: "Paiement demarre",
      paymentStartedMessage:
        "La demande de paiement a ete envoyee. Verification de l'activation en cours.",
      paymentPendingTitle: "Activation en attente",
      paymentPendingMessage:
        "Le paiement est toujours en cours. Reessayez dans un instant.",
      paymentRequired: "Paiement fournisseur requis",
      amount: "Montant :",
      paymentPhone: "Numero de paiement",
      later: "Plus tard",
      pay: "Payer",
    },
  },
} as const;

export type MobileLocale = keyof typeof translations;
export type TranslationKey = string;

const MOBILE_LOCALE_STORAGE_KEY = "mobile_locale";
let profileLocaleSyncPromise: Promise<MobileLocale | null> | null = null;
const localeListeners = new Set<(locale: MobileLocale) => void>();
let globalLocale: MobileLocale | null = null;

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

function resolveGlobalLocale() {
  if (globalLocale) {
    return globalLocale;
  }

  globalLocale = resolveStoredLocale() ?? resolveLocale();
  return globalLocale;
}

function broadcastLocale(nextLocale: MobileLocale) {
  globalLocale = nextLocale;
  for (const listener of localeListeners) {
    listener(nextLocale);
  }
}

function syncProfileLocaleOnce(): Promise<MobileLocale | null> {
  if (profileLocaleSyncPromise) {
    return profileLocaleSyncPromise;
  }

  profileLocaleSyncPromise = api
    .get<{ preferredLocale?: string }>("/users/me")
    .then((profile) => {
      if (!profile.preferredLocale) {
        return null;
      }

      const nextLocale = normalizeLocale(profile.preferredLocale);
      storage.set(MOBILE_LOCALE_STORAGE_KEY, nextLocale);
      return nextLocale;
    })
    .catch(() => null)
    .finally(() => {
      profileLocaleSyncPromise = null;
    });

  return profileLocaleSyncPromise;
}

export function translate(locale: MobileLocale, key: TranslationKey): string {
  const keys = key.split(".");
  let value: unknown = translations[locale];

  for (const segment of keys) {
    value = (value as Record<string, unknown> | undefined)?.[segment];
  }

  if (typeof value === "string") {
    return value;
  }

  let fallbackValue: unknown = translations.en;
  for (const segment of keys) {
    fallbackValue = (fallbackValue as Record<string, unknown> | undefined)?.[segment];
  }

  if (typeof fallbackValue === "string") {
    return fallbackValue;
  }

  const lastSegment = keys[keys.length - 1] || key;
  return lastSegment
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[-_]/g, " ")
    .replace(/^./, (char) => char.toUpperCase());
}

export function useMobileTranslations(localeOverride?: MobileLocale) {
  const [locale, setLocaleState] = useState<MobileLocale>(
    () => localeOverride ?? resolveGlobalLocale(),
  );

  useEffect(() => {
    if (!localeOverride) {
      const listener = (nextLocale: MobileLocale) => {
        setLocaleState(nextLocale);
      };

      localeListeners.add(listener);
      setLocaleState(resolveGlobalLocale());

      return () => {
        localeListeners.delete(listener);
      };
    }

    setLocaleState(localeOverride);
    return;
  }, [localeOverride]);

  useEffect(() => {
    if (localeOverride) {
      return;
    }

    if (!tokenStorage.get()) {
      return;
    }

    let active = true;

    void syncProfileLocaleOnce().then((nextLocale) => {
      if (!active || !nextLocale) {
          return;
      }

      broadcastLocale(nextLocale);
    });

    return () => {
      active = false;
    };
  }, [localeOverride]);

  const setLocale = async (nextLocale: MobileLocale) => {
    if (localeOverride) {
      setLocaleState(nextLocale);
    } else {
      broadcastLocale(nextLocale);
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
