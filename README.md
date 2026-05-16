# CoopEnergie

CoopEnergie est un monorepo pour une plateforme de financement d'énergie coopérative centrée sur le Cameroun. Il comprend une expérience web publique, des tableaux de bord pour membres et fournisseurs, une application mobile, un backend NestJS, l'accès aux données avec Prisma/PostgreSQL, et des contrats intelligents pour les flux de fonds coopératifs.

## Contexte du Hackathon (MIABE 2026)

Ce projet est développé pour le **MIABE Hackathon 2026** (D10 : Énergies renouvelables & Microgrids), dans le cadre du défi :

- **Code projet** : CM-02
- **Nom du projet** : CoopEnergie
- **Principaux ODD** : ODD 7 (Énergie propre), ODD 1 (Pas de pauvreté), ODD 11 (Villes durables)

Le défi se concentre sur un problème pratique au Cameroun : de nombreux ménages ne peuvent pas acheter individuellement un kit solaire, mais peuvent le faire grâce à l'épargne coopérative et à l'achat groupé. CoopEnergie utilise la transparence basée sur la blockchain pour réduire les conflits dans la gestion collective des fonds en rendant les cotisations, les décisions de vote et les traces financières auditable.

### Énoncé du problème

Les groupes souhaitent acheter du matériel solaire collectivement, mais manquent d'outils de confiance pour gérer les fonds communs de manière transparente. Sans traçabilité sur qui a cotisé, le solde actuel et les décisions d'achat, les coopératives échouent souvent avant d'atteindre leur objectif.

### Ce que la solution apporte

- Création de coopératives pour l'achat groupé de panneaux solaires
- Suivi transparent et immuable des cotisations
- Vote de type gouvernance on-chain pour les décisions d'achat
- Rapports automatiques sur les fonds collectés, les décisions et la planification des achats

### Utilisateurs finaux visés

- Groupes de citoyens au Cameroun achetant du matériel solaire collectivement
- Associations de quartier et groupes communautaires dirigés par des femmes en zones périurbaines/rurales
- Fournisseurs d'équipements solaires offrant des offres groupées
- ONG et programmes d'électrification rurale soutenant les coopératives

### Impact attendu

En améliorant la confiance dans le financement collectif, CoopEnergie permet aux communautés d'acquérir des systèmes solaires que les membres individuels ne pourraient pas payer seuls, accélérant ainsi l'électrification locale sans attendre l'extension du réseau.

> Source de référence : cadre de référence MIABE Hackathon 2026 partagé par Darollo Technologies Corporation (DTC).

## Structure du dépôt

- `apps/backend` — API NestJS, GraphQL, Prisma, paiements, notifications, services fournisseurs
- `apps/web` — Application web Next.js pour le marketing, les tableaux de bord membres, fournisseurs et outils d'administration
- `apps/mobile` — Application mobile Expo / React Native
- `contracts` — Contrats intelligents Hardhat et scripts de déploiement
- `packages` — Modules partagés de l'espace de travail
- `infra` — Docker et outils d'infrastructure
- `docs` — Documentation d'implémentation et de la plateforme
- `.github/workflows` — CI/CD, déploiement, seed et flux de travail RLS

## Stack technique principal

- Runtime et gestionnaire de paquets : Bun
- Web : Next.js 16, React 19, Apollo Client, NextAuth
- Mobile : Expo 54, React Native 0.81, Expo Router
- Backend : NestJS 11, GraphQL, Prisma 5, PostgreSQL
- Stockage et notifications : AWS S3, Firebase, Expo notifications
- Contrats intelligents : Hardhat, Ethers, Viem

## Prérequis

- Bun `1.3.x`
- Node.js compatible avec la chaîne d'outils de l'espace de travail
- Docker Desktop pour Postgres et Redis en local
- Accès PostgreSQL pour les migrations Prisma
- Compte Expo / EAS pour les builds mobiles si nécessaire

## Pour commencer

### 1. Installer les dépendances

```bash
bun install
```

### 2. Synchroniser les fichiers d'environnement

```bash
bun run env:sync
```

### 3. Démarrer les services de base de données locaux

