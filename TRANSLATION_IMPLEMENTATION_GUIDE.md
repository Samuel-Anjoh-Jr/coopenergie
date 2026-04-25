# Translation System Implementation Guide

## Status: Translation Keys Added ✅

All missing translation keys have been added to `/apps/web/lib/translations.ts` for both English (EN) and French (FR) versions.

## Summary of Added Translation Keys

### Core Categories Added

| Category          | Keys Added                          | Purpose                          |
| ----------------- | ----------------------------------- | -------------------------------- |
| **branding**      | appName, heroTagline1, heroTagline2 | App name and taglines            |
| **theme**         | switchToLight, switchToDark         | Theme toggle labels              |
| **language**      | switchToFrench, switchToEnglish     | Language toggle labels           |
| **navigation**    | userMenu                            | Navigation accessibility         |
| **errors**        | 12 error messages                   | Error handling (EN + FR)         |
| **feedback**      | 6 success/status messages           | User feedback (EN + FR)          |
| **status**        | 6 status messages                   | Loading/offline states (EN + FR) |
| **blockchain**    | viewOnCeloScan, viewOnExplorer      | Blockchain explorer links        |
| **profile**       | 4 placeholder examples              | Profile form placeholders        |
| **settings**      | 2 example placeholders              | Settings form examples           |
| **auth**          | 13 additional keys                  | Auth form strings                |
| **common**        | 8 additional keys                   | Common UI elements               |
| **contributions** | 3 additional keys                   | Contributions UI                 |
| **proposals**     | 3 additional keys                   | Proposals UI                     |
| **dashboard**     | 2 additional keys                   | Dashboard UI                     |
| **ledger**        | 3 filter keys                       | Ledger filters                   |

### Total Keys Added: 100+ translation strings (50+ EN + 50+ FR)

## Next Steps: Component Updates Required

### Web App (apps/web)

**Priority 1 - Authentication Pages:**

- [ ] `app/login/page.tsx` - Replace hardcoded strings with translation keys
- [ ] `app/(locale)/dashboard/profile/page.tsx` - Replace placeholders
- [ ] `app/(locale)/dashboard/settings/page.tsx` - Replace placeholders

**Priority 2 - Navigation & Layout:**

- [ ] `components/navbar.tsx` - Replace aria-labels and theme/language toggles
- [ ] `app/layout.tsx` - Update lang attribute

**Priority 3 - Dashboard Pages:**

- [ ] `app/(locale)/dashboard/contributions/page.tsx` - Replace table headers, errors, feedback
- [ ] `app/(locale)/dashboard/proposals/page.tsx` - Replace proposal strings
- [ ] `app/(locale)/dashboard/report/page.tsx` - Replace all hardcoded text

**Priority 4 - Home Page:**

- [ ] `app/(locale)/page.tsx` - Replace all homepage strings with translation keys

### Mobile App (apps/mobile)

**Priority 1 - Authentication:**

- [ ] `app/(auth)/login.tsx` - Replace all hardcoded strings
- [ ] `app/(auth)/register.tsx` - Replace all hardcoded strings
- [ ] `app/(auth)/join.tsx` - Replace all hardcoded strings

**Priority 2 - Dashboard:**

- [ ] `app/(dashboard)/dashboard.tsx` - Replace all hardcoded text
- [ ] `app/(dashboard)/contributions.tsx` - Replace all hardcoded text
- [ ] `app/(dashboard)/proposals.tsx` - Replace all hardcoded text
- [ ] `app/(dashboard)/ledger.tsx` - Replace filter labels and messages

**Priority 3 - Modals & Dialogs:**

- [ ] Review all Alert components for hardcoded strings
- [ ] Review all Modal/Dialog components for hardcoded strings

## Translation Key Reference

### Usage Pattern

**Before:**

```typescript
const label = "Invalid amount";
const placeholder = "Enter your email";
const errorMsg = locale === "fr" ? "Montant invalide" : "Invalid amount";
```

**After:**

```typescript
const label = t("errors.invalidAmount");
const placeholder = t("auth.emailPlaceholder");
const errorMsg = t("errors.invalidAmount");
```

### Key Naming Convention

**Format:** `category.subcategory.key`

**Examples:**

