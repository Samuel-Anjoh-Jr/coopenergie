# CoopEnergie

CoopEnergie is a monorepo for a cooperative energy financing platform focused on Cameroon. It includes a public web experience, member and vendor dashboards, a mobile app, a NestJS backend, Prisma/PostgreSQL data access, and smart contracts for cooperative fund workflows.

## Hackathon Context (MIABE 2026)

This project is developed for **MIABE Hackathon 2026** (D10: Renewable Energy & Microgrids), under the challenge:

- **Project code**: CM-02
- **Project name**: CoopEnergie
- **Main SDGs**: SDG 7 (Clean Energy), SDG 1 (No Poverty), SDG 11 (Sustainable Cities)

The challenge focuses on a practical problem in Cameroon: many households cannot individually afford a solar kit, but can do so through cooperative savings and group purchase. CoopEnergie uses blockchain-backed transparency to reduce conflicts in collective fund management by making contributions, voting decisions, and financial traces auditable.

### Problem Statement

Groups want to buy solar equipment collectively, but lack trusted tools to manage shared funds transparently. Without accountability on who contributed, current balance, and purchase decisions, cooperatives often fail before reaching their goal.

### What the Solution Delivers

- Cooperative creation for group solar purchasing
- Transparent and immutable contribution tracking
- On-chain governance-style voting for purchase decisions
- Automatic reporting on collected funds, decisions, and purchase planning

### Intended End Users

- Citizen groups in Cameroon buying solar equipment collectively
- Neighborhood associations and women-led community groups in peri-urban/rural areas
- Solar equipment suppliers offering group deals
- NGOs and rural electrification programs supporting cooperatives

### Expected Impact

By improving trust in collective financing, CoopEnergie enables communities to acquire solar systems that individual members could not afford alone, accelerating local electrification without waiting for grid extension.

> Reference source: MIABE Hackathon 2026 reference framework shared by Darollo Technologies Corporation (DTC).

## Repository Layout

- `apps/backend` — NestJS API, GraphQL, Prisma, payments, notifications, vendor services
- `apps/web` — Next.js web app for marketing, member dashboards, vendor dashboards, and admin tools
- `apps/mobile` — Expo / React Native mobile application
- `contracts` — Hardhat smart contracts and deployment scripts
- `packages` — shared package workspace modules
- `infra` — Docker and infrastructure helpers
- `docs` — implementation and platform documentation
- `.github/workflows` — CI/CD, deployment, seed, and RLS workflows

## Core Stack

- Runtime and package manager: Bun
- Web: Next.js 16, React 19, Apollo Client, NextAuth
- Mobile: Expo 54, React Native 0.81, Expo Router
- Backend: NestJS 11, GraphQL, Prisma 5, PostgreSQL
- Storage and notifications: AWS S3, Firebase, Expo notifications
- Smart contracts: Hardhat, Ethers, Viem

## Prerequisites

- Bun `1.3.x`
- Node.js compatible with the workspace toolchain
- Docker Desktop for local Postgres and Redis
- PostgreSQL access for Prisma migrations
- Expo / EAS account for mobile builds when needed

## Getting Started

### 1. Install dependencies

```bash
bun install
```

### 2. Sync environment files

```bash
bun run env:sync
```

### 3. Start local database services

```bash
bun run db:up
```

### 4. Apply Prisma migrations and generate client

```bash
bun run db:migrate:deploy
bun run db:generate
```

### 5. Seed local data

```bash
bun run db:seed
```

### 6. Run the apps

```bash
bun run dev:web
bun run dev:api
bun run dev:mobile
```

Or run the orchestrated development command:

```bash
bun run dev
```

## Useful Commands

### Root workspace

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run clean
```

### Database

```bash
bun run db:up
bun run db:down
bun run db:generate
bun run db:migrate
bun run db:migrate:deploy
bun run db:migrate:reset
bun run db:seed
bun run db:studio
```

### App-specific

```bash
bun run --cwd apps/backend dev
bun run --cwd apps/backend build
bun run --cwd apps/backend lint

bun run --cwd apps/web dev
bun run --cwd apps/web build
bun run --cwd apps/web lint

bun run --cwd apps/mobile start
bun run --cwd apps/mobile android
bun run --cwd apps/mobile ios
```

### Mobile release helpers

```bash
bun run mobile:apk
bun run mobile:aab
bun run mobile:ios
bun run mobile:build:all
bun run mobile:submit
```

## Seeded Demo Accounts

The backend seed script creates realistic demo users for platform admin, cooperative admins, members, and vendors.

Seed command:

```bash
bun run db:seed
```

The full list of seeded credentials is printed by the seed script at the end of execution in `apps/backend/src/prisma/seed.ts`.

## GitHub Workflows

This repository includes manual and automated workflows under `.github/workflows`.

Notable workflows:

- `pr-validation.yml` — validation for pull requests
- `deploy-staging.yml` — staging deployment flow
- `deploy-production.yml` — production deployment flow
- `mobile-expo-cicd.yml` — Expo mobile CI/CD
- `manual-seed.yml` — manually seed a remote database
- `manual-rls-migration.yml` — manually apply or roll back Supabase RLS SQL
- `prisma-migrate.yml` — Prisma migration workflow

## Manual Production Database Operations

### Manual seed

Use `.github/workflows/manual-seed.yml` to run the production seed manually with `workflow_dispatch`.

Required secret:

- `DIRECT_DATABASE_URL` or `DIRECT_URL`

### Manual Supabase RLS migration

Use `.github/workflows/manual-rls-migration.yml` to manually apply or roll back the RLS SQL against Supabase.

SQL files:

- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.sql`
- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.rollback.sql`

The workflow includes a precheck step that logs:

- selected action
- SQL file and SHA256 digest
- current database and user
- existing policy counts
- current RLS flags per target table

Required secret:

- `DIRECT_DATABASE_URL` or `DIRECT_URL`

## Notes for Contributors

- Use Bun commands from the repo root unless there is a specific app-level reason not to.
- Prefer focused changes. The web, backend, mobile, and contracts live in the same workspace but are deployed differently.
- Prisma schema lives at `apps/backend/prisma/schema.prisma`.
- Smart contract docs live in `contracts/README.md` and deployment helpers under `contracts/scripts`.

## Current Areas of Concern

- Some web lint warnings already exist around React hook dependency arrays; they do not currently block the root lint command.
- Production database workflows are intentionally manual and confirmation-gated.

## License

This project is licensed under the MIT License. See the `LICENSE` file.
