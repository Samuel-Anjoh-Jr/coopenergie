# Hardcoded UI Strings Audit

## Overview

This document identifies hardcoded UI strings in the web and mobile applications that should be using the translation system instead.

---

## 1. WEB APP HARDCODED STRINGS (apps/web)

### 1.1 Login Page (`app/login/page.tsx`)

**Location**: Both Desktop and Mobile sections of the page

| Current String                      | Suggested Translation Key                       | Context                           |
| ----------------------------------- | ----------------------------------------------- | --------------------------------- |
| `"CoopEnergie"`                     | `branding.appName`                              | App name/branding                 |
| `"The power of the sun,"`           | `auth.heroTextLine1` or `branding.heroTagline1` | Hero section tagline              |
| `"the strength of the collective."` | `auth.heroTextLine2` or `branding.heroTagline2` | Hero section tagline continuation |
| `"name@example.com"`                | `auth.emailPlaceholder`                         | Email input placeholder           |
| `"Enter your password"`             | `auth.passwordPlaceholder`                      | Password input placeholder        |

**Note**: Some strings are using `t()` for labels (Email, Password) but placeholders are hardcoded.

---

### 1.2 Navbar Component (`components/navbar.tsx`)

**Location**: Accessibility labels

| Current String           | Suggested Translation Key  | Context                    |
| ------------------------ | -------------------------- | -------------------------- |
| `"Switch to light mode"` | `theme.switchToLight`      | Theme toggle aria-label    |
| `"Switch to dark mode"`  | `theme.switchToDark`       | Theme toggle aria-label    |
| `"Switch to French"`     | `language.switchToFrench`  | Language toggle aria-label |
| `"Switch to English"`    | `language.switchToEnglish` | Language toggle aria-label |
| `"User menu"`            | `navigation.userMenu`      | User menu aria-label       |

---

### 1.3 Contributions Page (`app/[locale]/dashboard/contributions/page.tsx`)

| Current String                                                                 | Suggested Translation Key                                    | Context                                                          |
| ------------------------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `"TX Hash"`                                                                    | `contributions.txHashHeader`                                 | Table header                                                     |
| `"Member"`                                                                     | `common.defaultMemberLabel` or `contributions.defaultMember` | Default name when userName is null                               |
| `"Montant invalide"` (FR) / `"Invalid amount"`                                 | `errors.invalidAmount`                                       | Error message (inline logic)                                     |
| `"Hash copie"` (FR) / `"Hash copied"`                                          | `feedback.hashCopied`                                        | Toast message (inline logic)                                     |
| `"Echec de copie"` (FR) / `"Copy failed"`                                      | `errors.copyFailed`                                          | Toast error message (inline logic)                               |
| `"Montant invalide"` (FR) / `"Invalid amount"`                                 | `errors.invalidAmount`                                       | Toast error (inline logic)                                       |
| `"Contribution ajoutee"` (FR) / `"Contribution added"`                         | `toasts.contributionAdded`                                   | Toast success message (already in translations but using inline) |
| `"Impossible d'ajouter la contribution"` (FR) / `"Failed to add contribution"` | `errors.addContributionFailed`                               | Error message (inline logic)                                     |
| `"Total collecte"` (FR) / `"Total Collected"`                                  | `contributions.totalCollected`                               | Card header (inline logic)                                       |
| `"Goal"` (FR) / `"Objectif"` (FR) / `"complete"`                               | `contributions.goalLabel`, `contributions.completeLabel`     | Progress info (inline logic)                                     |

---

### 1.4 Profile Page (`app/[locale]/dashboard/profile/page.tsx`)

| Current String                                | Suggested Translation Key                                           | Context                                    |
| --------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------ |
| `"Ex: Jean Dupont"` (FR) / `"e.g., John Doe"` | `profile.nameExampleFr` / `profile.nameExampleEn`                   | Name input placeholder                     |
| `"6XXXXXXXX"`                                 | `profile.phonePlaceholder`                                          | Phone input placeholder (hardcoded format) |
| `"Ex: Ecobank"` (FR) / `"e.g., Ecobank"`      | `profile.bankExampleFr` / `profile.bankExampleEn`                   | Bank input placeholder                     |
| `"Ex: 123456789"` (FR) / `"e.g., 123456789"`  | `profile.accountNumberExampleFr` / `profile.accountNumberExampleEn` | Account number placeholder                 |

---

