import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class CooperativeScopeGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const cooperativeId =
      request.params?.cooperativeId ??
      request.params?.id ??
      request.body?.cooperativeId ??
      request.body?.id;

    if (!cooperativeId) {
      throw new BadRequestException("cooperativeId is required.");
    }

    const membership = await this.prisma.membership.findUnique({
      where: {
        userId_cooperativeId: {
          userId,
          cooperativeId,
        },
      },
    });

    if (!membership) {
      throw new ForbiddenException(
        "You do not have access to this cooperative.",
      );
    }

    request.membership = membership;
    request.user = {
      ...request.user,
      role: membership.role,
    };

    return true;
  }
}