```bash
bun run db:up
```

### 4. Appliquer les migrations Prisma et générer le client

```bash
bun run db:migrate:deploy
bun run db:generate
```

### 5. Initialiser les données locales

```bash
bun run db:seed
```

### 6. Exécuter les applications

```bash
bun run dev:web
bun run dev:api
bun run dev:mobile
```

Ou exécutez la commande de développement orchestrée :

```bash
bun run dev
```

## Commandes utiles

### Espace de travail racine

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run clean
```

### Base de données

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

### Spécifiques aux applications

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

### Aides pour la version mobile

```bash
bun run mobile:apk
bun run mobile:aab
bun run mobile:ios
bun run mobile:build:all
bun run mobile:submit
```

## Comptes de démonstration pré-initialisés

Le script de seed du backend crée des utilisateurs de démonstration réalistes pour l'administrateur de la plateforme, les administrateurs de coopératives, les membres et les fournisseurs.

Commande de seed :

```bash
bun run db:seed
```

La liste complète des identifiants pré-initialisés est affichée par le script de seed à la fin de son exécution dans `apps/backend/src/prisma/seed.ts`.

## Flux de travail GitHub

Ce dépôt inclut des flux de travail manuels et automatisés dans `.github/workflows`.

Flux de travail notables :

- `pr-validation.yml` — Validation des demandes de tirage (pull requests)
- `deploy-staging.yml` — Flux de déploiement vers l'environnement de préproduction (staging)
- `deploy-production.yml` — Flux de déploiement vers l'environnement de production
- `mobile-expo-cicd.yml` — CI/CD pour l'application mobile Expo
- `manual-seed.yml` — Initialisation manuelle d'une base de données distante
- `manual-rls-migration.yml` — Application ou annulation manuelle des scripts SQL RLS Supabase
- `prisma-migrate.yml` — Flux de travail de migration Prisma

## Opérations manuelles sur la base de données de production

### Initialisation manuelle (seed)

Utilisez `.github/workflows/manual-seed.yml` pour exécuter manuellement l'initialisation de la base de données de production avec `workflow_dispatch`.

Secret requis :

- `DIRECT_DATABASE_URL` ou `DIRECT_URL`

### Migration RLS Supabase manuelle

Utilisez `.github/workflows/manual-rls-migration.yml` pour appliquer ou annuler manuellement le script SQL RLS sur Supabase.

Fichiers SQL :

- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.sql`
- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.rollback.sql`

Le flux de travail inclut une étape de pré-vérification qui enregistre :

- l'action sélectionnée
- le fichier SQL et son empreinte SHA256
- la base de données et l'utilisateur actuels
- le nombre de politiques existantes
- les indicateurs RLS actuels par table cible

Secret requis :

- `DIRECT_DATABASE_URL` ou `DIRECT_URL`

## Notes pour les contributeurs

- Utilisez les commandes Bun depuis la racine du dépôt, sauf s'il existe une raison spécifique au niveau de l'application de ne pas le faire.
- Privilégiez les modifications ciblées. Les applications web, backend, mobile et les contrats vivent dans le même espace de travail mais sont déployées différemment.
- Le schéma Prisma se trouve dans `apps/backend/prisma/schema.prisma`.
- La documentation des contrats intelligents se trouve dans `contracts/README.md` et les outils de déploiement dans `contracts/scripts`.

## Points d'attention actuels

- Certains avertissements de lint existent déjà dans l'application web concernant les tableaux de dépendances des hooks React ; ils ne bloquent pas actuellement la commande de lint racine.
- Les flux de travail sur la base de données de production sont intentionnellement manuels et nécessitent une confirmation.

## Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE`.


# CoopEnergie

## Français

CoopEnergie est un monorepo pour une plateforme coopérative de financement énergétique centrée sur le Cameroun. Il inclut une expérience web publique, des tableaux de bord membres et vendeurs, une application mobile, un backend NestJS, l'accès aux données via Prisma/PostgreSQL, et des smart contracts pour les flux de fonds coopératifs.

### Contexte Hackathon (MIABE 2026)