### 1.5 Settings Page (`app/[locale]/dashboard/settings/page.tsx`)

| Current String                 | Suggested Translation Key    | Context                                     |
| ------------------------------ | ---------------------------- | ------------------------------------------- |
| `"Ex: 75"` (FR) / `"e.g., 75"` | `settings.percentageExample` | Multiple percentage input placeholders (x4) |
| `"Ex: 50"` (FR) / `"e.g., 50"` | `settings.amountExample`     | Amount input placeholder                    |
| `"Ex: 90"` (FR) / `"e.g., 90"` | `settings.percentageExample` | Percentage input placeholder                |
| `"Ex: 10"` (FR) / `"e.g., 10"` | `settings.percentageExample` | Percentage input placeholder                |

---

### 1.6 Proposals Page (`app/[locale]/dashboard/proposals/page.tsx`)

| Current String                                              | Suggested Translation Key                | Context                           |
| ----------------------------------------------------------- | ---------------------------------------- | --------------------------------- |
| `"Withdrawal proposal created. Members can now vote."` (EN) | `proposals.withdrawalCreatedMessage`     | Toast message (inline logic)      |
| `"Create a withdrawal request for members to vote on."`     | `proposals.withdrawalRequestDescription` | Dialog description (inline logic) |
| `"Membres éligibles"` (FR) / `"Eligible Members"`           | `proposals.eligibleMembers`              | Label (inline logic)              |
| `"Ex: 50000"` (FR) / `"e.g., 50000"`                        | `proposals.amountExample`                | Amount placeholder                |
| `"6XXXXXXXX"`                                               | `proposals.phonePlaceholder`             | Phone placeholder                 |

**Note**: Some proposal placeholders are not visible in the excerpt, check full file for phone/bank placeholders.

---

### 1.7 Layout & Global (`app/layout.tsx`)

| Current String  | Suggested Translation Key | Context             |
| --------------- | ------------------------- | ------------------- |
| `'CoopEnergie'` | `branding.appName`        | Page title metadata |

---

## 2. MOBILE APP HARDCODED STRINGS (apps/mobile)

### 2.1 Authentication - Login (`app/(auth)/login.tsx`)

| Current String                          | Suggested Translation Key            | Context                                  |
| --------------------------------------- | ------------------------------------ | ---------------------------------------- |
| `"CoopEnergie"`                         | `branding.appName`                   | App name heading                         |
| `"Connectez-vous a votre cooperative."` | `auth.loginSubtitle`                 | Login form subtitle                      |
| `"Email"`                               | `common.email`                       | Label (already should be translatable)   |
| `"Mot de passe"`                        | `common.password`                    | Label (already should be translatable)   |
| `"vous@exemple.com"`                    | `auth.emailPlaceholder`              | Email input placeholder                  |
| `"********"`                            | `auth.passwordPlaceholder`           | Password input placeholder               |
| `"Connexion"`                           | `common.login` or `auth.loginButton` | Button text                              |
| `"Creer un compte"`                     | `auth.createAccount`                 | Link text                                |
| `"Connexion impossible"`                | `errors.loginFailed`                 | Alert title (hardcoded in error handler) |
| `"Une erreur est survenue."`            | `errors.unknownError`                | Alert message fallback                   |

---

### 2.2 Authentication - Register (`app/(auth)/register.tsx`)

| Current String                      | Suggested Translation Key                  | Context                                  |
| ----------------------------------- | ------------------------------------------ | ---------------------------------------- |
| `"Inscription"`                     | `auth.registerTitle`                       | Page title                               |
| `"Creez votre compte CoopEnergie."` | `auth.registerSubtitle`                    | Subtitle                                 |
| `"Nom"`                             | `common.name`                              | Label                                    |
| `"Votre nom"`                       | `auth.nameExamplePlaceholder`              | Name placeholder                         |
| `"Email"`                           | `common.email`                             | Label                                    |
| `"vous@exemple.com"`                | `auth.emailPlaceholder`                    | Email placeholder                        |
| `"Mot de passe"`                    | `common.password`                          | Label                                    |
| `"********"`                        | `auth.passwordPlaceholder`                 | Password placeholder                     |
| `"S'inscrire"`                      | `common.register` or `auth.registerButton` | Button text                              |
| `"Retour a la connexion"`           | `auth.backToLogin`                         | Link text                                |
| `"Inscription impossible"`          | `errors.registrationFailed`                | Alert title (hardcoded in error handler) |
| `"Une erreur est survenue."`        | `errors.unknownError`                      | Alert message fallback                   |

