-- CoopEnergie Supabase RLS draft rollback
-- Reverts apps/backend/prisma/sql/rls/001_enable_rls_and_policies.sql

begin;

-- ---------------------------------------------------------------------------
-- Drop policies
-- ---------------------------------------------------------------------------
-- User
drop policy if exists user_select_self_or_admin on "User";
drop policy if exists user_update_self_or_admin on "User";
drop policy if exists user_insert_admin_only on "User";
drop policy if exists user_delete_admin_only on "User";

-- Cooperative
drop policy if exists cooperative_select_member_or_admin on "Cooperative";
drop policy if exists cooperative_insert_admin_only on "Cooperative";
drop policy if exists cooperative_update_admin_or_coop_admin on "Cooperative";
drop policy if exists cooperative_delete_admin_only on "Cooperative";

-- Membership
drop policy if exists membership_select_scope on "Membership";
drop policy if exists membership_insert_admin_or_coop_admin on "Membership";
drop policy if exists membership_update_admin_or_coop_admin on "Membership";
drop policy if exists membership_delete_admin_or_coop_admin on "Membership";

-- Invitation
drop policy if exists invitation_select_scope on "Invitation";
drop policy if exists invitation_insert_admin_or_coop_admin on "Invitation";
drop policy if exists invitation_update_admin_or_coop_admin on "Invitation";
drop policy if exists invitation_delete_admin_or_coop_admin on "Invitation";

-- Contribution
drop policy if exists contribution_select_scope on "Contribution";
drop policy if exists contribution_insert_self_member on "Contribution";
drop policy if exists contribution_update_admin_only on "Contribution";
drop policy if exists contribution_delete_admin_only on "Contribution";

-- Proposal
drop policy if exists proposal_select_scope on "Proposal";
drop policy if exists proposal_insert_member_creator on "Proposal";
drop policy if exists proposal_update_platform_only on "Proposal";
drop policy if exists proposal_delete_platform_only on "Proposal";

-- Vote
drop policy if exists vote_select_scope on "Vote";
drop policy if exists vote_insert_self_pending_single on "Vote";
drop policy if exists vote_update_platform_only on "Vote";
drop policy if exists vote_delete_platform_only on "Vote";

-- LedgerEvent
drop policy if exists ledgerevent_select_scope on "LedgerEvent";
drop policy if exists ledgerevent_write_admin_only on "LedgerEvent";

-- Payment
drop policy if exists payment_select_scope on "Payment";
drop policy if exists payment_insert_self_member on "Payment";
drop policy if exists payment_update_admin_only on "Payment";
drop policy if exists payment_delete_admin_only on "Payment";

-- WithdrawalRequest
drop policy if exists withdrawal_select_scope on "WithdrawalRequest";
drop policy if exists withdrawal_insert_admin_or_coop_admin on "WithdrawalRequest";
drop policy if exists withdrawal_update_admin_or_coop_admin on "WithdrawalRequest";
drop policy if exists withdrawal_delete_admin_only on "WithdrawalRequest";

-- PlatformSettings
drop policy if exists platformsettings_select_admin_only on "PlatformSettings";
drop policy if exists platformsettings_write_admin_only on "PlatformSettings";

-- CooperativeSettings
drop policy if exists coopsettings_select_scope on "CooperativeSettings";
drop policy if exists coopsettings_insert_admin_or_coop_admin on "CooperativeSettings";
drop policy if exists coopsettings_update_admin_or_coop_admin on "CooperativeSettings";
drop policy if exists coopsettings_delete_admin_or_coop_admin on "CooperativeSettings";

-- Plan
drop policy if exists plan_select_public on "Plan";
drop policy if exists plan_write_admin_only on "Plan";

-- Subscription
drop policy if exists subscription_select_scope on "Subscription";
drop policy if exists subscription_insert_admin_or_coop_admin on "Subscription";
drop policy if exists subscription_update_admin_or_coop_admin on "Subscription";
drop policy if exists subscription_delete_admin_only on "Subscription";

-- AuditLog
drop policy if exists auditlog_select_scope on "AuditLog";
drop policy if exists auditlog_write_admin_only on "AuditLog";

-- DeviceToken
drop policy if exists devicetoken_select_self_or_admin on "DeviceToken";
drop policy if exists devicetoken_insert_self_or_admin on "DeviceToken";
drop policy if exists devicetoken_update_self_or_admin on "DeviceToken";
drop policy if exists devicetoken_delete_self_or_admin on "DeviceToken";