Ce projet est développé pour le **MIABE Hackathon 2026** (D10 : Énergies renouvelables & Microgrids), dans le cadre du challenge :

- **Code projet** : CM-02
- **Nom du projet** : CoopEnergie
- **ODD principaux** : ODD 7 (Énergie propre), ODD 1 (Fin de la pauvreté), ODD 11 (Villes durables)

Le challenge traite un problème concret au Cameroun : de nombreux foyers ne peuvent pas financer individuellement un kit solaire, mais peuvent y accéder via l'épargne coopérative et l'achat groupé. CoopEnergie s'appuie sur la transparence apportée par la blockchain pour réduire les conflits de gestion des fonds collectifs, en rendant auditables les cotisations, les votes et les traces financières.

#### Problème central

Les groupes veulent acheter des équipements solaires collectivement, mais manquent d'outils fiables pour gérer les fonds communs de manière transparente. Sans visibilité sur qui a cotisé, le solde courant et les décisions d'achat, les coopératives échouent souvent avant d'atteindre leur objectif.

#### Ce que la solution apporte

- Création de coopératives pour l'achat groupé d'équipements solaires
- Suivi transparent et immuable des cotisations
- Vote de type gouvernance on-chain pour les décisions d'achat
- Génération automatique de rapports sur les fonds collectés, les décisions et la planification des achats

#### Utilisateurs cibles

- Groupes de citoyens au Cameroun achetant des équipements solaires collectivement
- Associations de quartier et groupements de femmes en zones périurbaines/rurales
- Fournisseurs d'équipements solaires proposant des offres groupées
- ONG et programmes d'électrification rurale soutenant les coopératives

#### Impact attendu

En renforçant la confiance dans le financement collectif, CoopEnergie permet aux communautés d'acquérir des systèmes solaires qu'aucun membre ne pourrait financer seul, accélérant l'électrification locale sans attendre l'extension du réseau.

> Source de référence : cadre de référence MIABE Hackathon 2026 partagé par Darollo Technologies Corporation (DTC).

### Structure du dépôt

- `apps/backend` — API NestJS, GraphQL, Prisma, paiements, notifications, services vendeurs
- `apps/web` — application Next.js pour marketing, dashboards membres, dashboards vendeurs et outils admin
- `apps/mobile` — application mobile Expo / React Native
- `contracts` — smart contracts Hardhat et scripts de déploiement
- `packages` — modules partagés du workspace
- `infra` — helpers Docker et infrastructure
- `docs` — documentation implémentation et plateforme
- `.github/workflows` — workflows CI/CD, déploiement, seed et RLS

### Stack principal

- Runtime et gestionnaire de paquets : Bun
- Web : Next.js 16, React 19, Apollo Client, NextAuth
- Mobile : Expo 54, React Native 0.81, Expo Router
- Backend : NestJS 11, GraphQL, Prisma 5, PostgreSQL
- Stockage et notifications : AWS S3, Firebase, notifications Expo
- Smart contracts : Hardhat, Ethers, Viem

### Prérequis

- Bun `1.3.x`
- Node.js compatible avec la toolchain du workspace
- Docker Desktop pour Postgres et Redis en local
- Accès PostgreSQL pour les migrations Prisma
- Compte Expo / EAS pour les builds mobile si nécessaire

### Démarrage rapide

#### 1. Installer les dépendances

```bash
bun install
```

#### 2. Synchroniser les fichiers d'environnement

```bash
bun run env:sync
```

#### 3. Démarrer les services de base de données en local

```bash
bun run db:up
```

#### 4. Appliquer les migrations Prisma et générer le client

```bash
bun run db:migrate:deploy
bun run db:generate
```

#### 5. Seeder les données locales

```bash
bun run db:seed
```

#### 6. Lancer les applications

```bash
bun run dev:web
bun run dev:api
bun run dev:mobile
```

Ou lancer la commande de dev orchestrée :

```bash
bun run dev
```

### Commandes utiles

