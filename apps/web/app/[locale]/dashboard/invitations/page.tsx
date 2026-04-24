"use client";

import { useEffect, useState } from "react";

import { useQuery } from "@apollo/client";
import { Copy, Mail, RefreshCw, Trash2 } from "lucide-react";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { GET_MY_COOPERATIVES } from "@/lib/graphql/queries/cooperative";
import { restClient } from "@/lib/rest-client";
import { Locale, useTranslations } from "@/lib/translations";

type UserRole = "MEMBER" | "COOP_ADMIN" | "PLATFORM_ADMIN";

type Invitation = {
  id: string;
  type: "EMAIL" | "LINK";
  email: string | null;
  token: string;
  expiresAt: string;
};

type PendingInvitationsResponse = Invitation[];

type SendEmailInviteResponse = {
  joinUrl: string;
  emailSent: boolean;
};

type CreateShareableLinkResponse = {
  token: string;
  joinUrl: string;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function InvitationsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "en";
  const t = useTranslations(locale as Locale);
  const { data: session } = useSession();

  const [email, setEmail] = useState("");
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [latestJoinUrl, setLatestJoinUrl] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [isLoadingPending, setIsLoadingPending] = useState(false);

  const { data: myCooperativesData } = useQuery(GET_MY_COOPERATIVES);
  const cooperativeId = myCooperativesData?.myCooperatives?.[0]?.id as
    | string
    | undefined;
  const userRole =
    (myCooperativesData?.myCooperatives?.[0]?.membership?.role as UserRole) ||
    "MEMBER";

  const [items, setItems] = useState<Invitation[]>([]);

  const loadPendingInvitations = async () => {
    if (!cooperativeId || userRole !== "COOP_ADMIN") {
      setItems([]);
      return;
    }

    setIsLoadingPending(true);
    try {
      const data = await restClient.get<PendingInvitationsResponse>(
        `/invitations/cooperative/${cooperativeId}`,
      );
      setItems(data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setIsLoadingPending(false);
    }
  };

  useEffect(() => {
    if (userRole === "COOP_ADMIN" && cooperativeId) {
      void loadPendingInvitations();
    }
  }, [userRole, cooperativeId]);

  const handleSendEmailInvite = async () => {
    if (!cooperativeId || !email.trim()) {
      toast.error(t("errors.invalidFormValues"));
      return;
    }

    setIsSendingEmail(true);
    try {
      const response = await restClient.post<SendEmailInviteResponse>(
        "/invitations/email",
        {
          cooperativeId,
          email: email.trim(),
          locale,
        },
      );

      setEmail("");
      setLatestJoinUrl(response.joinUrl);
      toast.success(t("invitations.invitationSent"));
      await loadPendingInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setIsSendingEmail(false);
    }
  };

  const handleGenerateLink = async () => {
    if (!cooperativeId) {
      toast.error(t("errors.cooperativeNotFound"));
      return;
    }

    setIsGeneratingLink(true);
    try {
      const response = await restClient.post<CreateShareableLinkResponse>(
        "/invitations/link",
        {
          cooperativeId,
          locale,
        },
      );

      setLatestJoinUrl(response.joinUrl);
      toast.success(t("invitations.linkGenerated"));
      await loadPendingInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await restClient.delete(`/invitations/${id}`);
      toast.success(t("invitations.invitationRevoked"));
      await loadPendingInvitations();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : t("errors.unknownError"),
      );
    } finally {
      setRevokingId(null);
    }
  };

  const copyJoinUrl = async () => {
    if (!latestJoinUrl) {
      return;
    }

    try {
      await navigator.clipboard.writeText(latestJoinUrl);
      toast.success(t("feedback.hashCopied"));
    } catch {
      toast.error(t("errors.copyFailed"));
    }
  };

  if (!session?.user) {
    return null;
  }

  if (userRole !== "COOP_ADMIN") {
    return (
      <Alert>
        <AlertTitle>{t("invitations.adminOnlyTitle")}</AlertTitle>
        <AlertDescription>
          {t("invitations.adminOnlyDescription")}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {t("invitations.title")}
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          {t("invitations.description")}
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("invitations.emailInviteTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("invitations.emailPlaceholder")}
            />
            <Button
              onClick={() => void handleSendEmailInvite()}
              disabled={isSendingEmail || !email.trim()}
              className="w-full"
            >
              {isSendingEmail ? (
                <Spinner className="mr-2" />
              ) : (
                <Mail className="mr-2 h-4 w-4" />
              )}
              {t("invitations.sendInvite")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("invitations.linkInviteTitle")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={() => void handleGenerateLink()}
              disabled={isGeneratingLink}
              className="w-full"
              variant="secondary"
            >
              {isGeneratingLink ? (
                <Spinner className="mr-2" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              {t("invitations.generateLink")}
            </Button>

            {latestJoinUrl ? (
              <div className="space-y-2 rounded-md border p-3">
                <p className="text-sm font-medium">
                  {t("invitations.latestLink")}
                </p>
                <p className="text-xs text-muted-foreground break-all">
                  {latestJoinUrl}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void copyJoinUrl()}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  {t("invitations.copyLink")}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t("invitations.pendingTitle")}</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void loadPendingInvitations()}
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            {t("invitations.refresh")}
          </Button>
        </CardHeader>
        <CardContent>
          {isLoadingPending ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t("invitations.noPending")}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("ledger.type")}</TableHead>
                  <TableHead>{t("common.email")}</TableHead>
                  <TableHead>{t("invitations.expiresAt")}</TableHead>
                  <TableHead className="text-right">
                    {t("invitations.actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((invitation) => (
                  <TableRow key={invitation.id}>
                    <TableCell>
                      <Badge variant="outline">
                        {invitation.type === "EMAIL"
                          ? t("invitations.sentByEmail")
                          : t("invitations.sentByLink")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {invitation.email || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(invitation.expiresAt)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void handleRevoke(invitation.id)}
                        disabled={revokingId === invitation.id}
                      >
                        {revokingId === invitation.id ? (
                          <Spinner className="mr-2" />
                        ) : (
                          <Trash2 className="mr-2 h-4 w-4" />
                        )}
                        {t("invitations.revoke")}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