---

### 2.3 Authentication - Join (`app/(auth)/join.tsx`)

| Current String                          | Suggested Translation Key       | Context                |
| --------------------------------------- | ------------------------------- | ---------------------- |
| `"Invitation invalide"`                 | `errors.invalidInvitation`      | Alert title            |
| `"Le token d'invitation est manquant."` | `errors.missingInvitationToken` | Alert message          |
| `"Invitation impossible"`               | `errors.joinFailed`             | Alert title            |
| `"Une erreur est survenue."`            | `errors.unknownError`           | Alert message fallback |
| `"Traitement de votre invitation..."`   | `auth.processingInvitation`     | Loading text           |

---

### 2.4 Dashboard - Contributions (`app/(dashboard)/contributions.tsx`)

| Current String                                                    | Suggested Translation Key                              | Context                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------- |
| `"Montant invalide"`                                              | `errors.invalidAmount`                                 | Alert title                                    |
| `"Entrez un montant valide."`                                     | `errors.enterValidAmount`                              | Alert message                                  |
| `"Hors ligne"`                                                    | `status.offline`                                       | Alert title (appears x3 in different contexts) |
| `"Contribution mise en file d'attente pour sync."`                | `feedback.contributionQueued`                          | Alert message                                  |
| `"Contribution confirmee"`                                        | `feedback.contributionConfirmed`                       | Alert title                                    |
| `"TX: ${truncateHash(txHash)}"`                                   | `feedback.transactionHash`                             | Template string in alert                       |
| `"Fermer"`                                                        | `common.close`                                         | Button text in alert                           |
| `"Voir sur CeloScan"`                                             | `common.viewOnCeloScan` or `blockchain.viewOnExplorer` | Button text in alert                           |
| `"Contribution envoyee"`                                          | `feedback.contributionSent`                            | Alert title                                    |
| `"Votre contribution a ete enregistree."`                         | `feedback.contributionRecorded`                        | Alert message                                  |
| `"Erreur"`                                                        | `errors.error`                                         | Alert title                                    |
| `"Impossible de cotiser."`                                        | `errors.contributionFailed`                            | Alert message fallback                         |
| `"Hors ligne: les contributions seront mises en file d'attente."` | `status.offlineContributionsWarning`                   | Offline warning banner                         |
| `"Cotiser"`                                                       | `contributions.contribute` or `common.contribute`      | Button text                                    |
| `"Chargement des contributions..."`                               | `status.loadingContributions`                          | Loading text                                   |
| `"Montant XAF"`                                                   | `contributions.amountPlaceholder`                      | Input placeholder                              |
| `"Nouvelle contribution"`                                         | `contributions.newContribution`                        | Modal title                                    |
| `"Annuler"`                                                       | `common.cancel`                                        | Button text                                    |
| `"Valider"`                                                       | `common.confirm` or `common.submit`                    | Button text                                    |
| `"Membre"`                                                        | `common.defaultMemberLabel`                            | Default name when userName is null             |

---

### 2.5 Dashboard - Main (`app/(dashboard)/dashboard.tsx`)

| Current String                                  | Suggested Translation Key       | Context                  |
| ----------------------------------------------- | ------------------------------- | ------------------------ | ------------------------ | ---------------- |
| `"Chargement du dashboard..."`                  | `status.loadingDashboard`       | Loading text             |
| `"Mode hors ligne: donnees locales affichees."` | `status.offlineModeDataMessage` | Offline banner message   |
| `"Cooperative"`                                 | `common.defaultCooperativeName` | Default cooperative name |
| `"Adresse du wallet"`                           | `dashboard.walletAddress`       | Card title               |
| `"Cible: ${cooperative?.targetAmountXAF         |                                 | 0} XAF"`                 | `dashboard.targetAmount` | Template in card |
| `"Collecte: ${totalCollected} XAF"`             | `dashboard.collectedAmount`     | Template in card         |
| `"Copier"`                                      | `common.copy`                   | Button text              |
| `"Voir sur CeloScan"`                           | `common.viewOnCeloScan`         | Button text              |
| `"Membres"`                                     | `dashboard.members`             | Card title               |
| `"Activite recente"`                            | `dashboard.recentActivity`      | Card title               |
| `"Aucune activite recente."`                    | `dashboard.noRecentActivity`    | Empty state text         |

