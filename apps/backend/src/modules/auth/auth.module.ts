import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";

import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GqlJwtAuthGuard } from "../../auth/gql-jwt.guard";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtStrategy } from "./jwt.strategy";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret:
          configService.get<string>("AUTH_SECRET") ||
          configService.get<string>("NEXTAUTH_SECRET") ||
          "REPLACE_WITH_MIN_32_CHAR_SECRET",
        signOptions: { expiresIn: "7d" },
      }),
    }),
    UsersModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, GqlJwtAuthGuard],
  exports: [
    AuthService,
    PassportModule,
    JwtModule,
    JwtAuthGuard,
    GqlJwtAuthGuard,
  ],
})
export class AuthModule {}