#### Workspace racine

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run clean
```

#### Base de données

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

#### Commandes par application

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

#### Aides pour release mobile

```bash
bun run mobile:apk
bun run mobile:aab
bun run mobile:ios
bun run mobile:build:all
bun run mobile:submit
```

### Comptes de démo seedés

Le script de seed backend crée des utilisateurs de démo réalistes pour les admins plateforme, admins coopératives, membres et vendeurs.

Commande de seed :

```bash
bun run db:seed
```

La liste complète des identifiants seedés est affichée par le script de seed en fin d'exécution dans `apps/backend/src/prisma/seed.ts`.

### Workflows GitHub

Ce dépôt inclut des workflows manuels et automatiques sous `.github/workflows`.

Workflows notables :

- `pr-validation.yml` — validation des pull requests
- `deploy-staging.yml` — déploiement staging
- `deploy-production.yml` — déploiement production
- `mobile-expo-cicd.yml` — CI/CD mobile Expo
- `manual-seed.yml` — seed manuel d'une base distante
- `manual-rls-migration.yml` — application/rollback manuel SQL RLS Supabase
- `prisma-migrate.yml` — workflow de migration Prisma

### Opérations manuelles base de données production

#### Seed manuel

Utiliser `.github/workflows/manual-seed.yml` pour lancer un seed de production manuellement via `workflow_dispatch`.

Secret requis :

- `DIRECT_DATABASE_URL` ou `DIRECT_URL`

#### Migration RLS Supabase manuelle

Utiliser `.github/workflows/manual-rls-migration.yml` pour appliquer ou annuler manuellement le SQL RLS sur Supabase.

Fichiers SQL :

- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.sql`
- `apps/backend/prisma/sql/rls/001_enable_rls_and_policies.rollback.sql`

Le workflow inclut une étape de precheck qui journalise :

- action sélectionnée
- fichier SQL et digest SHA256
- base de données et utilisateur courants
- nombre de policies existantes
- états RLS courants par table cible

Secret requis :

- `DIRECT_DATABASE_URL` ou `DIRECT_URL`

### Notes pour les contributeurs

- Utiliser les commandes Bun depuis la racine du dépôt sauf raison spécifique au niveau app.
- Privilégier des changements ciblés. Le web, le backend, le mobile et les contracts sont dans le même workspace mais déployés différemment.
- Le schéma Prisma se trouve dans `apps/backend/prisma/schema.prisma`.
- La doc smart contracts se trouve dans `contracts/README.md` et les helpers de déploiement dans `contracts/scripts`.

### Points d'attention actuels

- Certains warnings lint web existent déjà sur les tableaux de dépendances des hooks React ; ils ne bloquent pas actuellement la commande lint racine.
- Les workflows de base de données production sont volontairement manuels et protégés par confirmation.

### Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE`.

---

## English

CoopEnergie is a monorepo for a cooperative energy financing platform focused on Cameroon. It includes a public web experience, member and vendor dashboards, a mobile app, a NestJS backend, Prisma/PostgreSQL data access, and smart contracts for cooperative fund workflows.

### Hackathon Context (MIABE 2026)

This project is developed for **MIABE Hackathon 2026** (D10: Renewable Energy & Microgrids), under the challenge:

- **Project code**: CM-02
- **Project name**: CoopEnergie
- **Main SDGs**: SDG 7 (Clean Energy), SDG 1 (No Poverty), SDG 11 (Sustainable Cities)

The challenge focuses on a practical problem in Cameroon: many households cannot individually afford a solar kit, but can do so through cooperative savings and group purchase. CoopEnergie uses blockchain-backed transparency to reduce conflicts in collective fund management by making contributions, voting decisions, and financial traces auditable.

#### Problem Statement

Groups want to buy solar equipment collectively, but lack trusted tools to manage shared funds transparently. Without accountability on who contributed, current balance, and purchase decisions, cooperatives often fail before reaching their goal.

#### What the Solution Delivers

- Cooperative creation for group solar purchasing
- Transparent and immutable contribution tracking
- On-chain governance-style voting for purchase decisions
- Automatic reporting on collected funds, decisions, and purchase planning

#### Intended End Users

- Citizen groups in Cameroon buying solar equipment collectively
- Neighborhood associations and women-led community groups in peri-urban/rural areas
- Solar equipment suppliers offering group deals
- NGOs and rural electrification programs supporting cooperatives

