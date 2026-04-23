import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, from } from "rxjs";
import { mergeMap } from "rxjs/operators";

import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method?.toUpperCase?.() ?? "GET";

    if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
      return next.handle();
    }

    const action = `${method} ${request.originalUrl ?? request.url ?? ""}`;
    const entity = this.deriveEntity(request.route?.path ?? request.path ?? "");
    const userId = request.user?.userId ?? null;
    const cooperativeId =
      request.membership?.cooperativeId ??
      request.params?.cooperativeId ??
      request.body?.cooperativeId ??
      null;

    return next.handle().pipe(
      mergeMap((data) =>
        from(
          this.prisma.auditLog.create({
            data: {
              action,
              entity,
              userId,
              cooperativeId,
            },
          }),
        ).pipe(mergeMap(() => [data])),
      ),
    );
  }

  private deriveEntity(pathname: string) {
    const [firstSegment = "unknown"] = pathname
      .split("/")
      .filter((segment) => segment && !segment.startsWith(":"));

    return firstSegment;
  }
}
