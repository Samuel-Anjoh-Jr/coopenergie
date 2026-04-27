"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  Clock3,
  Link2,
  LogIn,
  Mail,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import {
  acceptInvitation,
  buildInvitationAuthPath,
  formatInvitationExpiry,
  getInvitationCopy,
  lookupInvitation,
  type InvitationLookupResponse,
} from "@/lib/invitations";
import { type Locale, useTranslations } from "@/lib/translations";

type JoinCooperativeProps = {
  locale: Locale;
  token: string;
};

function getStatusBadgeVariant(invitation: InvitationLookupResponse) {
  if (invitation.active) {
    return "default" as const;
  }

  if (invitation.expired || invitation.status === "REVOKED") {
    return "destructive" as const;
  }

  return "secondary" as const;
}

function getStatusLabel(
  invitation: InvitationLookupResponse,
  copy: ReturnType<typeof getInvitationCopy>,
) {
  if (invitation.active) {
    return copy.activeStatus;
  }

  if (invitation.expired) {
    return copy.expiredStatus;
  }

  if (invitation.status === "REVOKED") {
    return copy.revokedStatus;
  }

  return copy.acceptedStatus;
}

export function JoinCooperative({ locale, token }: JoinCooperativeProps) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const t = useTranslations(locale);
  const copy = getInvitationCopy(locale);
  const [invitation, setInvitation] = useState<InvitationLookupResponse | null>(
    null,
  );
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const attemptedAutoAcceptRef = useRef(false);

  const loginHref = buildInvitationAuthPath("login", locale, token);
  const signupHref = buildInvitationAuthPath("signup", locale, token);

  const emailMismatch = useMemo(() => {
    if (
      !invitation?.email ||
      invitation.type !== "EMAIL" ||
      !session?.user?.email
    ) {
      return false;
    }

    return invitation.email.toLowerCase() !== session.user.email.toLowerCase();
  }, [invitation, session?.user?.email]);

  useEffect(() => {
    let cancelled = false;

    const loadInvitation = async () => {
      setIsLoading(true);
      setLookupError(null);
      setActionError(null);
      attemptedAutoAcceptRef.current = false;

      try {
        const nextInvitation = await lookupInvitation(token);

        if (cancelled) {
          return;
        }

        setInvitation(nextInvitation);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setLookupError(
          error instanceof Error ? error.message : t("errors.invalidInvitation"),
        );
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadInvitation();

    return () => {
      cancelled = true;
    };
  }, [t, token]);

  useEffect(() => {
    if (
      status !== "authenticated" ||
      !invitation?.active ||
      emailMismatch ||
      attemptedAutoAcceptRef.current
    ) {
      return;
    }

    attemptedAutoAcceptRef.current = true;
    setActionError(null);
    setIsAccepting(true);

    const join = async () => {
      try {
        const response = await acceptInvitation(token);
        toast.success(
          copy.joinedSuccess.replace("{cooperative}", response.cooperative.name),
        );
        router.replace(`/${locale}/dashboard`);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : t("errors.joinFailed");
        setActionError(message);
        toast.error(message);
      } finally {
        setIsAccepting(false);
      }
    };

    void join();
  }, [
    copy.joinedSuccess,
    emailMismatch,
    invitation?.active,
    locale,
    router,
    status,
    t,
    token,
  ]);

  const handleSwitchAccount = async () => {
    await signOut({
      callbackUrl: loginHref,
    });
  };

  const heroBadgeLabel = isLoading
    ? copy.pendingSession
    : invitation?.active
      ? copy.inviteReady
      : copy.inviteUnavailable;

  const renderLookupError = () => (
    <div className="space-y-5">
      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>{t("errors.invalidInvitation")}</AlertTitle>
        <AlertDescription>
          {lookupError || copy.inviteUnavailable}
        </AlertDescription>
      </Alert>

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button asChild className="flex-1">
          <Link href={`/${locale}`}>
            <Link2 className="mr-2 h-4 w-4" />
            {copy.backHome}
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1">
          <Link href={loginHref}>
            <LogIn className="mr-2 h-4 w-4" />
            {copy.loginToContinue}
          </Link>
        </Button>
      </div>
    </div>
  );

  const renderInvitationActions = () => {
    if (!invitation) {
      return null;
    }

    if (invitation.active) {
      return (
        <>
          {actionError ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{t("errors.joinFailed")}</AlertTitle>
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          {emailMismatch ? (
            <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>{copy.emailMismatchTitle}</AlertTitle>
              <AlertDescription>
                <p>{copy.emailMismatchDescription}</p>
                <p>
                  {copy.signedInAs}: {session?.user?.email}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "authenticated" && !emailMismatch ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertTitle>{copy.processingTitle}</AlertTitle>
              <AlertDescription>
                <p>{copy.processingDescription}</p>
                <p>
                  {copy.signedInAs}: {session?.user?.email}
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          {status === "loading" ? (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 p-4 text-sm text-muted-foreground">
              <Spinner className="h-4 w-4" />
              {copy.pendingSession}
            </div>
          ) : null}

          {status !== "authenticated" ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild className="w-full">
                <Link href={loginHref}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {copy.loginToContinue}
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={signupHref}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  {copy.signupToContinue}
                </Link>
              </Button>
            </div>
          ) : null}

          {emailMismatch ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                onClick={() => void handleSwitchAccount()}
                className="w-full"
              >
                <Mail className="mr-2 h-4 w-4" />
                {copy.switchAccount}
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href={`/${locale}/dashboard`}>
                  <Link2 className="mr-2 h-4 w-4" />
                  {copy.continueToDashboard}
                </Link>
              </Button>
            </div>
          ) : null}

          {status === "authenticated" && !emailMismatch ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-primary">
              {isAccepting ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <Clock3 className="h-4 w-4" />
              )}
              {copy.inviteReady}
            </div>
          ) : null}
        </>
      );
    }

    return (
      <Alert>
        <Clock3 className="h-4 w-4" />
        <AlertTitle>{copy.inviteUnavailable}</AlertTitle>
        <AlertDescription>{copy.inviteUnavailable}</AlertDescription>
      </Alert>
    );
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 relative">
        <Image
          src="/images/community-cooperation.jpg"
          alt={t("homepage.community.imageAlt")}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/65 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center p-12">
          <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-3.5">
              <Image
                src="/logo/coopenergie-logo-full.png"
                alt={t("branding.appName")}
                width={728}
                height={179}
                className="h-10.5 w-auto drop-shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:drop-shadow-[0_1px_0_rgba(248,250,252,0.12)]"
                priority
              />
            </div>

            <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {heroBadgeLabel}
            </div>

            <h1 className="text-4xl font-bold text-foreground leading-tight">
              <span className="text-gradient">{t("auth.heroTextLine1")}</span>
              <br />
              <span className="text-gradient-green">
                {t("auth.heroTextLine2")}
              </span>
            </h1>

            <p className="text-lg text-muted-foreground">
              {copy.description}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-linear-to-br from-background via-background to-muted/30">
        <Card className="w-full max-w-xl border-border/50 shadow-2xl bg-card/85 backdrop-blur">
          <CardHeader className="space-y-4 pb-2">
            <div className="lg:hidden flex items-center justify-center gap-2.5 mb-2">
              <Image
                src="/logo/coopenergie-logo-icon.png"
                alt={t("branding.appName")}
                width={184}
                height={172}
                className="h-10 w-auto"
                priority
              />
              <Image
                src="/logo/coopenergie-logo-full.png"
                alt={t("branding.appName")}
                width={728}
                height={179}
                className="h-8 w-auto"
                priority
              />
            </div>

            <div className="space-y-2 text-center lg:text-left">
              <CardTitle className="text-2xl font-bold text-foreground">
                {copy.title}
              </CardTitle>
              <CardDescription className="text-base text-muted-foreground">
                {copy.description}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-4">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <Spinner className="h-6 w-6" />
                <p className="text-sm text-muted-foreground">
                  {copy.pendingSession}
                </p>
              </div>
            ) : lookupError || !invitation ? (
              renderLookupError()
            ) : (
              <>
                <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <Badge variant={getStatusBadgeVariant(invitation)}>
                      {getStatusLabel(invitation, copy)}
                    </Badge>
                    <Badge variant="outline">
                      {invitation.type === "EMAIL"
                        ? copy.inviteTypeEmail
                        : copy.inviteTypeLink}
                    </Badge>
                  </div>

                  <dl className="space-y-3 text-sm">
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {copy.invitedToLabel}
                      </dt>
                      <dd className="text-right font-medium text-foreground">
                        {invitation.cooperative.name}
                      </dd>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {copy.inviteTypeLabel}
                      </dt>
                      <dd className="text-right font-medium text-foreground">
                        {invitation.type === "EMAIL"
                          ? copy.inviteTypeEmail
                          : copy.inviteTypeLink}
                      </dd>
                    </div>
                    {invitation.email ? (
                      <div className="flex items-start justify-between gap-4">
                        <dt className="text-muted-foreground">
                          {copy.recipientLabel}
                        </dt>
                        <dd className="text-right font-medium text-foreground break-all">
                          {invitation.email}
                        </dd>
                      </div>
                    ) : null}
                    <div className="flex items-start justify-between gap-4">
                      <dt className="text-muted-foreground">
                        {copy.expiresAtLabel}
                      </dt>
                      <dd className="text-right font-medium text-foreground">
                        {formatInvitationExpiry(invitation.expiresAt, locale)}
                      </dd>
                    </div>
                  </dl>
                </div>

                {renderInvitationActions()}

                <div className="grid gap-3 sm:grid-cols-2">
                  <Button asChild variant="outline" className="w-full">
                    <Link href={`/${locale}`}>
                      <Link2 className="mr-2 h-4 w-4" />
                      {copy.backHome}
                    </Link>
                  </Button>
                  <Button asChild variant="secondary" className="w-full">
                    <Link href={session?.user ? `/${locale}/dashboard` : loginHref}>
                      {session?.user ? (
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                      ) : (
                        <LogIn className="mr-2 h-4 w-4" />
                      )}
                      {session?.user ? copy.continueToDashboard : copy.loginToContinue}
                    </Link>
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