#### Expected Impact

By improving trust in collective financing, CoopEnergie enables communities to acquire solar systems that individual members could not afford alone, accelerating local electrification without waiting for grid extension.

> Reference source: MIABE Hackathon 2026 reference framework shared by Darollo Technologies Corporation (DTC).

### Repository Layout

- `apps/backend` — NestJS API, GraphQL, Prisma, payments, notifications, vendor services
- `apps/web` — Next.js web app for marketing, member dashboards, vendor dashboards, and admin tools
- `apps/mobile` — Expo / React Native mobile application
- `contracts` — Hardhat smart contracts and deployment scripts
- `packages` — shared package workspace modules
- `infra` — Docker and infrastructure helpers
- `docs` — implementation and platform documentation
- `.github/workflows` — CI/CD, deployment, seed, and RLS workflows

### Core Stack

- Runtime and package manager: Bun
- Web: Next.js 16, React 19, Apollo Client, NextAuth
- Mobile: Expo 54, React Native 0.81, Expo Router
- Backend: NestJS 11, GraphQL, Prisma 5, PostgreSQL
- Storage and notifications: AWS S3, Firebase, Expo notifications
- Smart contracts: Hardhat, Ethers, Viem

### Prerequisites

- Bun `1.3.x`
- Node.js compatible with the workspace toolchain
- Docker Desktop for local Postgres and Redis
- PostgreSQL access for Prisma migrations
- Expo / EAS account for mobile builds when needed

### Getting Started

#### 1. Install dependencies

```bash
bun install
```

#### 2. Sync environment files

```bash
bun run env:sync
```

#### 3. Start local database services

```bash
bun run db:up
```

#### 4. Apply Prisma migrations and generate client

```bash
bun run db:migrate:deploy
bun run db:generate
```

#### 5. Seed local data

```bash
bun run db:seed
```

#### 6. Run the apps

```bash
bun run dev:web
bun run dev:api
bun run dev:mobile
```

Or run the orchestrated development command:

```bash
bun run dev
```

### Useful Commands

#### Root workspace

```bash
bun run dev
bun run lint
bun run typecheck
bun run build
bun run clean
```

#### Database

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

#### App-specific

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

#### Mobile release helpers

```bash
bun run mobile:apk
bun run mobile:aab
bun run mobile:ios
bun run mobile:build:all
bun run mobile:submit
```

### Seeded Demo Accounts

The backend seed script creates realistic demo users for platform admin, cooperative admins, members, and vendors.

Seed command:

```bash
bun run db:seed
```

The full list of seeded credentials is printed by the seed script at the end of execution in `apps/backend/src/prisma/seed.ts`.

### GitHub Workflows

This repository includes manual and automated workflows under `.github/workflows`.

Notable workflows:

- `pr-validation.yml` — validation for pull requests
- `deploy-staging.yml` — staging deployment flow
- `deploy-production.yml` — production deployment flow
- `mobile-expo-cicd.yml` — Expo mobile CI/CD
- `manual-seed.yml` — manually seed a remote database
- `manual-rls-migration.yml` — manually apply or roll back Supabase RLS SQL
- `prisma-migrate.yml` — Prisma migration workflow

### Manual Production Database Operations

#### Manual seed

Use `.github/workflows/manual-seed.yml` to run the production seed manually with `workflow_dispatch`.

Required secret:

- `DIRECT_DATABASE_URL` or `DIRECT_URL`

#### Manual Supabase RLS migration

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

### Notes for Contributors

- Use Bun commands from the repo root unless there is a specific app-level reason not to.
- Prefer focused changes. The web, backend, mobile, and contracts live in the same workspace but are deployed differently.
- Prisma schema lives at `apps/backend/prisma/schema.prisma`.
- Smart contract docs live in `contracts/README.md` and deployment helpers under `contracts/scripts`.

### Current Areas of Concern

- Some web lint warnings already exist around React hook dependency arrays; they do not currently block the root lint command.
- Production database workflows are intentionally manual and confirmation-gated.

### License

This project is licensed under the MIT License. See the `LICENSE` file.
