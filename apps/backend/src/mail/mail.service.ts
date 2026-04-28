import { Injectable, Logger } from "@nestjs/common";
import nodemailer from "nodemailer";

import { buildInvitationHtml } from "./templates/invitation.template";
import { buildWithdrawalHtml } from "./templates/withdrawal.template";

type MailResult = {
  messageId: string;
} | null;

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async getHealthStatus() {
    const config = this.getSmtpConfig();

    if (!config) {
      return {
        ready: false,
        configured: false,
        host: null,
        port: null,
        secure: null,
        fromAddress: this.getFromAddress(),
        error: "SMTP configuration is missing.",
      };
    }

    const verifyTransport = async (port: number, secure: boolean) => {
      const transporter = nodemailer.createTransport(
        this.buildTransportOptions({
          ...config,
          port,
          secure,
        }),
      );

      await this.withTimeout(
        transporter.verify(),
        this.getMailSendTimeoutMs(),
        `Timed out while verifying SMTP connectivity on port ${port}.`,
      );

      return {
        port,
        secure,
      };
    };

    try {
      const verifiedTransport = await verifyTransport(config.port, config.secure);

      return {
        ready: true,
        configured: true,
        host: config.host,
        port: verifiedTransport.port,
        secure: verifiedTransport.secure,
        fromAddress: this.getFromAddress(),
        error: null,
      };
    } catch (error) {
      const fallbackAvailable =
        config.host.toLowerCase() === "smtp.gmail.com" &&
        !config.secure &&
        config.port === 587 &&
        this.isSmtpNetworkError(error);

      if (fallbackAvailable) {
        try {
          const verifiedFallback = await verifyTransport(465, true);

          return {
            ready: true,
            configured: true,
            host: config.host,
            port: verifiedFallback.port,
            secure: verifiedFallback.secure,
            fromAddress: this.getFromAddress(),
            error: null,
          };
        } catch (fallbackError) {
          return {
            ready: false,
            configured: true,
            host: config.host,
            port: config.port,
            secure: config.secure,
            fromAddress: this.getFromAddress(),
            error:
              fallbackError instanceof Error
                ? fallbackError.message
                : String(fallbackError),
          };
        }
      }

      return {
        ready: false,
        configured: true,
        host: config.host,
        port: config.port,
        secure: config.secure,
        fromAddress: this.getFromAddress(),
        error: error instanceof Error ? error.message : String(error),
      };
    }
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
  ): Promise<MailResult> {
    const celoscanBase =
      process.env.NEXT_PUBLIC_CELOSCAN_BASE?.trim() || "https://celoscan.io";
    const txUrl = txHash
      ? `${celoscanBase.replace(/\/+$/, "")}/tx/${txHash}`
      : "Transaction hash unavailable";

    return this.sendMail(
      {
        to: adminEmail,
        subject: `Retrait decaisse - ${cooperativeName}`,
        html: buildWithdrawalHtml(cooperativeName, amount, txHash),
        text: [
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
  ): Promise<MailResult> {
    return this.sendMail(
      {
        to: adminEmail,
        subject: `Echec du retrait - ${cooperativeName}`,
        html: this.buildFailureHtml(cooperativeName, amount, reason),
        text: [
          `Le retrait de ${amount.toLocaleString()} FCFA pour ${cooperativeName} a echoue.`,
          `Motif: ${reason}`,
        ].join("\n"),
      },
      `withdrawal failure email to ${adminEmail}`,
    );
  }

  async sendVoteNotification(
    memberEmails: string[],
    cooperativeName: string,
    proposalTitle: string,
  ): Promise<MailResult> {
    const recipients = [...new Set(memberEmails.filter(Boolean))];

    if (recipients.length === 0) {
      this.logger.warn(
        `Skipping vote notification email for ${cooperativeName}: no recipients.`,
      );
      return null;
    }

    return this.sendMail(
      {
        to: this.getFromAddress(),
        bcc: recipients.join(", "),
        subject: `Nouvelle proposition a voter - ${cooperativeName}`,
        html: this.buildVoteHtml(cooperativeName, proposalTitle),
        text: [
          `Une nouvelle proposition est ouverte au vote dans ${cooperativeName}.`,
          `Proposition: ${proposalTitle}`,
        ].join("\n"),
      },
      `vote notification email for ${cooperativeName}`,
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
      const transporter = this.getTransporter();

      if (!transporter) {
        return null;
      }

      const sendAttempt = () =>
        this.withTimeout(
          transporter.sendMail({
            from: this.getFromAddress(),
            ...options,
          }),
          this.getMailSendTimeoutMs(),
          `Timed out while sending ${context}.`,
        );

      let info;

      try {
        info = await sendAttempt();
      } catch (error) {
        const fallbackTransporter = this.getGmailFallbackTransporter(error);

        if (!fallbackTransporter) {
          throw error;
        }

        this.logger.warn(`Retrying ${context} using Gmail SSL fallback (465).`);

        info = await this.withTimeout(
          fallbackTransporter.sendMail({
            from: this.getFromAddress(),
            ...options,
          }),
          this.getMailSendTimeoutMs(),
          `Timed out while sending ${context} (fallback).`,
        );
      }

      return {
        messageId: info.messageId,
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

  private getTransporter() {
    const config = this.getSmtpConfig();

    if (!config) {
      this.logger.warn("SMTP is not configured - email delivery disabled.");
      return null;
    }

    return nodemailer.createTransport(this.buildTransportOptions(config));
  }

  private getFromAddress() {
    return (
      this.readEnvValue(process.env.EMAIL_FROM) ||
      "CoopEnergie <noreply@coopenergie.cm>"
    );
  }

  private getSmtpConfig() {
    const host = this.readEnvValue(process.env.SMTP_HOST);
    const user = this.readEnvValue(process.env.SMTP_USER);
    const pass = this.readPassword(process.env.SMTP_PASS);

    if (!host || !user || !pass) {
      return null;
    }

    return {
      host,
      port: parseInt(this.readEnvValue(process.env.SMTP_PORT) || "587", 10),
      secure: this.readEnvValue(process.env.SMTP_SECURE) === "true",
      user,
      pass,
    };
  }

  private buildTransportOptions(config: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
  }) {
    return {
      host: config.host,
      port: config.port,
      secure: config.secure,
      requireTLS: !config.secure,
      auth: { user: config.user, pass: config.pass },
      connectionTimeout: this.parsePositiveInteger(
        process.env.SMTP_CONNECTION_TIMEOUT_MS,
        15000,
      ),
      greetingTimeout: this.parsePositiveInteger(
        process.env.SMTP_GREETING_TIMEOUT_MS,
        10000,
      ),
      socketTimeout: this.parsePositiveInteger(
        process.env.SMTP_SOCKET_TIMEOUT_MS,
        20000,
      ),
    };
  }

  private getGmailFallbackTransporter(error: unknown) {
    const config = this.getSmtpConfig();

    if (!config) {
      return null;
    }

    const isGmail = config.host.toLowerCase() === "smtp.gmail.com";
    const shouldRetryGmailSsl =
      isGmail &&
      !config.secure &&
      config.port === 587 &&
      this.isSmtpNetworkError(error);

    if (!shouldRetryGmailSsl) {
      return null;
    }

    return nodemailer.createTransport(
      this.buildTransportOptions({
        ...config,
        port: 465,
        secure: true,
      }),
    );
  }

  private isConnectionRefusedError(error: unknown) {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();

    return (
      message.includes("econnrefused") ||
      message.includes("connect econnrefused") ||
      message.includes("etimedout") ||
      message.includes("connection timeout")
    );
  }

  private isSmtpNetworkError(error: unknown) {
    return this.isConnectionRefusedError(error);
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

  private readPassword(value: string | undefined) {
    const sanitized = this.readEnvValue(value);
    return sanitized ? sanitized.replace(/\s+/g, "") : undefined;
  }

  private buildFailureHtml(
    cooperativeName: string,
    amount: number,
    reason: string,
  ) {
    return `
      <!DOCTYPE html>
      <html lang="fr">
        <body style="margin:0;padding:0;background-color:#F4F7F4;font-family:Arial,sans-serif;color:#1F2937;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F7F4;margin:0;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="background-color:#1B5E20;padding:24px 32px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#FFFFFF;">CoopEnergie</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#1B5E20;">
                        Echec du retrait pour ${escapeHtml(cooperativeName)}
                      </h1>
                      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                        Le decaissement de <strong>${amount.toLocaleString()} FCFA</strong> n'a pas abouti.
                      </p>
                      <p style="margin:0;font-size:15px;line-height:1.7;">
                        Motif: ${escapeHtml(reason)}
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;background-color:#F0FDF4;font-size:13px;line-height:1.6;color:#4B5563;text-align:center;">
                      CoopEnergie - Transparent Solar Cooperatives
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private buildVoteHtml(cooperativeName: string, proposalTitle: string) {
    return `
      <!DOCTYPE html>
      <html lang="fr">
        <body style="margin:0;padding:0;background-color:#F4F7F4;font-family:Arial,sans-serif;color:#1F2937;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#F4F7F4;margin:0;padding:24px 12px;">
            <tr>
              <td align="center">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
                  <tr>
                    <td style="background-color:#1B5E20;padding:24px 32px;text-align:center;">
                      <div style="font-size:28px;font-weight:700;color:#FFFFFF;">CoopEnergie</div>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 16px;font-size:24px;line-height:1.3;color:#1B5E20;">
                        Nouvelle proposition a voter
                      </h1>
                      <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
                        Une nouvelle proposition a ete publiee dans <strong>${escapeHtml(cooperativeName)}</strong>.
                      </p>
                      <p style="margin:0;font-size:15px;line-height:1.7;">
                        Proposition: <strong>${escapeHtml(proposalTitle)}</strong>
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;background-color:#F0FDF4;font-size:13px;line-height:1.6;color:#4B5563;text-align:center;">
                      CoopEnergie - Transparent Solar Cooperatives
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;
  }

  private getMailSendTimeoutMs() {
    return this.parsePositiveInteger(process.env.SMTP_SEND_TIMEOUT_MS, 20000);
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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