-- Vendor
drop policy if exists vendor_select_public_owner_admin on "Vendor";
drop policy if exists vendor_insert_self_or_admin on "Vendor";
drop policy if exists vendor_update_owner_or_admin on "Vendor";
drop policy if exists vendor_delete_owner_or_admin on "Vendor";

-- VendorProduct
drop policy if exists vendorproduct_select_public_owner_admin on "VendorProduct";
drop policy if exists vendorproduct_insert_owner_or_admin on "VendorProduct";
drop policy if exists vendorproduct_update_owner_or_admin on "VendorProduct";
drop policy if exists vendorproduct_delete_owner_or_admin on "VendorProduct";

-- VendorProductImage
drop policy if exists vendorproductimage_select_public_owner_admin on "VendorProductImage";
drop policy if exists vendorproductimage_insert_owner_or_admin on "VendorProductImage";
drop policy if exists vendorproductimage_update_owner_or_admin on "VendorProductImage";
drop policy if exists vendorproductimage_delete_owner_or_admin on "VendorProductImage";

-- ProposalVendorLink
drop policy if exists proposalvendorlink_select_scope on "ProposalVendorLink";
drop policy if exists proposalvendorlink_insert_admin_or_coop_admin on "ProposalVendorLink";
drop policy if exists proposalvendorlink_update_admin_or_coop_admin on "ProposalVendorLink";
drop policy if exists proposalvendorlink_delete_admin_or_coop_admin on "ProposalVendorLink";

-- VendorReview
drop policy if exists vendorreview_select_public on "VendorReview";
drop policy if exists vendorreview_insert_self_member on "VendorReview";
drop policy if exists vendorreview_update_self_or_admin on "VendorReview";
drop policy if exists vendorreview_delete_self_or_admin on "VendorReview";

-- VendorSubscriptionRecord
drop policy if exists vendorsubscriptionrecord_select_owner_or_admin on "VendorSubscriptionRecord";
drop policy if exists vendorsubscriptionrecord_insert_owner_or_admin on "VendorSubscriptionRecord";
drop policy if exists vendorsubscriptionrecord_update_owner_or_admin on "VendorSubscriptionRecord";
drop policy if exists vendorsubscriptionrecord_delete_owner_or_admin on "VendorSubscriptionRecord";

-- Faq
drop policy if exists faq_select_public on "Faq";
drop policy if exists faq_write_admin_only on "Faq";

-- ---------------------------------------------------------------------------
-- Disable RLS
-- ---------------------------------------------------------------------------
alter table "User" disable row level security;
alter table "Cooperative" disable row level security;
alter table "Membership" disable row level security;
alter table "Invitation" disable row level security;
alter table "Contribution" disable row level security;
alter table "Proposal" disable row level security;
alter table "Vote" disable row level security;
alter table "LedgerEvent" disable row level security;
alter table "Payment" disable row level security;
alter table "WithdrawalRequest" disable row level security;
alter table "PlatformSettings" disable row level security;
alter table "CooperativeSettings" disable row level security;
alter table "Plan" disable row level security;
alter table "Subscription" disable row level security;
alter table "AuditLog" disable row level security;
alter table "DeviceToken" disable row level security;
alter table "Vendor" disable row level security;
alter table "VendorProduct" disable row level security;
alter table "VendorProductImage" disable row level security;
alter table "ProposalVendorLink" disable row level security;
alter table "VendorReview" disable row level security;
alter table "VendorSubscriptionRecord" disable row level security;
alter table "Faq" disable row level security;

-- ---------------------------------------------------------------------------
-- Drop helper functions
-- ---------------------------------------------------------------------------
drop function if exists app.product_vendor_id(text);
drop function if exists app.can_access_proposal(text);
drop function if exists app.proposal_is_pending(text);
drop function if exists app.proposal_coop_id(text);
drop function if exists app.vendor_is_public(text);
drop function if exists app.is_vendor_owner(text);
drop function if exists app.is_coop_admin(text);
drop function if exists app.is_coop_member(text);
drop function if exists app.is_platform_admin();
drop function if exists app.current_role();
drop function if exists app.current_user_id();
drop function if exists app.claim_text(text);
drop function if exists app.jwt_claims();

drop schema if exists app;

commit;
