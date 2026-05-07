-- CoopEnergie Supabase RLS draft (forward migration)
-- Generated against apps/backend/prisma/schema.prisma
--
-- IMPORTANT:
-- - This draft expects JWT claims to include at least one of:
--   - app_user_id or user_id or sub
--   - app_role or role
-- - For backend/service operations, use service_role (bypasses RLS) or set claims safely.
-- - Test in staging before production.

begin;

-- ---------------------------------------------------------------------------
-- Helper schema
-- ---------------------------------------------------------------------------
create schema if not exists app;

grant usage on schema app to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Claim helpers
-- ---------------------------------------------------------------------------
create or replace function app.jwt_claims()
returns jsonb
language plpgsql
stable
as $$
declare
  claims_text text;
begin
  claims_text := current_setting('request.jwt.claims', true);
  if claims_text is null or btrim(claims_text) = '' then
    return '{}'::jsonb;
  end if;
  return claims_text::jsonb;
exception
  when others then
    return '{}'::jsonb;
end;
$$;

create or replace function app.claim_text(claim_key text)
returns text
language sql
stable
as $$
  select nullif(app.jwt_claims() ->> claim_key, '');
$$;

create or replace function app.current_user_id()
returns text
language sql
stable
as $$
  select coalesce(
    app.claim_text('app_user_id'),
    app.claim_text('user_id'),
    app.claim_text('sub')
  );
$$;

create or replace function app.current_role()
returns text
language sql
stable
as $$
  select coalesce(
    app.claim_text('app_role'),
    app.claim_text('role')
  );
$$;

create or replace function app.is_platform_admin()
returns boolean
language sql
stable
as $$
  select app.current_role() in ('PLATFORM_ADMIN', 'service_role');
$$;

-- ---------------------------------------------------------------------------
-- Access helpers (SECURITY DEFINER to avoid recursive RLS checks)
-- ---------------------------------------------------------------------------
create or replace function app.is_coop_member(target_coop_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Membership" m
    where m."cooperativeId" = target_coop_id
      and m."userId" = app.current_user_id()
  );
$$;

create or replace function app.is_coop_admin(target_coop_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Membership" m
    where m."cooperativeId" = target_coop_id
      and m."userId" = app.current_user_id()
      and m.role::text = 'COOP_ADMIN'
  );
$$;

create or replace function app.is_vendor_owner(target_vendor_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Vendor" v
    where v.id = target_vendor_id
      and v."userId" = app.current_user_id()
  );
$$;

create or replace function app.vendor_is_public(target_vendor_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Vendor" v
    where v.id = target_vendor_id
      and v.status::text = 'ACTIVE'
  );
$$;