---

### 2.6 Dashboard - Ledger (`app/(dashboard)/ledger.tsx`)

| Current String                            | Suggested Translation Key     | Context          |
| ----------------------------------------- | ----------------------------- | ---------------- |
| `"All"`                                   | `ledger.filterAll`            | Filter label     |
| `"Contributions"`                         | `ledger.filterContributions`  | Filter label     |
| `"Votes"`                                 | `ledger.filterVotes`          | Filter label     |
| `"Proposals"`                             | `ledger.filterProposals`      | Filter label     |
| `"Hors ligne: affichage du cache local."` | `status.offlineLedgerMessage` | Offline banner   |
| `"Wallet"`                                | `dashboard.wallet`            | Card title       |
| `"Voir sur CeloScan"`                     | `common.viewOnCeloScan`       | Button/Link text |
| `"Chargement du ledger..."`               | `status.loadingLedger`        | Loading text     |
| `"Block ${item.blockNumber}"`             | `ledger.blockLabel`           | Template string  |
| `"TX: ${truncateHash(item.txHash)}"`      | `ledger.transactionLabel`     | Template string  |

---

### 2.7 Dashboard - Proposals (`app/(dashboard)/proposals.tsx`)

| Current String                                                      | Suggested Translation Key         | Context                |
| ------------------------------------------------------------------- | --------------------------------- | ---------------------- |
| `"Hors ligne"`                                                      | `status.offline`                  | Alert title            |
| `"Vote mis en file d'attente pour sync."`                           | `feedback.voteQueued`             | Alert message          |
| `"Vote impossible"`                                                 | `errors.voteFailed`               | Alert title            |
| `"Une erreur est survenue."`                                        | `errors.unknownError`             | Alert message fallback |
| `"Champs requis"`                                                   | `errors.requiredFields`           | Alert title            |
| `"Entrez un titre et une description."`                             | `errors.enterTitleAndDescription` | Alert message          |
| `"Proposition mise en file d'attente pour sync."`                   | `feedback.proposalQueued`         | Alert message          |
| `"Creation impossible"`                                             | `errors.proposalCreationFailed`   | Alert title            |
| `"Hors ligne: votes et propositions seront mis en file d'attente."` | `status.offlineProposalsWarning`  | Offline banner         |

---

### 2.8 Dashboard - Report (`app/(dashboard)/report.tsx`)

| Current String              | Suggested Translation Key | Context                |
| --------------------------- | ------------------------- | ---------------------- |
| `"Rapport CSV CoopEnergie"` | `report.csvTitle`         | CSV file name template |
| `"Erreur CSV"`              | `errors.csvError`         | Alert title            |

---

## 3. SUMMARY BY CATEGORY

### Common/Recurring Hardcoded Strings

- **Offline/Online Status Messages**: Multiple similar messages about offline mode across both apps
- **Error Messages**: Generic error handling with hardcoded fallback messages
- **Button Labels**: Some buttons have hardcoded text instead of using translation keys
- **Placeholders**: Input placeholders mixing hardcoded and translated
- **Labels**: Some labels are hardcoded (Email, Password, etc.)
- **CeloScan Links**: "Voir sur CeloScan" / "View on CeloScan" appears multiple times

### Count Summary

- **Web App**: ~35-40 hardcoded strings
- **Mobile App**: ~70+ hardcoded strings
- **Total**: ~110+ hardcoded strings that should be translated

---

## 4. RECOMMENDATIONS

### Priority 1 (Critical - User Facing)

1. Add translation keys for all error messages
2. Add translation keys for all toast/alert messages
3. Add translation keys for all button labels
4. Add translation keys for all input placeholders

### Priority 2 (Important - UX)

1. Add translation keys for status messages (loading, offline, etc.)
2. Add translation keys for section titles and labels
3. Add translation keys for empty states and default values

### Priority 3 (Nice to Have)

1. Add translation keys for aria-labels (accessibility)
2. Add translation keys for help text and examples
3. Review and consolidate placeholder examples (currently using "Ex:" / "e.g.")

### Implementation Steps

1. Add all suggested translation keys to the translations.ts file (both EN and FR)
2. Replace hardcoded strings with `t()` function calls
3. For inline locale checks like `locale === "fr" ? "Text FR" : "Text EN"`, consolidate to use `t()` instead
4. Test all pages in both languages
5. Consider creating a translation audit script to detect new hardcoded strings
