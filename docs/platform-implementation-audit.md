# CoopEnergie Platform Implementation Audit

## Scope

This audit compares the current codebase against these extracted documents:

- `docs/_extracted/arch-en.txt`
- `docs/_extracted/CoopEnergie-Implementation-Guide.txt`
- `docs/_extracted/CoopEnergie-Implementation-Addendum-EN.txt`
- `docs/_extracted/CoopEnergie-Supplement3-Notifications-EN.txt`
- `docs/_extracted/srs-en.txt`

It focuses on three questions:

1. Which documented platform tasks are implemented?
2. Where are they implemented in backend, web, and mobile?
3. Which gaps or mismatches remain?

## Validation Baseline

Verified during this audit:

- `bun run typecheck` -> pass
- `bun run lint` -> pass
- `bun run build:web` -> pass
- `bun run build:api` -> pass
- `bun run --cwd contracts test` -> pass
- `bun run --cwd contracts compile` -> pass
- `cd apps/mobile && bunx tsc --noEmit -p tsconfig.json` -> pass

Validation note:

- Running `bunx tsc --noEmit -p apps/mobile/tsconfig.json` from the workspace root can resolve an older TypeScript binary from another workspace package and report false `moduleResolution` errors. The mobile package-local TypeScript check passes.

## Executive Summary

The platform is substantially aligned with the architecture, implementation guide, addendum, supplement, and SRS at the feature level.

Implemented and verified:

- Monorepo structure, Bun workspaces, Docker, contracts, backend, web, and mobile apps
- REST writes plus GraphQL reads/subscriptions
- Authentication, user wallet setup, cooperative membership, contributions, proposals, voting, withdrawals, ledger, reports, notifications, and mobile offline-first behavior
- Celo integration with relayer, vault interactions, tx hash persistence, and CeloScan links
- CamPay payment initiation and webhook confirmation with signature validation and idempotency
- Web and mobile dashboards with FR/EN translation support
- CI validation and deployment workflow files

Verified remaining issues:

- SRS requirement `FR-01-5` says evaluator credentials should be displayed on the login page, but the current login screen does not render any evaluator/demo credentials.
- Invitation backend flows exist, and mobile can accept invitation links, but there is no visible web admin invitation management UI for sending email invites or generating shareable links.
- The mobile proposals screen only supports generic proposal creation and voting; it does not expose the detailed withdrawal proposal flow implemented in backend and web.
- Some architecture document technology versions have drifted from the codebase: for example Next.js, Apollo Server, and Prisma versions differ from the architecture document.

## Requirement Mapping

### 1. Monorepo Foundation and Infrastructure

Status: Implemented

Docs covered:

- Implementation Guide phases 0 and 11
- Architecture sections 2, 3, and 6

Backend / Infra implementation:

- Root workspace and scripts: `package.json`
- Docker services: `docker-compose.yml`, `infra/docker/docker-compose.yml`
- Environment sync: `scripts/sync-env.mjs`
- CI workflows: `.github/workflows/pr-validation.yml`, `.github/workflows/deploy-staging.yml`, `.github/workflows/deploy-production.yml`, `.github/workflows/manual-seed.yml`

Web/mobile display and interactability:

- Not directly user-facing
- Enables web, backend, contracts, and deployment pipelines defined in docs

Notes:

- During this audit, the backend build script was aligned to the verified TypeScript emit path in `apps/backend/package.json` so `bun run build:api` now passes consistently.

### 2. Authentication and User Onboarding

Status: Implemented, with one SRS gap

Docs covered:

- SRS `FR-01`
- Implementation Guide phase 1 and phase 9
- Addendum wallet setup and user profile requirements

Backend implementation:

- Auth service/controller and JWT flow: `apps/backend/src/modules/auth/*`
- User profile storage and withdrawal preferences: `apps/backend/src/modules/users/users.service.ts`
- Wallet generation/encrypted key handling: `apps/backend/src/blockchain/wallet.service.ts`, `apps/backend/src/common/encryption/encryption.service.ts`

Web implementation:

- Login page: `apps/web/app/login/page.tsx`
- Auth bridge: `apps/web/lib/auth.ts`
- Profile page with withdrawal method, phone, and bank fields: `apps/web/app/[locale]/dashboard/profile/page.tsx`

Mobile implementation:

- Login: `apps/mobile/app/(auth)/login.tsx`
- Register: `apps/mobile/app/(auth)/register.tsx`
- Invitation-aware join/register flow: `apps/mobile/app/(auth)/join.tsx`