create or replace function app.proposal_coop_id(target_proposal_id text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p."cooperativeId"
  from "Proposal" p
  where p.id = target_proposal_id
  limit 1;
$$;

create or replace function app.can_access_proposal(target_proposal_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select app.is_platform_admin() or app.is_coop_member(app.proposal_coop_id(target_proposal_id));
$$;

create or replace function app.proposal_is_pending(target_proposal_id text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from "Proposal" p
    where p.id = target_proposal_id
      and p.status::text = 'PENDING'
  );
$$;

create or replace function app.product_vendor_id(target_product_id text)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select vp."vendorId"
  from "VendorProduct" vp
  where vp.id = target_product_id
  limit 1;
$$;

grant execute on function app.jwt_claims() to anon, authenticated;
grant execute on function app.claim_text(text) to anon, authenticated;
grant execute on function app.current_user_id() to anon, authenticated;
grant execute on function app.current_role() to anon, authenticated;
grant execute on function app.is_platform_admin() to anon, authenticated;
grant execute on function app.is_coop_member(text) to anon, authenticated;
grant execute on function app.is_coop_admin(text) to anon, authenticated;
grant execute on function app.is_vendor_owner(text) to anon, authenticated;
grant execute on function app.vendor_is_public(text) to anon, authenticated;
grant execute on function app.proposal_coop_id(text) to anon, authenticated;
grant execute on function app.can_access_proposal(text) to anon, authenticated;
grant execute on function app.proposal_is_pending(text) to anon, authenticated;
grant execute on function app.product_vendor_id(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- RLS enablement
-- ---------------------------------------------------------------------------
alter table "User" enable row level security;
alter table "Cooperative" enable row level security;
alter table "Membership" enable row level security;
alter table "Invitation" enable row level security;
alter table "Contribution" enable row level security;
alter table "Proposal" enable row level security;
alter table "Vote" enable row level security;
alter table "LedgerEvent" enable row level security;
alter table "Payment" enable row level security;
alter table "WithdrawalRequest" enable row level security;
alter table "PlatformSettings" enable row level security;
alter table "CooperativeSettings" enable row level security;
alter table "Plan" enable row level security;
alter table "Subscription" enable row level security;
alter table "AuditLog" enable row level security;
alter table "DeviceToken" enable row level security;
alter table "Vendor" enable row level security;
alter table "VendorProduct" enable row level security;
alter table "VendorProductImage" enable row level security;
alter table "ProposalVendorLink" enable row level security;
alter table "VendorReview" enable row level security;
alter table "VendorSubscriptionRecord" enable row level security;
alter table "Faq" enable row level security;

-- ---------------------------------------------------------------------------
-- User
-- ---------------------------------------------------------------------------
create policy user_select_self_or_admin on "User"
for select
using (app.is_platform_admin() or id = app.current_user_id());

create policy user_update_self_or_admin on "User"
for update
using (app.is_platform_admin() or id = app.current_user_id())
with check (app.is_platform_admin() or id = app.current_user_id());

create policy user_insert_admin_only on "User"
for insert
with check (app.is_platform_admin());

create policy user_delete_admin_only on "User"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Cooperative
-- ---------------------------------------------------------------------------
create policy cooperative_select_member_or_admin on "Cooperative"
for select
using (app.is_platform_admin() or app.is_coop_member(id));

create policy cooperative_insert_admin_only on "Cooperative"
for insert
with check (app.is_platform_admin());

create policy cooperative_update_admin_or_coop_admin on "Cooperative"
for update
using (app.is_platform_admin() or app.is_coop_admin(id))
with check (app.is_platform_admin() or app.is_coop_admin(id));

create policy cooperative_delete_admin_only on "Cooperative"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Membership
-- ---------------------------------------------------------------------------
create policy membership_select_scope on "Membership"
for select
using (
  app.is_platform_admin()
  or "userId" = app.current_user_id()
  or app.is_coop_member("cooperativeId")
);

create policy membership_insert_admin_or_coop_admin on "Membership"
for insert
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy membership_update_admin_or_coop_admin on "Membership"
for update
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"))
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy membership_delete_admin_or_coop_admin on "Membership"
for delete
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

-- ---------------------------------------------------------------------------
-- Invitation
-- ---------------------------------------------------------------------------
create policy invitation_select_scope on "Invitation"
for select
using (
  app.is_platform_admin()
  or app.is_coop_admin("cooperativeId")
  or app.is_coop_member("cooperativeId")
);

create policy invitation_insert_admin_or_coop_admin on "Invitation"
for insert
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy invitation_update_admin_or_coop_admin on "Invitation"
for update
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"))
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy invitation_delete_admin_or_coop_admin on "Invitation"
for delete
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

-- ---------------------------------------------------------------------------
-- Contribution
-- ---------------------------------------------------------------------------
create policy contribution_select_scope on "Contribution"
for select
using (
  app.is_platform_admin()
  or "userId" = app.current_user_id()
  or app.is_coop_member("cooperativeId")
);

create policy contribution_insert_self_member on "Contribution"
for insert
with check (
  "userId" = app.current_user_id()
  and app.is_coop_member("cooperativeId")
);

create policy contribution_update_admin_only on "Contribution"
for update
using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy contribution_delete_admin_only on "Contribution"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Proposal
-- ---------------------------------------------------------------------------
create policy proposal_select_scope on "Proposal"
for select
using (app.is_platform_admin() or app.is_coop_member("cooperativeId"));

create policy proposal_insert_member_creator on "Proposal"
for insert
with check (
  "creatorId" = app.current_user_id()
  and app.is_coop_member("cooperativeId")
  and status::text = 'PENDING'
);

create policy proposal_update_platform_only on "Proposal"
for update
using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy proposal_delete_platform_only on "Proposal"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Vote
-- ---------------------------------------------------------------------------
create policy vote_select_scope on "Vote"
for select
using (
  app.is_platform_admin()
  or "userId" = app.current_user_id()
  or app.can_access_proposal("proposalId")
);

create policy vote_insert_self_pending_single on "Vote"
for insert
with check (
  "userId" = app.current_user_id()
  and app.can_access_proposal("proposalId")
  and app.proposal_is_pending("proposalId")
  and not exists (
    select 1
    from "Vote" v
    where v."userId" = app.current_user_id()
      and v."proposalId" = "Vote"."proposalId"
  )
);

create policy vote_update_platform_only on "Vote"
for update
using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy vote_delete_platform_only on "Vote"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- LedgerEvent
-- ---------------------------------------------------------------------------
create policy ledgerevent_select_scope on "LedgerEvent"
for select
using (app.is_platform_admin() or app.is_coop_member("cooperativeId"));

create policy ledgerevent_write_admin_only on "LedgerEvent"
for all
using (app.is_platform_admin())
with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Payment
-- ---------------------------------------------------------------------------
create policy payment_select_scope on "Payment"
for select
using (
  app.is_platform_admin()
  or "userId" = app.current_user_id()
  or app.is_coop_member("cooperativeId")
);

create policy payment_insert_self_member on "Payment"
for insert
with check (
  "userId" = app.current_user_id()
  and app.is_coop_member("cooperativeId")
);

create policy payment_update_admin_only on "Payment"
for update
using (app.is_platform_admin())
with check (app.is_platform_admin());

create policy payment_delete_admin_only on "Payment"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- WithdrawalRequest
-- ---------------------------------------------------------------------------
create policy withdrawal_select_scope on "WithdrawalRequest"
for select
using (app.is_platform_admin() or app.is_coop_member("cooperativeId"));

create policy withdrawal_insert_admin_or_coop_admin on "WithdrawalRequest"
for insert
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy withdrawal_update_admin_or_coop_admin on "WithdrawalRequest"
for update
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"))
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy withdrawal_delete_admin_only on "WithdrawalRequest"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- PlatformSettings
-- ---------------------------------------------------------------------------
create policy platformsettings_select_admin_only on "PlatformSettings"
for select
using (app.is_platform_admin());

create policy platformsettings_write_admin_only on "PlatformSettings"
for all
using (app.is_platform_admin())
with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- CooperativeSettings
-- ---------------------------------------------------------------------------
create policy coopsettings_select_scope on "CooperativeSettings"
for select
using (app.is_platform_admin() or app.is_coop_member("cooperativeId"));

create policy coopsettings_insert_admin_or_coop_admin on "CooperativeSettings"
for insert
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy coopsettings_update_admin_or_coop_admin on "CooperativeSettings"
for update
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"))
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy coopsettings_delete_admin_or_coop_admin on "CooperativeSettings"
for delete
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

-- ---------------------------------------------------------------------------
-- Plan
-- ---------------------------------------------------------------------------
create policy plan_select_public on "Plan"
for select
using (true);

create policy plan_write_admin_only on "Plan"
for all
using (app.is_platform_admin())
with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- Subscription
-- ---------------------------------------------------------------------------
create policy subscription_select_scope on "Subscription"
for select
using (app.is_platform_admin() or app.is_coop_member("cooperativeId"));

create policy subscription_insert_admin_or_coop_admin on "Subscription"
for insert
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy subscription_update_admin_or_coop_admin on "Subscription"
for update
using (app.is_platform_admin() or app.is_coop_admin("cooperativeId"))
with check (app.is_platform_admin() or app.is_coop_admin("cooperativeId"));

create policy subscription_delete_admin_only on "Subscription"
for delete
using (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- AuditLog
-- ---------------------------------------------------------------------------
create policy auditlog_select_scope on "AuditLog"
for select
using (
  app.is_platform_admin()
  or "userId" = app.current_user_id()
  or ("cooperativeId" is not null and app.is_coop_admin("cooperativeId"))
);

create policy auditlog_write_admin_only on "AuditLog"
for all
using (app.is_platform_admin())
with check (app.is_platform_admin());

-- ---------------------------------------------------------------------------
-- DeviceToken
-- ---------------------------------------------------------------------------
create policy devicetoken_select_self_or_admin on "DeviceToken"
for select
using (app.is_platform_admin() or "userId" = app.current_user_id());

create policy devicetoken_insert_self_or_admin on "DeviceToken"
for insert
with check (app.is_platform_admin() or "userId" = app.current_user_id());

create policy devicetoken_update_self_or_admin on "DeviceToken"
for update
using (app.is_platform_admin() or "userId" = app.current_user_id())
with check (app.is_platform_admin() or "userId" = app.current_user_id());

create policy devicetoken_delete_self_or_admin on "DeviceToken"
for delete
using (app.is_platform_admin() or "userId" = app.current_user_id());

-- ---------------------------------------------------------------------------
-- Vendor
-- ---------------------------------------------------------------------------
create policy vendor_select_public_owner_admin on "Vendor"
for select
using (
  status::text = 'ACTIVE'
  or app.is_platform_admin()
  or app.is_vendor_owner(id)
);

create policy vendor_insert_self_or_admin on "Vendor"
for insert
with check (app.is_platform_admin() or "userId" = app.current_user_id());

create policy vendor_update_owner_or_admin on "Vendor"
for update
using (app.is_platform_admin() or app.is_vendor_owner(id))
with check (app.is_platform_admin() or app.is_vendor_owner(id));

create policy vendor_delete_owner_or_admin on "Vendor"
for delete
using (app.is_platform_admin() or app.is_vendor_owner(id));

-- ---------------------------------------------------------------------------
-- VendorProduct
-- ---------------------------------------------------------------------------
create policy vendorproduct_select_public_owner_admin on "VendorProduct"
for select
using (
  app.is_platform_admin()
  or app.is_vendor_owner("vendorId")
  or app.vendor_is_public("vendorId")
);

create policy vendorproduct_insert_owner_or_admin on "VendorProduct"
for insert
with check (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

create policy vendorproduct_update_owner_or_admin on "VendorProduct"
for update
using (app.is_platform_admin() or app.is_vendor_owner("vendorId"))
with check (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

create policy vendorproduct_delete_owner_or_admin on "VendorProduct"
for delete
using (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

-- ---------------------------------------------------------------------------
-- VendorProductImage
-- ---------------------------------------------------------------------------
create policy vendorproductimage_select_public_owner_admin on "VendorProductImage"
for select
using (
  app.is_platform_admin()
  or app.is_vendor_owner(app.product_vendor_id("productId"))
  or app.vendor_is_public(app.product_vendor_id("productId"))
);

create policy vendorproductimage_insert_owner_or_admin on "VendorProductImage"
for insert
with check (
  app.is_platform_admin()
  or app.is_vendor_owner(app.product_vendor_id("productId"))
);

create policy vendorproductimage_update_owner_or_admin on "VendorProductImage"
for update
using (
  app.is_platform_admin()
  or app.is_vendor_owner(app.product_vendor_id("productId"))
)
with check (
  app.is_platform_admin()
  or app.is_vendor_owner(app.product_vendor_id("productId"))
);

create policy vendorproductimage_delete_owner_or_admin on "VendorProductImage"
for delete
using (
  app.is_platform_admin()
  or app.is_vendor_owner(app.product_vendor_id("productId"))
);

-- ---------------------------------------------------------------------------
-- ProposalVendorLink
-- ---------------------------------------------------------------------------
create policy proposalvendorlink_select_scope on "ProposalVendorLink"
for select
using (
  app.is_platform_admin()
  or app.can_access_proposal("proposalId")
  or app.is_vendor_owner("vendorId")
);

create policy proposalvendorlink_insert_admin_or_coop_admin on "ProposalVendorLink"
for insert
with check (
  app.is_platform_admin()
  or app.is_coop_admin(app.proposal_coop_id("proposalId"))
);

create policy proposalvendorlink_update_admin_or_coop_admin on "ProposalVendorLink"
for update
using (
  app.is_platform_admin()
  or app.is_coop_admin(app.proposal_coop_id("proposalId"))
)
with check (
  app.is_platform_admin()
  or app.is_coop_admin(app.proposal_coop_id("proposalId"))
);

create policy proposalvendorlink_delete_admin_or_coop_admin on "ProposalVendorLink"
for delete
using (
  app.is_platform_admin()
  or app.is_coop_admin(app.proposal_coop_id("proposalId"))
);

-- ---------------------------------------------------------------------------
-- VendorReview
-- ---------------------------------------------------------------------------
create policy vendorreview_select_public on "VendorReview"
for select
using (true);

create policy vendorreview_insert_self_member on "VendorReview"
for insert
with check (
  "reviewerId" = app.current_user_id()
  and app.is_coop_member("cooperativeId")
  and app.can_access_proposal("proposalId")
);

create policy vendorreview_update_self_or_admin on "VendorReview"
for update
using (app.is_platform_admin() or "reviewerId" = app.current_user_id())
with check (app.is_platform_admin() or "reviewerId" = app.current_user_id());

create policy vendorreview_delete_self_or_admin on "VendorReview"
for delete
using (app.is_platform_admin() or "reviewerId" = app.current_user_id());

-- ---------------------------------------------------------------------------
-- VendorSubscriptionRecord
-- ---------------------------------------------------------------------------
create policy vendorsubscriptionrecord_select_owner_or_admin on "VendorSubscriptionRecord"
for select
using (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

create policy vendorsubscriptionrecord_insert_owner_or_admin on "VendorSubscriptionRecord"
for insert
with check (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

create policy vendorsubscriptionrecord_update_owner_or_admin on "VendorSubscriptionRecord"
for update
using (app.is_platform_admin() or app.is_vendor_owner("vendorId"))
with check (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

create policy vendorsubscriptionrecord_delete_owner_or_admin on "VendorSubscriptionRecord"
for delete
using (app.is_platform_admin() or app.is_vendor_owner("vendorId"));

-- ---------------------------------------------------------------------------
-- Faq
-- ---------------------------------------------------------------------------
create policy faq_select_public on "Faq"
for select
using (true);

create policy faq_write_admin_only on "Faq"
for all
using (app.is_platform_admin())
with check (app.is_platform_admin());

commit;
