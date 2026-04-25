import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Role } from "@prisma/client";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    if (request.user?.role === Role.PLATFORM_ADMIN) {
      return true;
    }

    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        role: Role.PLATFORM_ADMIN,
      },
      select: {
        role: true,
      },
    });

    if (!membership) {
      throw new ForbiddenException("Platform admin access is required.");
    }

    request.user = {
      ...request.user,
      role: Role.PLATFORM_ADMIN,
    };

    return true;
  }
}