Display and interactability:

- Web login accepts credentials and redirects authenticated users to dashboard
- Web profile lets users update name and preferred withdrawal destination details
- Mobile supports login, registration, and invitation-token handling

Gap:

- `FR-01-5` requires evaluator credentials on the login page. The translation dictionary includes demo-account copy, but `apps/web/app/login/page.tsx` does not render those credentials.

### 3. Cooperative Dashboard and Trust Surface

Status: Implemented

Docs covered:

- SRS `FR-02`
- MVP dashboard requirements in phases 2 and 3
- Architecture trust and transparency principles

Backend implementation:

- Cooperative queries and metrics: `apps/backend/src/modules/cooperatives/*`
- GraphQL cooperative detail and report resolvers: `apps/backend/src/graphql/resolvers/cooperative.resolver.ts`, `apps/backend/src/graphql/resolvers/report.resolver.ts`

Web implementation:

- Dashboard overview: `apps/web/app/[locale]/dashboard/page.tsx`
- Dashboard shell and navigation: `apps/web/app/[locale]/dashboard/layout.tsx`
- Cooperative and report queries: `apps/web/lib/graphql/queries/cooperative.ts`

Mobile implementation:

- Dashboard: `apps/mobile/app/(dashboard)/dashboard.tsx`
- Shared active cooperative state: `apps/mobile/lib/dashboard.ts`

Display and interactability:

- Web dashboard shows cooperative name, balance progress, member count, active proposals, recent activity, wallet QR code, and CeloScan link
- Web dashboard subscribes to contribution, vote, and proposal events for live refresh
- Mobile dashboard shows cooperative summary, wallet details, offline banners, recent activity, and explorer links

Audit note:

- The web dashboard sidebar previously hardcoded a demo cooperative name. This was corrected during the audit to use live cooperative data in `apps/web/app/[locale]/dashboard/layout.tsx`.

### 4. Contributions and Mobile Money Payments

Status: Implemented

Docs covered:

- SRS `FR-03`
- Architecture write REST / read GraphQL strategy
- Addendum fund flow section
- Implementation Guide phase 7

Backend implementation:

- Contribution creation and blockchain-mode branching: `apps/backend/src/modules/contributions/contributions.service.ts`
- Payment initiation and webhook processing: `apps/backend/src/modules/payments/payments.service.ts`, `apps/backend/src/modules/payments/payments.controller.ts`
- CamPay integration: `apps/backend/src/modules/payments/campay.service.ts`

Web implementation:

- Contributions page: `apps/web/app/[locale]/dashboard/contributions/page.tsx`
- REST client for write actions: `apps/web/lib/rest-client.ts`

Mobile implementation:

- Contributions screen with offline queue: `apps/mobile/app/(dashboard)/contributions.tsx`
- Offline queue/sync helpers: `apps/mobile/lib/offline/action-queue.ts`, `apps/mobile/lib/sync/sync-engine.ts`

Display and interactability:

- Web lets authenticated members submit a contribution and see resulting tx hashes
- Mobile lets users queue contributions offline and sync them later
- Contribution status is reflected in dashboard, ledger, and notifications

Audit notes:

- Payment initiation idempotency is implemented via client-provided key uniqueness and duplicate-safe replay in `apps/backend/src/modules/payments/payments.service.ts`
- Webhook signature validation is implemented through `campayService.verifyWebhookSignature(...)`

### 5. Proposals, Voting, and Withdrawal Governance

Status: Implemented on backend and web, partial on mobile

Docs covered:

- SRS voting and governance requirements
- Addendum withdrawal governance and destination rules
- Implementation Guide phases 4, 6, and addendum replacement tasks

Backend implementation:

- Proposal creation: `apps/backend/src/modules/proposals/*`
- Voting: `apps/backend/src/modules/votes/*`
- Withdrawal proposal flow, eligibility, and threshold evaluation: `apps/backend/src/modules/withdrawals/withdrawals.service.ts`
- Platform/cooperative withdrawal settings: `apps/backend/src/modules/platform-settings/platform-settings.service.ts`

Web implementation:

- Proposal and withdrawal UI: `apps/web/app/[locale]/dashboard/proposals/page.tsx`
- Settings UI for cooperative and platform governance settings: `apps/web/app/[locale]/dashboard/settings/page.tsx`
- Withdrawal GraphQL queries: `apps/web/lib/graphql/queries/withdrawal.ts`

Mobile implementation:

- Generic proposals/voting screen: `apps/mobile/app/(dashboard)/proposals.tsx`

