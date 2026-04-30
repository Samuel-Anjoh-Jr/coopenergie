import { Injectable } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";

import { AdminRealtimeService } from "./admin-realtime.service";

@Injectable()
export class AdminRealtimeListener {
  constructor(private readonly adminRealtime: AdminRealtimeService) {}

  @OnEvent("admin.cooperative.updated")
  onAdminCooperativeUpdated() {
    this.adminRealtime.notify("admin.cooperatives.changed");
    this.adminRealtime.notify("admin.audit.changed");
    this.adminRealtime.notify("admin.metrics.changed");
    this.adminRealtime.notify("admin.health.changed");
  }

  @OnEvent("admin.user.updated")
  onAdminUserUpdated() {
    this.adminRealtime.notify("admin.users.changed");
    this.adminRealtime.notify("admin.audit.changed");
    this.adminRealtime.notify("admin.metrics.changed");
  }

  @OnEvent("admin.settings.updated")
  onAdminSettingsUpdated() {
    this.adminRealtime.notify("admin.settings.changed");
    this.adminRealtime.notify("admin.audit.changed");
  }

  @OnEvent("contribution.created")
  onContributionCreated() {
    this.adminRealtime.notify("admin.metrics.changed");
  }

  @OnEvent("withdrawal.disbursed")
  onWithdrawalDisbursed() {
    this.adminRealtime.notify("admin.metrics.changed");
  }

  @OnEvent("blockchain.ledger-event")
  onLedgerEvent() {
    this.adminRealtime.notify("admin.metrics.changed");
  }
}
