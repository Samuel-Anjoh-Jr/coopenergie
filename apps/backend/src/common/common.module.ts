import { Module } from "@nestjs/common";

import { AuthModule } from "../modules/auth/auth.module";
import { AuditInterceptor } from "./interceptors/audit.interceptor";
import { CooperativeScopeGuard } from "./guards/cooperative-scope.guard";
import { CoopAdminGuard } from "./guards/coop-admin.guard";
import { PlatformAdminGuard } from "./guards/platform-admin.guard";
import { RolesGuard } from "./guards/roles.guard";
import { VendorGuard } from "./guards/vendor.guard";
import { EncryptionService } from "./encryption/encryption.service";
import { S3Service } from "./services/s3.service";

@Module({
  imports: [AuthModule],
  providers: [
    RolesGuard,
    CooperativeScopeGuard,
    CoopAdminGuard,
    PlatformAdminGuard,
    AuditInterceptor,
    VendorGuard,
    EncryptionService,
    S3Service,
  ],
  exports: [
    RolesGuard,
    CooperativeScopeGuard,
    CoopAdminGuard,
    PlatformAdminGuard,
    AuditInterceptor,
    VendorGuard,
    EncryptionService,
    S3Service,
  ],
})
export class CommonModule {}
