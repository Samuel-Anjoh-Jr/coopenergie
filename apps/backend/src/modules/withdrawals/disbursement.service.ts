import { createHmac, timingSafeEqual } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { WithdrawalDestinationType, WithdrawalStatus } from "@prisma/client";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { PubSub } from "graphql-subscriptions";

import { VaultService } from "../../blockchain/vault.service";
import { PUBSUB } from "../../graphql/graphql.tokens";
import { MailService } from "../../mail/mail.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";

type CampayTransferResponse = {
  reference?: string;
  external_reference?: string;
  status?: string;
  message?: string;
  [key: string]: unknown;
};

@Injectable()
export class DisbursementService {
  private readonly logger = new Logger(DisbursementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vaultService: VaultService,
    private readonly eventEmitter: EventEmitter2,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
    @Inject(PUBSUB) private readonly pubSub: PubSub,
  ) {}

  async disburse(withdrawalRequestId: string) {
    const withdrawalRequest = await this.prisma.withdrawalRequest.findUnique({
      where: {
        id: withdrawalRequestId,
      },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            vaultAddress: true,
          },
        },
        proposal: {
          select: {
            creatorId: true,
            id: true,
            blockNumber: true,
            status: true,
            txHash: true,
          },
        },
      },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException("Withdrawal request not found.");
    }

    const reference = `COOP-WD-${withdrawalRequest.cooperativeId.slice(0, 8)}-${Date.now()}`;

    await this.prisma.withdrawalRequest.update({
      where: {
        id: withdrawalRequestId,
      },
      data: {
        status: WithdrawalStatus.DISBURSING,
        campayReference: reference,
        failureReason: null,
      },
    });

    try {
      const response = await this.callCampayTransfer(
        withdrawalRequest,
        reference,
      );
      const campayReference =
        this.readString(response.reference) ??
        this.readString(response.external_reference) ??
        reference;

      const disbursedWithdrawal = await this.prisma.$transaction(async (tx) => {
        const updatedWithdrawal = await tx.withdrawalRequest.update({
          where: {
            id: withdrawalRequestId,
          },
          data: {
            status: WithdrawalStatus.DISBURSED,
            campayReference,
            disbursedAt: new Date(),
            failureReason: null,
          },
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                vaultAddress: true,
              },
            },
            proposal: {
              select: {
                id: true,
                blockNumber: true,
                txHash: true,
              },
            },
          },
        });

        await tx.cooperative.update({
          where: {
            id: updatedWithdrawal.cooperativeId,
          },
          data: {
            confirmedBalanceXAF: {
              decrement: updatedWithdrawal.amountXAF,
            },
          },
        });

        await tx.auditLog.create({
          data: {
            action: "withdrawal.disbursed",
            entity: "withdrawal",
            entityId: updatedWithdrawal.id,
            cooperativeId: updatedWithdrawal.cooperativeId,
            metadata: {
              amountXAF: updatedWithdrawal.amountXAF,
              destinationType: updatedWithdrawal.destinationType,
              campayReference,
            },
          },
        });

        return updatedWithdrawal;
      });

      const releaseTxHash =
        await this.tryReleaseFundsOnChain(disbursedWithdrawal);
      const adminEmails = await this.getCooperativeAdminEmails(
        disbursedWithdrawal.cooperativeId,
      );

      this.eventEmitter.emit("withdrawal.disbursed", {
        withdrawalRequestId: disbursedWithdrawal.id,
        cooperativeId: disbursedWithdrawal.cooperativeId,
        amountXAF: disbursedWithdrawal.amountXAF,
        campayReference,
      });
      await this.pubSub.publish(
        `withdrawal.disbursed.${disbursedWithdrawal.cooperativeId}`,
        {
          onWithdrawal: disbursedWithdrawal,
        },
      );

      await this.notificationsService.notifyWithdrawalDisbursed(
        disbursedWithdrawal.cooperativeId,
        disbursedWithdrawal.amountXAF,
        disbursedWithdrawal.recipientName,
        {
          proposalId: disbursedWithdrawal.proposalId,
          withdrawalRequestId: disbursedWithdrawal.id,
          destinationType: disbursedWithdrawal.destinationType,
        },
      );
      await Promise.all(
        adminEmails.map((admin) =>
          this.mailService.sendWithdrawalApprovalNotification(
            admin.email,
            disbursedWithdrawal.cooperative.name,
            disbursedWithdrawal.amountXAF,
            releaseTxHash ?? disbursedWithdrawal.proposal.txHash ?? "",
            admin.preferredLocale,
          ),
        ),
      );

      return disbursedWithdrawal;
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unknown CamPay transfer error.";

      await this.prisma.$transaction(async (tx) => {
        await tx.withdrawalRequest.update({
          where: {
            id: withdrawalRequestId,
          },
          data: {
            status: WithdrawalStatus.FAILED,
            failureReason: message,
          },
        });

        await tx.proposal.update({
          where: {
            id: withdrawalRequest.proposalId,
          },
          data: {
            status: "PENDING",
          },
        });
      });

      const adminEmails = await this.getCooperativeAdminEmails(
        withdrawalRequest.cooperativeId,
      );

      await this.notificationsService.notifyWithdrawalFailed(
        withdrawalRequest.proposal.creatorId,
        withdrawalRequest.amountXAF,
        message,
        {
          cooperativeId: withdrawalRequest.cooperativeId,
          proposalId: withdrawalRequest.proposalId,
          withdrawalRequestId,
          destinationType: withdrawalRequest.destinationType,
          recipientName: withdrawalRequest.recipientName,
        },
      );
      await Promise.all(
        adminEmails.map((admin) =>
          this.mailService.sendWithdrawalFailureNotification(
            admin.email,
            withdrawalRequest.cooperative.name,
            withdrawalRequest.amountXAF,
            message,
            admin.preferredLocale,
          ),
        ),
      );

      throw new InternalServerErrorException("Withdrawal disbursement failed.");
    }
  }

  async handleWebhook(
    payload: Record<string, unknown>,
    headers: Record<string, unknown>,
    rawBody?: Buffer,
  ) {
    this.validateWebhookSignature(headers, rawBody, payload);

    const reference =
      this.readString(payload.external_reference) ??
      this.readString(payload.reference);

    if (!reference) {
      throw new BadRequestException("Missing CamPay withdrawal reference.");
    }

    const withdrawalRequest = await this.prisma.withdrawalRequest.findFirst({
      where: {
        campayReference: reference,
      },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            vaultAddress: true,
          },
        },
        proposal: {
          select: {
            creatorId: true,
            id: true,
            blockNumber: true,
            txHash: true,
          },
        },
      },
    });

    if (!withdrawalRequest) {
      throw new NotFoundException("Withdrawal request not found.");
    }

    const status = (this.readString(payload.status) ?? "").toLowerCase();
    const providerReference =
      this.readString(payload.operator_reference) ??
      this.readString(payload.transaction_reference) ??
      reference;

    if (["success", "successful", "completed", "disbursed"].includes(status)) {
      const alreadyDisbursed =
        withdrawalRequest.status === WithdrawalStatus.DISBURSED;

      const updated = await this.prisma.$transaction(async (tx) => {
        const nextWithdrawal = await tx.withdrawalRequest.update({
          where: {
            id: withdrawalRequest.id,
          },
          data: {
            status: WithdrawalStatus.DISBURSED,
            campayReference: providerReference,
            disbursedAt: withdrawalRequest.disbursedAt ?? new Date(),
            failureReason: null,
          },
          include: {
            cooperative: {
              select: {
                id: true,
                name: true,
                vaultAddress: true,
              },
            },
            proposal: {
              select: {
                id: true,
                blockNumber: true,
                txHash: true,
              },
            },
          },
        });

        if (!alreadyDisbursed) {
          await tx.cooperative.update({
            where: {
              id: withdrawalRequest.cooperativeId,
            },
            data: {
              confirmedBalanceXAF: {
                decrement: withdrawalRequest.amountXAF,
              },
            },
          });

          await tx.auditLog.create({
            data: {
              action: "withdrawal.webhook.disbursed",
              entity: "withdrawal",
              entityId: withdrawalRequest.id,
              cooperativeId: withdrawalRequest.cooperativeId,
              metadata: {
                amountXAF: withdrawalRequest.amountXAF,
                campayReference: providerReference,
              },
            },
          });
        }

        return nextWithdrawal;
      });

      if (!alreadyDisbursed) {
        const releaseTxHash = await this.tryReleaseFundsOnChain(updated);
        const adminEmails = await this.getCooperativeAdminEmails(
          updated.cooperativeId,
        );
        this.eventEmitter.emit("withdrawal.disbursed", {
          withdrawalRequestId: updated.id,
          cooperativeId: updated.cooperativeId,
          amountXAF: updated.amountXAF,
          campayReference: providerReference,
        });
        await this.pubSub.publish(
          `withdrawal.disbursed.${updated.cooperativeId}`,
          {
            onWithdrawal: updated,
          },
        );
        await this.notificationsService.notifyWithdrawalDisbursed(
          updated.cooperativeId,
          updated.amountXAF,
          updated.recipientName,
          {
            proposalId: updated.proposalId,
            withdrawalRequestId: updated.id,
            destinationType: updated.destinationType,
          },
        );
        await Promise.all(
          adminEmails.map((admin) =>
            this.mailService.sendWithdrawalApprovalNotification(
              admin.email,
              updated.cooperative.name,
              updated.amountXAF,
              releaseTxHash ?? updated.proposal.txHash ?? "",
              admin.preferredLocale,
            ),
          ),
        );
      }

      return {
        acknowledged: true,
        status: updated.status,
      };
    }

    const failureReason =
      this.readString(payload.message) ??
      this.readString(payload.reason) ??
      `CamPay status: ${status || "failed"}`;

    await this.prisma.$transaction(async (tx) => {
      await tx.withdrawalRequest.update({
        where: {
          id: withdrawalRequest.id,
        },
        data: {
          status: WithdrawalStatus.FAILED,
          failureReason,
        },
      });

      await tx.proposal.update({
        where: {
          id: withdrawalRequest.proposalId,
        },
        data: {
          status: "PENDING",
        },
      });
    });

    const adminEmails = await this.getCooperativeAdminEmails(
      withdrawalRequest.cooperativeId,
    );

    await this.notificationsService.notifyWithdrawalFailed(
      withdrawalRequest.proposal.creatorId,
      withdrawalRequest.amountXAF,
      failureReason,
      {
        cooperativeId: withdrawalRequest.cooperativeId,
        proposalId: withdrawalRequest.proposalId,
        withdrawalRequestId: withdrawalRequest.id,
        destinationType: withdrawalRequest.destinationType,
        recipientName: withdrawalRequest.recipientName,
      },
    );
    await Promise.all(
      adminEmails.map((admin) =>
        this.mailService.sendWithdrawalFailureNotification(
          admin.email,
          withdrawalRequest.cooperative.name,
          withdrawalRequest.amountXAF,
          failureReason,
          admin.preferredLocale,
        ),
      ),
    );

    return {
      acknowledged: true,
      status: WithdrawalStatus.FAILED,
    };
  }

  private async callCampayTransfer(
    withdrawalRequest: {
      amountXAF: number;
      destinationType: WithdrawalDestinationType;
      recipientPhone: string | null;
      recipientOperator: string | null;
      recipientBankName: string | null;
      recipientBankAccount: string | null;
      recipientName: string;
      cooperative: {
        name: string;
      };
    },
    reference: string,
  ) {
    const transferApiKey = (
      process.env.CAMPAY_TRANSFER_API_KEY ||
      process.env.CAMPAY_API_KEY ||
      process.env.CAMPAY_PERMANENT_TOKEN
    )?.trim();
    const baseUrl = (
      process.env.CAMPAY_BASE_URL || process.env.CAMPAY_API_BASE_URL
    )?.trim();

    if (!transferApiKey || !baseUrl) {
      throw new Error("CamPay transfer credentials are not configured.");
    }

    const body = this.buildTransferBody(withdrawalRequest, reference);
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/withdraw/`, {
      method: "POST",
      headers: {
        Authorization: `Token ${transferApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    const payload = this.tryParseJson(text);
    const errorMessage =
      this.readString(payload?.message) ??
      this.readString(payload?.detail) ??
      (text || `CamPay transfer failed with status ${response.status}.`);

    if (!response.ok) {
      throw new Error(errorMessage);
    }

    return (payload ?? {}) as CampayTransferResponse;
  }

  private buildTransferBody(
    withdrawalRequest: {
      amountXAF: number;
      destinationType: WithdrawalDestinationType;
      recipientPhone: string | null;
      recipientOperator: string | null;
      recipientBankName: string | null;
      recipientBankAccount: string | null;
      recipientName: string;
      cooperative: {
        name: string;
      };
    },
    reference: string,
  ) {
    if (
      withdrawalRequest.destinationType ===
      WithdrawalDestinationType.BANK_TRANSFER
    ) {
      if (
        !withdrawalRequest.recipientBankName ||
        !withdrawalRequest.recipientBankAccount
      ) {
        throw new BadRequestException("Bank transfer details are incomplete.");
      }

      return {
        amount: withdrawalRequest.amountXAF.toString(),
        currency: "XAF",
        to: withdrawalRequest.recipientBankAccount,
        operator: "BANK",
        bank_name: withdrawalRequest.recipientBankName,
        recipient_name: withdrawalRequest.recipientName,
        description: `Retrait cooperative ${withdrawalRequest.cooperative.name}`,
        external_reference: reference,
      };
    }

    if (
      !withdrawalRequest.recipientPhone ||
      !withdrawalRequest.recipientOperator
    ) {
      throw new BadRequestException(
        "Mobile money transfer details are incomplete.",
      );
    }

    return {
      amount: withdrawalRequest.amountXAF.toString(),
      currency: "XAF",
      to: withdrawalRequest.recipientPhone,
      operator: withdrawalRequest.recipientOperator,
      description: `Retrait cooperative ${withdrawalRequest.cooperative.name}`,
      external_reference: reference,
    };
  }

  private async tryReleaseFundsOnChain(withdrawalRequest: {
    id: string;
    cooperativeId: string;
    proposalId: string;
    amountXAF: number;
    cooperative: {
      vaultAddress: string | null;
    };
    proposal: {
      blockNumber: number | null;
    };
    recipientPhone: string | null;
    recipientName: string;
  }) {
    if (process.env.BLOCKCHAIN_ENABLED !== "true") {
      return null;
    }

    if (
      !withdrawalRequest.cooperative.vaultAddress ||
      !withdrawalRequest.proposal.blockNumber
    ) {
      return null;
    }

    try {
      const vaultAdminAddress = await this.vaultService.getAdmin(
        withdrawalRequest.cooperative.vaultAddress,
      );
      const adminUser = await this.prisma.user.findFirst({
        where: {
          celoAddress: {
            equals: vaultAdminAddress,
            mode: "insensitive",
          },
        },
        select: {
          id: true,
          celoKeyEncrypted: true,
        },
      });

      if (!adminUser?.celoKeyEncrypted) {
        this.logger.warn(
          `Skipping on-chain withdrawal release for ${withdrawalRequest.id}: no stored CELO key for vault admin ${vaultAdminAddress}.`,
        );
        return null;
      }

      const releaseResult = await this.vaultService.releaseFundsAsAdmin(
        withdrawalRequest.cooperative.vaultAddress,
        adminUser.celoKeyEncrypted,
        withdrawalRequest.recipientPhone ??
          `beneficiary:${withdrawalRequest.recipientName}`,
        withdrawalRequest.amountXAF,
        withdrawalRequest.proposal.blockNumber,
      );

      await this.prisma.auditLog.create({
        data: {
          action: "withdrawal.released_on_chain",
          entity: "withdrawal",
          entityId: withdrawalRequest.id,
          userId: adminUser.id,
          cooperativeId: withdrawalRequest.cooperativeId,
          metadata: {
            proposalId: withdrawalRequest.proposalId,
            amountXAF: withdrawalRequest.amountXAF,
            vaultAdminAddress,
            releaseTxHash: releaseResult.txHash,
          },
        },
      });

      return releaseResult.txHash;
    } catch (error) {
      this.logger.error(
        `On-chain withdrawal release failed for ${withdrawalRequest.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  private validateWebhookSignature(
    headers: Record<string, unknown>,
    rawBody: Buffer | undefined,
    payload: Record<string, unknown>,
  ) {
    const secret = this.readSecret(
      process.env.CAMPAY_WEBHOOK_SECRET || process.env.CAMPAY_WEBHOOK_KEY,
    );

    if (!secret) {
      throw new InternalServerErrorException(
        "CAMPAY_WEBHOOK_SECRET/CAMPAY_WEBHOOK_KEY is not configured.",
      );
    }

    const providedSignature =
      this.extractHeader(
        headers,
        "x-campay-signature",
        "campay-signature",
        "x-signature",
        "x-webhook-signature",
        "webhook-signature",
      ) ||
      this.readAuthorizationBearerToken(headers) ||
      this.readString(payload.signature) ||
      this.readString(payload.token);

    if (!providedSignature) {
      throw new BadRequestException("Missing CamPay signature.");
    }

    if (this.isJwtLike(providedSignature)) {
      const validJwt = this.verifyHs256JwtSignature(providedSignature, secret);

      if (!validJwt) {
        throw new BadRequestException("Invalid CamPay signature.");
      }

      return;
    }

    const rawPayload = rawBody?.length
      ? rawBody
      : Buffer.from(JSON.stringify(payload));
    const expectedSignature = createHmac("sha256", secret)
      .update(rawPayload)
      .digest("hex");

    const normalizedProvided = providedSignature.replace(/^sha256=/i, "");

    if (
      normalizedProvided.length !== expectedSignature.length ||
      !timingSafeEqual(
        Buffer.from(normalizedProvided),
        Buffer.from(expectedSignature),
      )
    ) {
      throw new BadRequestException("Invalid CamPay signature.");
    }
  }

  private readAuthorizationBearerToken(headers: Record<string, unknown>) {
    const authorization = this.extractHeader(headers, "authorization");

    if (!authorization) {
      return undefined;
    }

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1]?.trim();
  }

  private isJwtLike(value: string) {
    return value.split(".").length === 3;
  }

  private verifyHs256JwtSignature(token: string, secret: string) {
    const [headerB64, payloadB64, signatureB64] = token.split(".");

    if (!headerB64 || !payloadB64 || !signatureB64) {
      return false;
    }

    const header = this.tryParseJson(this.decodeBase64Url(headerB64));

    if (header?.alg !== "HS256") {
      return false;
    }

    const signingInput = `${headerB64}.${payloadB64}`;
    const expectedSignature = createHmac("sha256", secret)
      .update(signingInput)
      .digest();
    const providedSignature = this.decodeBase64UrlToBuffer(signatureB64);

    if (
      !providedSignature ||
      providedSignature.length !== expectedSignature.length
    ) {
      return false;
    }

    return timingSafeEqual(providedSignature, expectedSignature);
  }

  private decodeBase64Url(value: string) {
    const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding =
      normalized.length % 4 === 0
        ? ""
        : "=".repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, "base64").toString("utf8");
  }

  private decodeBase64UrlToBuffer(value: string) {
    try {
      const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
      const padding =
        normalized.length % 4 === 0
          ? ""
          : "=".repeat(4 - (normalized.length % 4));
      return Buffer.from(`${normalized}${padding}`, "base64");
    } catch {
      return null;
    }
  }

  private extractHeader(
    headers: Record<string, unknown>,
    ...names: string[]
  ): string | undefined {
    for (const name of names) {
      const value = headers[name] ?? headers[name.toLowerCase()];

      if (typeof value === "string" && value) {
        return value;
      }

      if (Array.isArray(value) && typeof value[0] === "string") {
        return value[0];
      }
    }

    return undefined;
  }

  private async getCooperativeAdminEmails(
    cooperativeId: string,
  ): Promise<Array<{ email: string; preferredLocale: string }>> {
    const admins = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
        role: "COOP_ADMIN",
      },
      select: {
        user: {
          select: {
            email: true,
            preferredLocale: true,
          },
        },
      },
    });

    const recipients = admins
      .map((membership) => ({
        email: membership.user.email,
        preferredLocale: membership.user.preferredLocale ?? "fr",
      }))
      .filter(
        (recipient): recipient is { email: string; preferredLocale: string } =>
          Boolean(recipient.email),
      );

    if (recipients.length === 0) {
      this.logger.warn(
        `No cooperative admin email found for ${cooperativeId}.`,
      );
      return [];
    }

    return recipients;
  }

  private tryParseJson(value: string) {
    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  private readString(value: unknown) {
    return typeof value === "string" ? value : undefined;
  }

  private readSecret(value: string | undefined) {
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
}
