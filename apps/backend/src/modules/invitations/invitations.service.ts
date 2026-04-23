import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InvitationStatus, InvitationType, Role } from "@prisma/client";

import { MailService } from "../../mail/mail.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class InvitationsService {
  private readonly logger = new Logger(InvitationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async sendEmailInvite(
    adminUserId: string,
    cooperativeId: string,
    email: string,
    locale = "fr",
  ) {
    const cooperative = await this.getAdminCooperative(adminUserId, cooperativeId);
    const normalizedLocale = this.normalizeLocale(locale);
    const normalizedEmail = email.trim().toLowerCase();

    const invitation = await this.prisma.invitation.create({
      data: {
        cooperativeId,
        email: normalizedEmail,
        type: InvitationType.EMAIL,
        status: InvitationStatus.PENDING,
        expiresAt: this.buildExpiryDate(),
      },
    });

    const joinUrl = this.buildJoinUrl(normalizedLocale, invitation.token);
    const mailResult = await this.mailService.sendInvitationEmail(
      normalizedEmail,
      cooperative.name,
      joinUrl,
      normalizedLocale,
    );

    if (mailResult?.messageId) {
      this.logger.log(
        `Invitation email ${invitation.id} sent to ${normalizedEmail} (${mailResult.messageId}).`,
      );
    } else {
      this.logger.warn(
        `Invitation email ${invitation.id} could not be delivered to ${normalizedEmail}.`,
      );
    }

    return {
      invitation,
      joinUrl,
      emailSent: !!mailResult?.messageId,
    };
  }

  async createShareableLink(
    adminUserId: string,
    cooperativeId: string,
    locale = "fr",
  ) {
    await this.getAdminCooperative(adminUserId, cooperativeId);

    const invitation = await this.prisma.invitation.create({
      data: {
        cooperativeId,
        type: InvitationType.LINK,
        status: InvitationStatus.PENDING,
        expiresAt: this.buildExpiryDate(),
      },
    });

    const normalizedLocale = this.normalizeLocale(locale);
    const joinUrl = this.buildJoinUrl(normalizedLocale, invitation.token);

    return {
      token: invitation.token,
      joinUrl,
    };
  }

  async findByToken(token: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        token,
      },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    const expired = invitation.expiresAt <= new Date();
    const active = invitation.status === InvitationStatus.PENDING && !expired;

    return {
      id: invitation.id,
      token: invitation.token,
      type: invitation.type,
      status: invitation.status,
      email: invitation.email,
      expiresAt: invitation.expiresAt,
      expired,
      active,
      cooperative: invitation.cooperative,
    };
  }

  async acceptInvitation(token: string, userId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        token,
      },
      include: {
        cooperative: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Invitation is no longer active.");
    }

    if (invitation.expiresAt <= new Date()) {
      throw new BadRequestException("Invitation has expired.");
    }

    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      throw new NotFoundException("User not found.");
    }

    if (
      invitation.type === InvitationType.EMAIL &&
      invitation.email &&
      invitation.email.toLowerCase() !== user.email.toLowerCase()
    ) {
      throw new ForbiddenException(
        "This invitation was issued for a different email address.",
      );
    }

    const existingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId: invitation.cooperativeId,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingMembership) {
      throw new ConflictException("You are already a member of this cooperative.");
    }

    const membership = await this.prisma.$transaction(async (tx) => {
      const nextMembership = await tx.membership.create({
        data: {
          userId,
          cooperativeId: invitation.cooperativeId,
          role: Role.MEMBER,
        },
      });

      await tx.invitation.update({
        where: {
          id: invitation.id,
        },
        data: {
          status: InvitationStatus.ACCEPTED,
        },
      });

      return nextMembership;
    });

    const coopAdminId = await this.notificationsService.getPrimaryCoopAdminId(
      invitation.cooperativeId,
    );

    if (coopAdminId) {
      await this.notificationsService.notifyMemberJoined(
        invitation.cooperativeId,
        user.name,
        coopAdminId,
      );
    }

    return {
      cooperative: invitation.cooperative,
      membership,
    };
  }

  async revokeInvitation(adminUserId: string, invitationId: string) {
    const invitation = await this.prisma.invitation.findUnique({
      where: {
        id: invitationId,
      },
      select: {
        id: true,
        cooperativeId: true,
        status: true,
      },
    });

    if (!invitation) {
      throw new NotFoundException("Invitation not found.");
    }

    await this.getAdminCooperative(adminUserId, invitation.cooperativeId);

    if (invitation.status !== InvitationStatus.PENDING) {
      throw new BadRequestException("Only pending invitations can be revoked.");
    }

    return this.prisma.invitation.update({
      where: {
        id: invitationId,
      },
      data: {
        status: InvitationStatus.REVOKED,
      },
    });
  }

  async getPendingInvitations(cooperativeId: string) {
    return this.prisma.invitation.findMany({
      where: {
        cooperativeId,
        status: InvitationStatus.PENDING,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
  }

  private async getAdminCooperative(adminUserId: string, cooperativeId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: adminUserId,
          cooperativeId,
        },
      },
      select: {
        role: true,
      },
    });

    if (membership?.role !== Role.COOP_ADMIN) {
      throw new ForbiddenException("Cooperative admin access is required.");
    }

    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    return cooperative;
  }

  private buildJoinUrl(locale: string, token: string) {
    const baseUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(
      /\/+$/,
      "",
    );

    return `${baseUrl}/${locale}/join/${token}`;
  }

  private buildExpiryDate() {
    return new Date(Date.now() + 72 * 60 * 60 * 1000);
  }

  private normalizeLocale(locale: string) {
    return locale.toLowerCase().startsWith("en") ? "en" : "fr";
  }
}
