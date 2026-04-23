import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { Role } from "@prisma/client";
import { isObservable, lastValueFrom } from "rxjs";

import { JwtAuthGuard } from "../../modules/auth/jwt-auth.guard";
import { CooperativeScopeGuard } from "./cooperative-scope.guard";

@Injectable()
export class CoopAdminGuard implements CanActivate {
  constructor(
    private readonly jwtAuthGuard: JwtAuthGuard,
    private readonly cooperativeScopeGuard: CooperativeScopeGuard,
  ) {}

  async canActivate(context: ExecutionContext) {
    const isAuthenticated = await this.resolveGuardResult(
      this.jwtAuthGuard.canActivate(context),
    );

    if (!isAuthenticated) {
      return false;
    }

    const hasScope = await this.cooperativeScopeGuard.canActivate(context);

    if (!hasScope) {
      return false;
    }

    const request = context.switchToHttp().getRequest();
    const role = request.membership?.role ?? request.user?.role;

    if (role !== Role.COOP_ADMIN) {
      throw new ForbiddenException("Cooperative admin access is required.");
    }

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
