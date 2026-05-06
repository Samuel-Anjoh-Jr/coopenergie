import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";

import { buildCeloScanTxUrl } from "../common/celoscan.util";
import { buildBrandedEmailHtml, escapeHtml } from "./templates/brand.template";
import { buildInvitationHtml } from "./templates/invitation.template";
import { buildWithdrawalHtml } from "./templates/withdrawal.template";

type MailResult = {
  messageId: string;
} | null;

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);

  onModuleInit() {
    const fromAddress = this.getFromAddress();
    const senderEmail = this.extractSenderEmail(fromAddress)?.toLowerCase();
    const configuredFrom = this.readEnvValue(process.env.RESEND_FROM);
    const configuredReplyTo = this.getReplyToAddress();

    if (!configuredFrom) {
      this.logger.warn(
        "RESEND_FROM is not set. Using fallback sender. Configure a verified sender/domain in Resend for production delivery.",
      );
      return;
    }

    if (senderEmail && this.isResendOnboardingSender(senderEmail)) {
      this.logger.warn(
        `RESEND_FROM (${fromAddress}) appears to use Resend onboarding sender format. This is typically unverified/restricted for production. Verify your domain in Resend and switch RESEND_FROM to it.`,
      );
    }

    if (!configuredReplyTo) {
      this.logger.warn(
        "RESEND_REPLY_TO is not set. Replies will go to the sender address.",
      );
    }
  }

  async getHealthStatus() {
    const apiKey = this.getResendApiKey();

    if (!apiKey) {
      return {
        provider: "resend",
        ready: false,
        configured: false,
        host: null,
        port: null,
        secure: null,
        fromAddress: this.getFromAddress(),
        error: "Resend configuration is missing.",
      };
    }

    if (!this.isLikelyResendApiKey(apiKey)) {
      return {
        provider: "resend",
        ready: false,
        configured: true,
        host: "api.resend.com",
        port: 443,
        secure: true,
        fromAddress: this.getFromAddress(),
        error: "RESEND_API_KEY looks invalid.",
      };
    }

    return {
      provider: "resend",
      ready: true,
      configured: true,
      host: "api.resend.com",
      port: 443,
      secure: true,
      fromAddress: this.getFromAddress(),
      error: null,
    };
  }

  async sendInvitationEmail(
    to: string,
    cooperativeName: string,
    joinUrl: string,
    locale: string,
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");
    const subject = isEnglish
      ? `You are invited to join ${cooperativeName}`
      : `Vous etes invite(e) a rejoindre ${cooperativeName}`;
    const text = isEnglish
      ? [
          `You are invited to join ${cooperativeName}.`,
          `Join now: ${joinUrl}`,
          "This link expires in 72 hours.",
          "CoopEnergie - Transparent Solar Cooperatives",
        ].join("\n")
      : [
          `Vous etes invite(e) a rejoindre ${cooperativeName}.`,
          `Rejoindre maintenant : ${joinUrl}`,
          "Ce lien expire dans 72 heures.",
          "CoopEnergie - Transparent Solar Cooperatives",
        ].join("\n");

    try {
      return await this.sendMail(
        {
          to,
          subject,
          html: buildInvitationHtml(cooperativeName, joinUrl, locale),
          text,
        },
        `invitation email to ${to}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send invitation email to ${to}: ${error instanceof Error ? error.message : String(error)}`,
      );
      return null;
    }
  }

  async sendWithdrawalApprovalNotification(
    adminEmail: string,
    cooperativeName: string,
    amount: number,
    txHash: string,
    locale = "fr",
  ): Promise<MailResult> {
    const txUrl = txHash
      ? buildCeloScanTxUrl(txHash)
      : "Transaction hash unavailable";
    const isEnglish = locale.toLowerCase().startsWith("en");

    return this.sendMail(
      {
        to: adminEmail,
        subject: isEnglish
          ? `Withdrawal disbursed - ${cooperativeName}`
          : `Retrait decaisse - ${cooperativeName}`,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Withdrawal" : "Retrait",
          title: isEnglish ? "Withdrawal disbursed" : "Retrait decaisse",
          intro: isEnglish
            ? `The withdrawal of ${amount.toLocaleString()} XAF for ${escapeHtml(cooperativeName)} has been disbursed.`
            : `Le retrait de ${amount.toLocaleString()} FCFA pour ${escapeHtml(cooperativeName)} a ete decaisse.`,
          detailsHtml: `<strong>${isEnglish ? "Transaction" : "Transaction"}</strong><br/><a href="${escapeHtml(txUrl)}">${escapeHtml(txUrl)}</a>`,
        }),
        text: isEnglish
          ? [
              `The withdrawal of ${amount.toLocaleString()} XAF for ${cooperativeName} has been disbursed.`,
              `Transaction: ${txUrl}`,
            ].join("\n")
          : [
              `Le retrait de ${amount.toLocaleString()} FCFA pour ${cooperativeName} a ete decaisse.`,
              `Transaction: ${txUrl}`,
            ].join("\n"),
      },
      `withdrawal approval email to ${adminEmail}`,
    );
  }

  async sendWithdrawalFailureNotification(
    adminEmail: string,
    cooperativeName: string,
    amount: number,
    reason: string,
    locale = "fr",
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");

    return this.sendMail(
      {
        to: adminEmail,
        subject: isEnglish
          ? `Withdrawal failed - ${cooperativeName}`
          : `Echec du retrait - ${cooperativeName}`,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Failure" : "Echec",
          title: isEnglish ? "Withdrawal failed" : "Retrait echoue",
          intro: isEnglish
            ? `The withdrawal of ${amount.toLocaleString()} XAF for ${escapeHtml(cooperativeName)} has failed.`
            : `Le retrait de ${amount.toLocaleString()} FCFA pour ${escapeHtml(cooperativeName)} a echoue.`,
          detailsHtml: `<strong>${isEnglish ? "Reason" : "Motif"}</strong><br/>${escapeHtml(reason)}`,
        }),
        text: isEnglish
          ? [
              `The withdrawal of ${amount.toLocaleString()} XAF for ${cooperativeName} has failed.`,
              `Reason: ${reason}`,
            ].join("\n")
          : [
              `Le retrait de ${amount.toLocaleString()} FCFA pour ${cooperativeName} a echoue.`,
              `Motif: ${reason}`,
            ].join("\n"),
      },
      `withdrawal failure email to ${adminEmail}`,
    );
  }

  async sendVoteNotification(
    members: { email: string; locale: string }[],
    cooperativeName: string,
    proposalTitle: string,
  ): Promise<MailResult> {
    const uniqueMembers = [
      ...new Map(
        members.filter((m) => Boolean(m.email)).map((m) => [m.email, m]),
      ).values(),
    ];

    if (uniqueMembers.length === 0) {
      this.logger.warn(
        `Skipping vote notification email for ${cooperativeName}: no recipients.`,
      );
      return null;
    }

    const enRecipients = uniqueMembers
      .filter((m) => m.locale.toLowerCase().startsWith("en"))
      .map((m) => m.email);
    const frRecipients = uniqueMembers
      .filter((m) => !m.locale.toLowerCase().startsWith("en"))
      .map((m) => m.email);

    const sendGroup = async (recipients: string[], isEnglish: boolean) => {
      if (recipients.length === 0) return null;
      return this.sendMail(
        {
          to: this.getFromAddress(),
          bcc: recipients.join(", "),
          subject: isEnglish
            ? `New proposal to vote on - ${cooperativeName}`
            : `Nouvelle proposition a voter - ${cooperativeName}`,
          html: buildBrandedEmailHtml({
            lang: isEnglish ? "en" : "fr",
            badge: isEnglish ? "Vote" : "Vote",
            title: isEnglish
              ? "New proposal open for vote"
              : "Nouvelle proposition ouverte au vote",
            intro: isEnglish
              ? `A new proposal is open for vote in ${escapeHtml(cooperativeName)}.`
              : `Une nouvelle proposition est ouverte au vote dans ${escapeHtml(cooperativeName)}.`,
            detailsHtml: `<strong>${isEnglish ? "Proposal" : "Proposition"}</strong><br/>${escapeHtml(proposalTitle)}`,
          }),
          text: isEnglish
            ? [
                `A new proposal is open for vote in ${cooperativeName}.`,
                `Proposal: ${proposalTitle}`,
              ].join("\n")
            : [
                `Une nouvelle proposition est ouverte au vote dans ${cooperativeName}.`,
                `Proposition: ${proposalTitle}`,
              ].join("\n"),
        },
        `vote notification email for ${cooperativeName}`,
      );
    };

    const [enResult, frResult] = await Promise.all([
      sendGroup(enRecipients, true),
      sendGroup(frRecipients, false),
    ]);

    return enResult ?? frResult;
  }

  async sendVendorRegistrationActivatedNotification(
    to: string,
    businessName: string,
    locale = "fr",
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");

    return this.sendMail(
      {
        to,
        subject: isEnglish
          ? `Vendor account activated - ${businessName}`
          : `Compte vendeur active - ${businessName}`,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Activation" : "Activation",
          title: isEnglish
            ? "Your vendor account is active"
            : "Votre compte vendeur est actif",
          intro: isEnglish
            ? "Your registration payment has been validated and your store is now active on CoopEnergie."
            : "Votre paiement d'inscription a ete valide et votre boutique est maintenant active sur CoopEnergie.",
          detailsHtml: `<strong>${isEnglish ? "Store" : "Boutique"}</strong><br/>${escapeHtml(businessName)}`,
        }),
        text: isEnglish
          ? [
              `Your vendor account ${businessName} is now active on CoopEnergie.`,
            ].join("\n")
          : [
              `Votre compte vendeur ${businessName} est maintenant actif sur CoopEnergie.`,
            ].join("\n"),
      },
      `vendor registration activation email to ${to}`,
    );
  }

  async sendVendorSubscriptionActivatedNotification(
    to: string,
    businessName: string,
    billingCycle: "MONTHLY" | "YEARLY",
    expiresAt: Date,
    locale = "fr",
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");
    const readableCycle =
      billingCycle === "YEARLY"
        ? isEnglish
          ? "annual"
          : "annuel"
        : isEnglish
          ? "monthly"
          : "mensuel";

    return this.sendMail(
      {
        to,
        subject: isEnglish
          ? `Vendor subscription active - ${businessName}`
          : `Abonnement vendeur actif - ${businessName}`,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Subscription" : "Abonnement",
          title: isEnglish ? "Subscription activated" : "Abonnement active",
          intro: isEnglish
            ? "Your subscription payment has been confirmed. Your store remains visible and active."
            : "Votre paiement d'abonnement a ete confirme. Votre boutique reste visible et active.",
          detailsHtml: [
            `<strong>${isEnglish ? "Cycle" : "Cycle"}</strong><br/>${escapeHtml(readableCycle)}`,
            `<strong>${isEnglish ? "Expiry" : "Expiration"}</strong><br/>${escapeHtml(expiresAt.toISOString())}`,
          ].join("<br/><br/>"),
        }),
        text: isEnglish
          ? [
              `Your vendor subscription (${readableCycle}) for ${businessName} is active.`,
              `Expiry: ${expiresAt.toISOString()}`,
            ].join("\n")
          : [
              `Votre abonnement vendeur (${readableCycle}) pour ${businessName} est actif.`,
              `Expiration: ${expiresAt.toISOString()}`,
            ].join("\n"),
      },
      `vendor subscription activation email to ${to}`,
    );
  }

  async sendSubscriptionExpiredNotification(
    to: string,
    businessName: string,
    locale = "fr",
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");

    return this.sendMail(
      {
        to,
        subject: isEnglish
          ? `Vendor subscription expired - ${businessName}`
          : `Abonnement vendeur expire - ${businessName}`,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Expiry" : "Expiration",
          title: isEnglish ? "Subscription expired" : "Abonnement expire",
          intro: isEnglish
            ? "Your vendor subscription has expired. Renew your subscription to reactivate your storefront."
            : "Votre abonnement vendeur a expire. Renouvelez votre abonnement pour reactiver votre vitrine.",
          detailsHtml: `<strong>${isEnglish ? "Store" : "Boutique"}</strong><br/>${escapeHtml(businessName)}`,
        }),
        text: isEnglish
          ? [
              `Your vendor subscription for ${businessName} has expired.`,
              "Log in to start a new subscription payment.",
            ].join("\n")
          : [
              `Votre abonnement vendeur pour ${businessName} a expire.`,
              "Connectez-vous pour lancer un nouveau paiement d'abonnement.",
            ].join("\n"),
      },
      `vendor subscription expiry email to ${to}`,
    );
  }

  async sendVendorProposalApprovedNotification(
    to: string,
    businessName: string,
    cooperativeName: string,
    proposalTitle: string,
    locale = "fr",
    cooperativeAdminContact?: {
      name?: string | null;
      email?: string | null;
      phone?: string | null;
    },
  ): Promise<MailResult> {
    const isEnglish = locale.toLowerCase().startsWith("en");
    const subjectFr = `Proposition approuvee - ${cooperativeName}`;
    const subjectEn = `Proposal approved - ${cooperativeName}`;
    const adminName =
      cooperativeAdminContact?.name ||
      (isEnglish ? "Not provided" : "Non renseigne");
    const adminEmail =
      cooperativeAdminContact?.email ||
      (isEnglish ? "Not provided" : "Non renseigne");
    const adminPhone =
      cooperativeAdminContact?.phone ||
      (isEnglish ? "Not provided" : "Non renseigne");

    return this.sendMail(
      {
        to,
        subject: isEnglish ? subjectEn : subjectFr,
        html: buildBrandedEmailHtml({
          lang: isEnglish ? "en" : "fr",
          badge: isEnglish ? "Approval" : "Approbation",
          title: isEnglish
            ? "Your vendor proposal has been approved"
            : "Votre proposition vendeur a ete approuvee",
          intro: isEnglish
            ? "A cooperative approved your purchase proposal. You can now prepare fulfillment details from your vendor space."
            : "Une cooperative a approuve votre proposition d'achat. Vous pouvez maintenant preparer l'execution depuis votre espace vendeur.",
          detailsHtml: [
            `<strong>${isEnglish ? "Vendor" : "Vendeur"}</strong><br/>${escapeHtml(businessName)}`,
            `<strong>${isEnglish ? "Cooperative" : "Cooperative"}</strong><br/>${escapeHtml(cooperativeName)}`,
            `<strong>${isEnglish ? "Proposal" : "Proposition"}</strong><br/>${escapeHtml(proposalTitle)}`,
            `<strong>${isEnglish ? "Cooperative admin contact" : "Contact admin cooperative"}</strong><br/>${escapeHtml(adminName)}<br/>${escapeHtml(adminEmail)}<br/>${escapeHtml(adminPhone)}`,
            "<hr/>",
            `<strong>FR</strong><br/>Votre proposition vendeur a ete approuvee par ${escapeHtml(cooperativeName)}.`,
            `<strong>EN</strong><br/>Your vendor proposal was approved by ${escapeHtml(cooperativeName)}.`,
          ].join("<br/><br/>"),
        }),
        text: [
          `FR: Votre proposition vendeur \"${proposalTitle}\" a ete approuvee par ${cooperativeName}.`,
          `EN: Your vendor proposal \"${proposalTitle}\" was approved by ${cooperativeName}.`,
          `${isEnglish ? "Vendor" : "Vendeur"}: ${businessName}`,
          `${isEnglish ? "Cooperative admin" : "Admin cooperative"}: ${adminName} | ${adminEmail} | ${adminPhone}`,
        ].join("\n"),
      },
      `vendor proposal approved email to ${to}`,
    );
  }

  private async sendMail(
    options: {
      to: string;
      subject: string;
      html: string;
      text: string;
      bcc?: string;
    },
    context: string,
  ): Promise<MailResult> {
    try {
      const resend = this.getResendClient();

      if (!resend) {
        return null;
      }

      const result = await this.withTimeout(
        resend.emails.send(this.buildResendPayload(options)),
        this.getMailSendTimeoutMs(),
        `Timed out while sending ${context}.`,
      );

      if (result.error) {
        throw new Error(result.error.message);
      }

      const messageId = result.data?.id ?? null;

      if (!messageId) {
        this.logger.warn(
          `Resend accepted ${context} but did not return a message id.`,
        );
        return null;
      }

      return {
        messageId,
      };
    } catch (error) {
      this.logger.warn(
        `Failed to send ${context}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private getResendClient() {
    const apiKey = this.getResendApiKey();

    if (!apiKey) {
      this.logger.warn("Resend is not configured - email delivery disabled.");
      return null;
    }

    return new Resend(apiKey);
  }

  private getFromAddress() {
    return (
      this.readEnvValue(process.env.RESEND_FROM) ||
      this.readEnvValue(process.env.EMAIL_FROM) ||
      "CoopEnergie <onboarding@resend.dev>"
    );
  }

  private getResendApiKey() {
    return this.readEnvValue(process.env.RESEND_API_KEY);
  }

  private getReplyToAddress() {
    return (
      this.readEnvValue(process.env.RESEND_REPLY_TO) ||
      this.readEnvValue(process.env.EMAIL_REPLY_TO)
    );
  }

  private isLikelyResendApiKey(key: string) {
    return key.startsWith("re_");
  }

  private parseBcc(value?: string) {
    if (!value) {
      return undefined;
    }

    const recipients = value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

    return recipients.length > 0 ? recipients : undefined;
  }

  private buildResendPayload(options: {
    to: string;
    subject: string;
    html: string;
    text: string;
    bcc?: string;
  }) {
    const payload: Parameters<Resend["emails"]["send"]>[0] = {
      from: this.getFromAddress(),
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
      bcc: this.parseBcc(options.bcc),
    };

    const replyTo = this.getReplyToAddress();

    if (replyTo) {
      payload.replyTo = replyTo;
    }

    return payload;
  }

  private extractSenderEmail(fromAddress: string) {
    const bracketMatch = fromAddress.match(/<([^>]+)>/);

    if (bracketMatch?.[1]) {
      return bracketMatch[1].trim();
    }

    return fromAddress.trim();
  }

  private isResendOnboardingSender(senderEmail: string) {
    return (
      senderEmail === "onboarding@resend.dev" ||
      senderEmail.endsWith("@resend.dev")
    );
  }

  private readEnvValue(value: string | undefined) {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();

    if (
      (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
      const unwrapped = trimmed.slice(1, -1).trim();
      return unwrapped || undefined;
    }

    return trimmed || undefined;
  }

  private buildFailureHtml(
    cooperativeName: string,
    amount: number,
    reason: string,
  ) {
    return buildBrandedEmailHtml({
      lang: "fr",
      badge: "Alerte decaissement",
      title: `Echec du retrait pour ${cooperativeName}`,
      intro: `Le decaissement de <strong>${amount.toLocaleString()} FCFA</strong> n'a pas abouti.`,
      detailsHtml: `<span style="display:block;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#9A3412;">Motif</span><span style="display:block;margin-top:6px;color:#7C2D12;">${escapeHtml(reason)}</span>`,
    });
  }

  private buildVoteHtml(cooperativeName: string, proposalTitle: string) {
    return buildBrandedEmailHtml({
      lang: "fr",
      badge: "Notification vote",
      title: "Nouvelle proposition a voter",
      intro: `Une nouvelle proposition a ete publiee dans <strong>${escapeHtml(cooperativeName)}</strong>.`,
      detailsHtml: `<span style="display:block;font-size:12px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#166534;">Proposition</span><span style="display:block;margin-top:6px;"><strong>${escapeHtml(proposalTitle)}</strong></span>`,
    });
  }

  private getMailSendTimeoutMs() {
    return this.parsePositiveInteger(
      process.env.RESEND_SEND_TIMEOUT_MS ?? process.env.SMTP_SEND_TIMEOUT_MS,
      20000,
    );
  }

  private parsePositiveInteger(value: string | undefined, fallback: number) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    errorMessage: string,
  ): Promise<T> {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timeoutHandle = setTimeout(() => {
            reject(new Error(errorMessage));
          }, timeoutMs);
        }),
      ]);
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }
}
