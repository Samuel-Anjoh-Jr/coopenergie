import { Injectable, Logger } from "@nestjs/common";
import {
  ContributionStatus,
  DevicePlatform,
  ProposalType,
  Role,
} from "@prisma/client";

import {
  NOTIFICATION_SOUND_BY_TYPE,
  NotificationSoundKey,
} from "./notification-sounds";
import { ExpoPushService } from "./expo-push.service";
import { FirebaseAdminService } from "./firebase-admin.service";
import { PrismaService } from "../prisma/prisma.service";

type NotificationData = Record<string, string>;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly firebaseAdminService: FirebaseAdminService,
    private readonly expoPushService: ExpoPushService,
    private readonly prisma: PrismaService,
  ) {}

  async notifyContributionConfirmed(
    cooperativeId: string,
    contributorName: string,
    amountXAF: number,
    txHash: string,
  ) {
    await this.dispatch(
      await this.getCooperativeMembers(cooperativeId),
      "Nouvelle cotisation",
      `${contributorName} a cotise ${amountXAF.toLocaleString()} FCFA`,
      {
        type: "CONTRIBUTION",
        txHash,
        cooperativeId,
      },
      "CONTRIBUTION",
    );
  }

  async notifyNewProposal(
    cooperativeId: string,
    proposalTitle: string,
    proposalType: ProposalType,
    details?: {
      proposalId?: string;
      withdrawalRequestId?: string;
      amountXAF?: number;
      destinationType?: string;
      recipientName?: string;
    },
  ) {
    const recipients =
      proposalType === ProposalType.WITHDRAWAL
        ? await this.getEligibleVoterIds(cooperativeId)
        : await this.getCooperativeMembers(cooperativeId);

    await this.dispatch(
      recipients,
      proposalType === ProposalType.WITHDRAWAL
        ? "Proposition de retrait"
        : "Nouvelle proposition",
      `${proposalTitle} - votez maintenant`,
      {
        type: "PROPOSAL",
        proposalType,
        cooperativeId,
        ...(details?.proposalId ? { proposalId: details.proposalId } : {}),
        ...(details?.withdrawalRequestId
          ? { withdrawalRequestId: details.withdrawalRequestId }
          : {}),
        ...(details?.amountXAF !== undefined
          ? { amountXAF: details.amountXAF.toString() }
          : {}),
        ...(details?.destinationType
          ? { destinationType: details.destinationType }
          : {}),
        ...(details?.recipientName
          ? { recipientName: details.recipientName }
          : {}),
      },
      "PROPOSAL",
    );
  }

  async notifyVoteCast(
    cooperativeId: string,
    adminUserId: string,
    yesCount: number,
    noCount: number,
  ) {
    await this.dispatch(
      [adminUserId],
      "Mise a jour du vote",
      `${yesCount} oui · ${noCount} non`,
      {
        type: "VOTE",
        cooperativeId,
        yesCount: yesCount.toString(),
        noCount: noCount.toString(),
      },
      "VOTE",
    );
  }

  async notifyWithdrawalApproved(
    cooperativeId: string,
    adminUserId: string,
    amountXAF: number,
    details?: {
      proposalId?: string;
      withdrawalRequestId?: string;
      destinationType?: string;
      recipientName?: string;
    },
  ) {
    await this.dispatch(
      [adminUserId],
      "Retrait approuve",
      `${amountXAF.toLocaleString()} FCFA - decaissement en cours`,
      {
        type: "WITHDRAWAL_APPROVED",
        cooperativeId,
        amountXAF: amountXAF.toString(),
        ...(details?.proposalId ? { proposalId: details.proposalId } : {}),
        ...(details?.withdrawalRequestId
          ? { withdrawalRequestId: details.withdrawalRequestId }
          : {}),
        ...(details?.destinationType
          ? { destinationType: details.destinationType }
          : {}),
        ...(details?.recipientName
          ? { recipientName: details.recipientName }
          : {}),
      },
      "WITHDRAWAL_APPROVED",
    );
  }

  async notifyWithdrawalDisbursed(
    cooperativeId: string,
    amountXAF: number,
    recipientName: string,
    details?: {
      proposalId?: string;
      withdrawalRequestId?: string;
      destinationType?: string;
    },
  ) {
    await this.dispatch(
      await this.getCooperativeMembers(cooperativeId),
      "Fonds transferes",
      `${amountXAF.toLocaleString()} FCFA transferes vers ${recipientName}`,
      {
        type: "WITHDRAWAL_DISBURSED",
        cooperativeId,
        amountXAF: amountXAF.toString(),
        recipientName,
        ...(details?.proposalId ? { proposalId: details.proposalId } : {}),
        ...(details?.withdrawalRequestId
          ? { withdrawalRequestId: details.withdrawalRequestId }
          : {}),
        ...(details?.destinationType
          ? { destinationType: details.destinationType }
          : {}),
      },
      "WITHDRAWAL_DISBURSED",
    );
  }

  async notifyWithdrawalFailed(
    adminUserId: string,
    amountXAF: number,
    reason: string,
    details?: {
      cooperativeId?: string;
      proposalId?: string;
      withdrawalRequestId?: string;
      destinationType?: string;
      recipientName?: string;
    },
  ) {
    await this.dispatch(
      [adminUserId],
      "Echec du retrait",
      `${amountXAF.toLocaleString()} FCFA - ${reason}`,
      {
        type: "WITHDRAWAL_FAILED",
        amountXAF: amountXAF.toString(),
        reason,
        ...(details?.cooperativeId
          ? { cooperativeId: details.cooperativeId }
          : {}),
        ...(details?.proposalId ? { proposalId: details.proposalId } : {}),
        ...(details?.withdrawalRequestId
          ? { withdrawalRequestId: details.withdrawalRequestId }
          : {}),
        ...(details?.destinationType
          ? { destinationType: details.destinationType }
          : {}),
        ...(details?.recipientName
          ? { recipientName: details.recipientName }
          : {}),
      },
      "WITHDRAWAL_FAILED",
    );
  }

  async notifyPaymentConfirmed(userId: string, amountXAF: number) {
    await this.dispatch(
      [userId],
      "Paiement confirme",
      `${amountXAF.toLocaleString()} FCFA recus`,
      {
        type: "PAYMENT_CONFIRMED",
        amountXAF: amountXAF.toString(),
      },
      "PAYMENT_CONFIRMED",
    );
  }

  async notifyPaymentFailed(userId: string, amountXAF: number) {
    await this.dispatch(
      [userId],
      "Paiement echoue",
      `${amountXAF.toLocaleString()} FCFA n'ont pas ete confirmes`,
      {
        type: "PAYMENT_FAILED",
        amountXAF: amountXAF.toString(),
      },
      "PAYMENT_FAILED",
    );
  }

  async notifyMemberJoined(
    cooperativeId: string,
    newMemberName: string,
    adminUserId: string,
  ) {
    const memberIds = await this.getCooperativeMembers(cooperativeId);

    await this.dispatch(
      [...new Set([adminUserId, ...memberIds])],
      "Nouveau membre",
      `${newMemberName} a rejoint la cooperative`,
      {
        type: "MEMBER_JOINED",
        cooperativeId,
        newMemberName,
      },
      "MEMBER_JOINED",
    );
  }

  async getPrimaryCoopAdminId(cooperativeId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        cooperativeId,
        role: Role.COOP_ADMIN,
      },
      orderBy: {
        joinedAt: "asc",
      },
      select: {
        userId: true,
      },
    });

    return membership?.userId ?? null;
  }

  private async getDeviceTokensForUsers(userIds: string[]) {
    if (userIds.length === 0) {
      return {
        webTokens: [] as string[],
        expoTokens: [] as string[],
      };
    }

    const tokens = await this.prisma.deviceToken.findMany({
      where: {
        userId: {
          in: [...new Set(userIds)],
        },
      },
      select: {
        token: true,
        platform: true,
      },
    });

    return tokens.reduce(
      (accumulator, deviceToken) => {
        if (deviceToken.platform === DevicePlatform.WEB) {
          accumulator.webTokens.push(deviceToken.token);
        }

        if (
          deviceToken.platform === DevicePlatform.IOS ||
          deviceToken.platform === DevicePlatform.ANDROID
        ) {
          accumulator.expoTokens.push(deviceToken.token);
        }

        return accumulator;
      },
      {
        webTokens: [] as string[],
        expoTokens: [] as string[],
      },
    );
  }

  private async getCooperativeMembers(cooperativeId: string) {
    const memberships = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
      },
      select: {
        userId: true,
      },
    });

    return memberships.map((membership) => membership.userId);
  }

  private async getEligibleVoterIds(cooperativeId: string) {
    const contributors = await this.prisma.contribution.groupBy({
      by: ["userId"],
      where: {
        cooperativeId,
        status: ContributionStatus.CONFIRMED,
      },
    });

    if (contributors.length === 0) {
      return [];
    }

    const memberships = await this.prisma.membership.findMany({
      where: {
        cooperativeId,
        userId: {
          in: contributors.map((contributor) => contributor.userId),
        },
      },
      select: {
        userId: true,
      },
    });

    return memberships.map((membership) => membership.userId);
  }

  private async dispatch(
    userIds: string[],
    title: string,
    body: string,
    data: NotificationData = {},
    soundKey: NotificationSoundKey,
  ) {
    if (userIds.length === 0) {
      return;
    }

    try {
      const { webTokens, expoTokens } =
        await this.getDeviceTokensForUsers(userIds);
      const sound = NOTIFICATION_SOUND_BY_TYPE[soundKey];
      const soundChannel = sound.replace(/\.[^.]+$/, "");
      const payload = {
        ...data,
        sound,
        soundChannel,
      };

      if (webTokens.length > 0) {
        await this.firebaseAdminService.sendToTokens(
          webTokens,
          title,
          body,
          payload,
        );
      }

      if (expoTokens.length > 0) {
        await this.expoPushService.sendExpoNotifications(
          expoTokens,
          title,
          body,
          payload,
        );
      }
    } catch (error) {
      this.logger.warn(
        `Notification dispatch failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }
}
