import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async getMembers(cooperativeId: string) {
    const cooperative = await this.prisma.cooperative.findUnique({
      where: {
        id: cooperativeId,
      },
      select: {
        id: true,
      },
    });

    if (!cooperative) {
      throw new NotFoundException("Cooperative not found.");
    }

    return this.prisma.membership.findMany({
      where: {
        cooperativeId,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: [
        {
          role: "asc",
        },
        {
          joinedAt: "asc",
        },
      ],
    });
  }

  async removeMember(
    cooperativeId: string,
    targetUserId: string,
    requestingUserId: string,
  ) {
    const requestingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: requestingUserId,
          cooperativeId,
        },
      },
      select: {
        role: true,
      },
    });

    if (requestingMembership?.role !== Role.COOP_ADMIN) {
      throw new ForbiddenException("Cooperative admin access is required.");
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: targetUserId,
          cooperativeId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
          },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException("Membership not found.");
    }

    if (targetMembership.role === Role.COOP_ADMIN) {
      const coopAdminCount = await this.prisma.membership.count({
        where: {
          cooperativeId,
          role: Role.COOP_ADMIN,
        },
      });

      if (coopAdminCount <= 1) {
        throw new ForbiddenException(
          "Cannot remove the last cooperative admin.",
        );
      }
    }

    return this.prisma.membership.delete({
      where: {
        id: targetMembership.id,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
          },
        },
      },
    });
  }

  async changeRole(
    cooperativeId: string,
    targetUserId: string,
    newRole: Role,
    requestingUserId: string,
  ) {
    const requestingMembership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: requestingUserId,
          cooperativeId,
        },
      },
      select: {
        role: true,
      },
    });

    if (!requestingMembership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }

    const targetMembership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId: targetUserId,
          cooperativeId,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
          },
        },
      },
    });

    if (!targetMembership) {
      throw new NotFoundException("Membership not found.");
    }

    if (newRole === Role.PLATFORM_ADMIN) {
      if (requestingMembership.role !== Role.PLATFORM_ADMIN) {
        throw new ForbiddenException(
          "Only platform admins can assign the PLATFORM_ADMIN role.",
        );
      }
    } else if (newRole === Role.COOP_ADMIN) {
      if (
        requestingMembership.role !== Role.COOP_ADMIN &&
        requestingMembership.role !== Role.PLATFORM_ADMIN
      ) {
        throw new ForbiddenException(
          "Only cooperative admins can promote a member to COOP_ADMIN.",
        );
      }
    } else if (
      requestingMembership.role !== Role.COOP_ADMIN &&
      requestingMembership.role !== Role.PLATFORM_ADMIN
    ) {
      throw new ForbiddenException(
        "Only cooperative admins can change member roles.",
      );
    }

    if (
      targetMembership.role === Role.COOP_ADMIN &&
      newRole !== Role.COOP_ADMIN &&
      requestingMembership.role !== Role.PLATFORM_ADMIN
    ) {
      const coopAdminCount = await this.prisma.membership.count({
        where: {
          cooperativeId,
          role: Role.COOP_ADMIN,
        },
      });

      if (coopAdminCount <= 1) {
        throw new ForbiddenException(
          "Cannot demote the last cooperative admin.",
        );
      }
    }

    return this.prisma.membership.update({
      where: {
        id: targetMembership.id,
      },
      data: {
        role: newRole,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            celoAddress: true,
          },
        },
      },
    });
  }
}