Display and interactability:

- Web supports generic proposals and withdrawal proposals with destination type, phone or bank fields, eligibility messaging, threshold display, vote progress, and tx hash explorer links
- Web settings page exposes cooperative-admin and platform-admin threshold controls and maintenance mode
- Mobile supports proposal list, yes/no voting, offline vote queueing, and generic proposal creation

Gap:

- The mobile proposals screen does not currently expose the detailed withdrawal proposal form or withdrawal-specific governance UI that exists on backend and web.

### 6. Invitations and Cooperative Membership

Status: Backend complete, frontend partial

Docs covered:

- Implementation Guide phase 5
- SRS invitation system requirement in production scope

Backend implementation:

- Invitation endpoints and service: `apps/backend/src/modules/invitations/invitations.controller.ts`, `apps/backend/src/modules/invitations/invitations.service.ts`
- Membership application after acceptance: invitation service plus memberships module

Web implementation:

- No dedicated invitation management page found in current web routes

Mobile implementation:

- Invitation token acceptance flow: `apps/mobile/app/(auth)/join.tsx`

Display and interactability:

- Backend supports sending email invites, generating shareable links, lookup by token, acceptance, revocation, and listing pending invitations
- Mobile can accept an invitation token and route authenticated or unauthenticated users into the join flow

Gap:

- No visible web admin UI was found for sending invites, generating shareable links, or reviewing pending invitations, despite the backend capability being implemented.

### 7. GraphQL Read Layer and Realtime Updates

Status: Implemented

Docs covered:

- Architecture REST writes + GraphQL reads principle
- Implementation Guide phase 6
- SRS real-time update scope

Backend implementation:

- Global GraphQL pubsub module and resolvers: `apps/backend/src/graphql/pubsub.module.ts`, `apps/backend/src/graphql/resolvers/*`

Web implementation:

- Apollo client and subscriptions: `apps/web/lib/graphql/*`
- Live dashboard/proposal refresh on subscription events: `apps/web/app/[locale]/dashboard/page.tsx`, `apps/web/app/[locale]/dashboard/proposals/page.tsx`

Mobile implementation:

- Apollo client setup: `apps/mobile/lib/apollo.ts`
- Query-based dashboard/proposal/report screens

Display and interactability:

- Web surfaces live contribution/proposal/vote updates
- Mobile consumes the same read model, with offline cache fallback

Note:

- Current pubsub implementation is in-memory `graphql-subscriptions` PubSub. This is adequate for current single-instance behavior, but it is not the horizontally scaled production adapter described in broader production expectations.

### 8. Ledger, Reports, and Blockchain Proof UX

Status: Implemented

Docs covered:

- SRS phase 3 report and CSV requirements
- Supplement 3 proof and ledger explanation
- Architecture transparency and auditability requirements

Backend implementation:

- Ledger module: `apps/backend/src/modules/ledger/*`
- Reports module and CSV export: `apps/backend/src/modules/reports/reports.service.ts`, `apps/backend/src/modules/reports/reports.controller.ts`
- Blockchain event ingestion: `apps/backend/src/blockchain/event-listener.service.ts`

Web implementation:

- Ledger page: `apps/web/app/[locale]/dashboard/ledger/page.tsx`
- Report page and CSV download: `apps/web/app/[locale]/dashboard/report/page.tsx`

Mobile implementation:

- Ledger page with local cache fallback: `apps/mobile/app/(dashboard)/ledger.tsx`
- Report page with CSV sharing: `apps/mobile/app/(dashboard)/report.tsx`

Display and interactability:

- Both web and mobile display tx hashes and CeloScan links
- Web report page downloads CSV through the backend export endpoint
- Mobile report page fetches CSV and shares its content through native share APIs
- Ledger and report UIs reflect proposal status counts and cooperative funding progress

### 9. Notifications

Status: Implemented

Docs covered:

- Supplement 3 notification tasks
- SRS production push notification scope

Backend implementation:

- Notification orchestration: `apps/backend/src/notifications/notifications.service.ts`
- Firebase admin delivery: `apps/backend/src/notifications/firebase-admin.service.ts`
- Expo push delivery: `apps/backend/src/notifications/expo-push.service.ts`
- Device token persistence via users service: `apps/backend/src/modules/users/users.service.ts`

Web implementation:

- Notification hook and service worker registration: `apps/web/lib/firebase/use-notifications.ts`
- Enable-notifications banner in dashboard shell: `apps/web/app/[locale]/dashboard/layout.tsx`
- Logout token cleanup: `apps/web/components/navbar.tsx`