- `branding.appName` - App name
- `errors.invalidAmount` - Error message for invalid amount
- `auth.emailPlaceholder` - Email input placeholder
- `common.submit` - Submit button text
- `feedback.hashCopied` - Success feedback message
- `status.offline` - Offline status message

## Already Translated Keys

These keys were already in the translation system and don't need component updates:

✅ Common UI (submit, cancel, next, back, etc.)
✅ Dashboard sections (overview, contributions, proposals, ledger, report, settings, profile)
✅ Contributions page (main strings)
✅ Proposals page (main strings)
✅ Ledger page (main strings)
✅ Report page (main strings)
✅ Homepage sections
✅ Auth labels and demo info

## Implementation Checklist

### Web App

- [ ] Login page - Branding, placeholders, hero text
- [ ] Navbar - Theme/language toggle aria-labels
- [ ] Profile page - Input placeholders and examples
- [ ] Settings page - Input placeholders and examples
- [ ] Contributions page - Table headers, error messages, feedback
- [ ] Proposals page - Dialog strings and placeholders
- [ ] Dashboard pages - Loading states, empty states, error messages
- [ ] Verify all hardcoded strings are replaced

### Mobile App

- [ ] Auth screens - All login/register/join strings
- [ ] Dashboard screens - All hardcoded text
- [ ] Ledger filters - All filter button labels
- [ ] Error handling - All Alert titles and messages
- [ ] Loading states - All loading text
- [ ] Offline warnings - All offline-related messages
- [ ] Verify no hardcoded strings remain

## Testing After Implementation

### Verification Steps

1. **Language Switching**
   - Switch between EN and FR
   - Verify all UI text changes appropriately
   - Check for missing keys (will show as raw key names)

2. **Component Testing**
   - Test each updated component
   - Verify translations display correctly
   - Check for layout issues with translated text lengths

3. **Error Messages**
   - Trigger validation errors
   - Trigger API errors
   - Verify error messages are translated

4. **Loading States**
   - Check loading messages during data fetching
   - Verify offline mode messages display correctly
   - Check success/feedback messages

## Code Example

### Component Before (Hardcoded):

```typescript
export default function ContributionsPage() {
  const [error, setError] = useState('');

  return (
    <div>
      <h1>My Contributions</h1>
      <input placeholder="0" />
      <button>Add Contribution</button>
      {error && <p>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>TX Hash</th>
            <th>Amount</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
```

### Component After (Translation-Driven):

```typescript
export default function ContributionsPage() {
  const params = useParams();
  const locale = (params.locale as string) || "fr";
  const t = useTranslations(locale as Locale);

  const [error, setError] = useState('');

  return (
    <div>
      <h1>{t('contributions.title')}</h1>
      <input placeholder={t('common.amountPlaceholder')} />
      <button>{t('contributions.addContribution')}</button>
      {error && <p>{error}</p>}
      <table>
        <thead>
          <tr>
            <th>{t('contributions.txHashHeader')}</th>
            <th>{t('contributions.amount')}</th>
          </tr>
        </thead>
      </table>
    </div>
  );
}
```

## Support for New Strings

When adding new UI strings:

1. Add the string to both `en` and `fr` in `/apps/web/lib/translations.ts`
2. Use a clear hierarchical key name
3. Add the translation for mobile if needed (or create mobile-specific translation file)
4. Update this guide with the new key

## Troubleshooting

### Missing Translations

If you see raw key names in the UI (e.g., `"common.submit"`):

- Check if key exists in translations.ts
- Verify spelling matches exactly
- Verify path is correct (e.g., `branding.appName` not `branding.name`)
- Check console for errors

### Layout Issues with Translations

- French text is typically 20-30% longer than English
- Test both languages for layout issues
- Truncate long strings if necessary with CSS
- Use responsive text sizing

## Mobile App Translation Setup (To Do)

The mobile app should either:

1. Reuse the same translation system from web (`/apps/web/lib/translations.ts`)
2. Create a shared translation package (`/packages/translations/`)
3. Have its own translation file (`/apps/mobile/lib/translations.ts`)

**Recommended:** Create a shared package for single source of truth.

---

**Last Updated:** 2026-04-23
**Status:** Translation Keys ✅ | Component Updates ⏳ | Mobile Setup ⏳
