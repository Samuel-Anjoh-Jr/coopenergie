import {
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { isObservable, lastValueFrom } from "rxjs";

import { JwtAuthGuard } from "../../modules/auth/jwt-auth.guard";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class VendorGuard extends JwtAuthGuard {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    const isAuthenticated = await this.resolveGuardResult(super.canActivate(context));

    if (!isAuthenticated) {
      return false;
    }

    const request = context.switchToHttp().getRequest();

    if (request.user?.role === Role.VENDOR && request.user?.vendorId) {
      return true;
    }

    const userId = request.user?.userId;

    if (!userId) {
      throw new UnauthorizedException("Authentication is required.");
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        role: true,
        vendor: {
          select: { id: true },
        },
      },
    });

    if (user?.role !== Role.VENDOR || !user.vendor) {
      throw new ForbiddenException("Vendor access is required.");
    }

    request.user = {
      ...request.user,
      role: Role.VENDOR,
      vendorId: user.vendor.id,
    };

    return true;
  }

  private async resolveGuardResult(
    result: ReturnType<JwtAuthGuard["canActivate"]>,
  ) {
    if (isObservable(result)) {
      return lastValueFrom(result);
    }

    return result;
  }
}