Mobile implementation:

- Push registration and deep-link routing: `apps/mobile/lib/notifications/use-push-notifications.ts`
- Hook mounted in dashboard tab layout: `apps/mobile/app/(dashboard)/_layout.tsx`

Display and interactability:

- Web prompts users to enable notifications and unregisters tokens on logout only
- Mobile registers device tokens and routes contribution/proposal/withdrawal notifications to the relevant screens

### 10. Offline-First Mobile Behavior

Status: Implemented

Docs covered:

- Architecture mobile offline-first principle
- Implementation Guide phase 10
- SRS production mobile requirement

Backend implementation:

- Not backend-led; backend exposes REST write endpoints and GraphQL read endpoints consumed by sync

Mobile implementation:

- SQLite persistence: `apps/mobile/lib/offline/db.ts`
- Network monitor: `apps/mobile/lib/offline/network-monitor.ts`
- Offline action queue: `apps/mobile/lib/offline/action-queue.ts`
- Sync engine: `apps/mobile/lib/sync/sync-engine.ts`
- Screens with offline banners and cache fallback: `apps/mobile/app/(dashboard)/dashboard.tsx`, `contributions.tsx`, `proposals.tsx`, `ledger.tsx`, `report.tsx`

Display and interactability:

- Users see offline banners
- Contributions and votes can be queued while offline
- Cached data is shown for dashboard, proposals, ledger, and report screens
- Sync resumes when connectivity returns

### 11. Blockchain Relayer, Custody Logic, and Proof Model

Status: Implemented

Docs covered:

- Architecture blockchain stack section
- Addendum blockchain mode and custody model
- Supplement 3 proof mechanism

Backend implementation:

- Relayer and forward request digest: `apps/backend/src/blockchain/relayer.service.ts`, `apps/backend/src/blockchain/signature-helper.ts`
- Contract access services: `apps/backend/src/blockchain/vault.service.ts`, `apps/backend/src/blockchain/factory.service.ts`
- Blockchain mode switch in contribution/withdrawal flows: `apps/backend/src/modules/contributions/contributions.service.ts`, withdrawal services and related modules

Web implementation:

- CeloScan links, wallet display, and tx proof surfaces on dashboard, contributions, proposals, ledger, and report pages

Mobile implementation:

- Explorer links and tx hash display on dashboard, contributions, proposals, and ledger screens

Display and interactability:

- Users do not manage gas directly
- TX hashes are stored and displayed as proof links
- Demo / blockchain-disabled path uses deterministic placeholder hashes when configured that way

## Verified Gaps and Mismatches

### Product Gaps

1. Login page does not show evaluator/demo credentials required by SRS `FR-01-5`.
2. Invitation backend is complete, but a web invitation management surface was not found.
3. Mobile does not expose the detailed withdrawal proposal flow implemented on backend and web.

### Documentation Drift

These are not necessarily runtime bugs, but the documents no longer exactly match the repo:

1. `docs/_extracted/arch-en.txt` describes Next.js 15, while `apps/web/package.json` uses Next.js 16.2.0.
2. The architecture document describes Prisma 6.x, while `apps/backend/package.json` uses Prisma 5.22.0.
3. The architecture document describes Apollo Server 4.x, while `apps/backend/package.json` uses `@apollo/server` 5.5.0.
4. The architecture document names `next-intl` as the i18n library, while the current implementation uses repo-local translation helpers in web and mobile.

## Recommended Follow-Up Tasks

Priority 1:

- Add evaluator/demo credentials to the login page or update the SRS if that requirement is intentionally no longer applicable.
- Add a web invitation management page for cooperative admins, backed by the existing invitation endpoints.
- Add mobile withdrawal proposal creation and withdrawal-specific voting/eligibility UI.

Priority 2:

- Update architecture and implementation documents to reflect the actual framework/library versions and the current translation approach.
- Add an explicit mobile package typecheck command to root scripts or CI to avoid root-level TypeScript resolution ambiguity.

## Conclusion

The platform is feature-complete across the core cooperative flows described in the docs: authentication, cooperative dashboard, contributions, voting, withdrawals, ledger, reports, notifications, blockchain proof, and offline-first mobile behavior are all present and wired through backend, web, and mobile layers.

The remaining issues are concentrated in three areas: one explicit SRS requirement not rendered on the login page, one missing admin-facing invitation UI surface, and one missing mobile withdrawal UX surface. The rest of the variance is documentation drift rather than functional platform failure.
