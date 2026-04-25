import { Module } from "@nestjs/common";

import { AuthModule } from "../modules/auth/auth.module";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { CooperativeScopeGuard } from "./guards/cooperative-scope.guard";
import { CoopAdminGuard } from "./guards/coop-admin.guard";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { RolesGuard } from "./guards/roles.guard";
import { EncryptionService } from "./encryption/encryption.service";

@Module({
  imports: [AuthModule],
  providers: [
    RolesGuard,
    CooperativeScopeGuard,
    CoopAdminGuard,
    PlatformAdminGuard,
    AuditInterceptor,
    EncryptionService,
  ],
  exports: [
    RolesGuard,
    CooperativeScopeGuard,
    CoopAdminGuard,
    PlatformAdminGuard,
    AuditInterceptor,
    EncryptionService,
  ],
})
export class CommonModule {}
