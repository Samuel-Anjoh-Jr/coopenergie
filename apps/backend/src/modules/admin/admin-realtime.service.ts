import {
  Injectable,
  MessageEvent,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Observable, Subject, interval, merge, of } from "rxjs";
import { map } from "rxjs/operators";

import { PrismaService } from "../../prisma/prisma.service";

type AdminRealtimeTopic =
  | "admin.metrics.changed"
  | "admin.cooperatives.changed"
  | "admin.users.changed"
  | "admin.audit.changed"
  | "admin.health.changed"
  | "admin.settings.changed";

type AdminRealtimePayload = {
  topic: AdminRealtimeTopic;
  at: string;
};

@Injectable()
export class AdminRealtimeService {
  private readonly updates$ = new Subject<AdminRealtimePayload>();

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  notify(topic: AdminRealtimeTopic) {
    this.updates$.next({
      topic,
      at: new Date().toISOString(),
    });
  }

  async streamForToken(token?: string): Promise<Observable<MessageEvent>> {
    if (!token) {
      throw new UnauthorizedException("Missing admin realtime token.");
    }

    const payload = await this.verifyToken(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, isPlatformAdmin: true },
    });

    if (!user?.isPlatformAdmin) {
      throw new UnauthorizedException(
        "Platform admin role is required for realtime admin stream.",
      );
    }

    return merge(
      of<MessageEvent>({
        type: "admin-update",
        data: { topic: "admin.health.changed", at: new Date().toISOString() },
      }),
      this.updates$.pipe(
        map((update) => ({
          type: "admin-update",
          data: update,
        })),
      ),
      interval(25000).pipe(
        map(() => ({
          type: "admin-keepalive",
          data: { at: new Date().toISOString() },
        })),
      ),
    );
  }

  private async verifyToken(token: string): Promise<{ sub: string }> {
    try {
      const verified = await this.jwtService.verifyAsync<{ sub: string }>(
        token,
      );
      if (!verified?.sub) {
        throw new UnauthorizedException("Invalid realtime token payload.");
      }
      return verified;
    } catch {
      throw new UnauthorizedException("Invalid or expired realtime token.");
    }
  }
}
