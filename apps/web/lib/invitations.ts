import { restClient } from "@/lib/rest-client";
import type { Locale } from "@/lib/translations";

export type InvitationLookupResponse = {
  id: string;
  token: string;
  type: "EMAIL" | "LINK";
  status: "PENDING" | "ACCEPTED" | "REVOKED";
  email: string | null;
  expiresAt: string;
  expired: boolean;
  active: boolean;
  cooperative: {
    id: string;
    name: string;
    slug: string;
  };
};

export type AcceptInvitationResponse = {
  cooperative: {
    id: string;
    name: string;
  };
  membership: {
    id: string;
    cooperativeId: string;
    role: string;
  };
};

type InvitationCopy = {
  title: string;
  description: string;
  invitedToLabel: string;
  inviteTypeLabel: string;
  inviteTypeEmail: string;
  inviteTypeLink: string;
  expiresAtLabel: string;
  recipientLabel: string;
  activeStatus: string;
  expiredStatus: string;
  revokedStatus: string;
  acceptedStatus: string;
  processingTitle: string;
  processingDescription: string;
  pendingSession: string;
  loginToContinue: string;
  signupToContinue: string;
  continueToDashboard: string;
  backHome: string;
  inviteReady: string;
  inviteUnavailable: string;
  emailMismatchTitle: string;
  emailMismatchDescription: string;
  switchAccount: string;
  signedInAs: string;
  joinedSuccess: string;
  inviteDetectedTitle: string;
  inviteDetectedDescription: string;
};

const invitationCopy: Record<Locale, InvitationCopy> = {
  en: {
    title: "Join your cooperative",
    description:
      "Review this invitation and continue into the cooperative with the right account.",
    invitedToLabel: "Cooperative",
    inviteTypeLabel: "Invitation type",
    inviteTypeEmail: "Email invitation",
    inviteTypeLink: "Shareable link",
    expiresAtLabel: "Expires",
    recipientLabel: "Issued for",
    activeStatus: "Active",
    expiredStatus: "Expired",
    revokedStatus: "Revoked",
    acceptedStatus: "Accepted",
    processingTitle: "Joining in progress",
    processingDescription:
      "We are validating your invitation and adding you to the cooperative.",
    pendingSession: "Checking your session...",
    loginToContinue: "Log in to continue",
    signupToContinue: "Create account to continue",
    continueToDashboard: "Go to dashboard",
    backHome: "Back to home",
    inviteReady: "This invitation is ready to be accepted.",
    inviteUnavailable: "This invitation is no longer available.",
    emailMismatchTitle: "This invite is tied to another email address.",
    emailMismatchDescription:
      "Sign in with the invited email address to complete the join flow.",
    switchAccount: "Switch account",
    signedInAs: "Signed in as",
    joinedSuccess: "Welcome to {cooperative}.",
    inviteDetectedTitle: "Invitation detected",
    inviteDetectedDescription:
      "Continue with your account to return to the invitation and finish joining.",
  },
  fr: {
    title: "Rejoindre votre cooperative",
    description:
      "Consultez cette invitation et poursuivez avec le bon compte pour rejoindre la cooperative.",
    invitedToLabel: "Cooperative",
    inviteTypeLabel: "Type d'invitation",
    inviteTypeEmail: "Invitation par email",
    inviteTypeLink: "Lien partageable",
    expiresAtLabel: "Expiration",
    recipientLabel: "Adresse invitee",
    activeStatus: "Active",
    expiredStatus: "Expiree",
    revokedStatus: "Revoquee",
    acceptedStatus: "Acceptee",
    processingTitle: "Adhesion en cours",
    processingDescription:
      "Nous validons votre invitation et vous ajoutons a la cooperative.",
    pendingSession: "Verification de votre session...",
    loginToContinue: "Se connecter pour continuer",
    signupToContinue: "Creer un compte pour continuer",
    continueToDashboard: "Aller au tableau de bord",
    backHome: "Retour a l'accueil",
    inviteReady: "Cette invitation peut etre acceptee.",
    inviteUnavailable: "Cette invitation n'est plus disponible.",
    emailMismatchTitle: "Cette invitation est liee a une autre adresse email.",
    emailMismatchDescription:
      "Connectez-vous avec l'adresse invitee pour terminer l'adhesion.",
    switchAccount: "Changer de compte",
    signedInAs: "Connecte en tant que",
    joinedSuccess: "Bienvenue dans {cooperative}.",
    inviteDetectedTitle: "Invitation detectee",
    inviteDetectedDescription:
      "Continuez avec votre compte pour revenir a l'invitation et finaliser l'adhesion.",
  },
};

export function normalizeInvitationLocale(locale: string): Locale {
  return locale.toLowerCase().startsWith("fr") ? "fr" : "en";
}

export function getInvitationCopy(locale: string | Locale): InvitationCopy {
  return invitationCopy[normalizeInvitationLocale(locale)];
}

export function buildJoinPath(locale: string | Locale, token: string) {
  return `/${normalizeInvitationLocale(locale)}/join/${encodeURIComponent(token)}`;
}

export function buildInvitationAuthPath(
  mode: "login" | "signup",
  locale: string | Locale,
  token: string,
) {
  const params = new URLSearchParams({
    invitationToken: token,
  });

  return `/${normalizeInvitationLocale(locale)}/${mode}?${params.toString()}`;
}

export function formatInvitationExpiry(
  expiresAt: string,
  locale: string | Locale,
) {
  return new Intl.DateTimeFormat(
    normalizeInvitationLocale(locale) === "fr" ? "fr-FR" : "en-US",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(new Date(expiresAt));
}

export async function lookupInvitation(token: string) {
  return restClient.post<InvitationLookupResponse>("/invitations/lookup", {
    token,
  });
}

export async function acceptInvitation(token: string) {
  return restClient.post<AcceptInvitationResponse>("/invitations/accept", {
    token,
  });
}
