# Mobile Expo Workflow

This repo uses Expo + EAS for mobile in `apps/mobile`.

Core commands:

- `expo start`: local development + fast refresh
- `eas build`: cloud build for APK/AAB/IPA
- `eas submit`: upload build artifact to stores

## 1. Current Project Setup

- App config: `apps/mobile/app.json`
- EAS config: `apps/mobile/eas.json`
- Expo project owner: `samuelanjohjr`
- Expo project slug: `coopenergie`
- Bundle IDs now set:
  - Android `expo.android.package = com.coopenergie.app`
  - iOS `expo.ios.bundleIdentifier = com.coopenergie.app`

## 2. Environment Variable Strategy (No Hardcoding)

`apps/mobile/eas.json` now does not hardcode endpoint values.

Set mobile runtime values in Expo console:

https://expo.dev/accounts/samuelanjohjr/projects/coopenergie/environment-variables

Add these for the appropriate environment (development/preview/production):

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_GRAPHQL_URL`
- `EXPO_PUBLIC_GRAPHQL_WS_URL`
- `EXPO_PUBLIC_CELOSCAN_BASE`

In this repo, mobile code checks `EXPO_PUBLIC_*` first and then `NEXT_PUBLIC_*` as local fallback.

## 3. Local Development

From repo root:

```bash
bun run dev:mobile
```

What you get:

- Expo dev server (Metro)
- QR for Expo Go
- Fast Refresh on save
- `w` key to open web preview

Use this mode for rapid JS/TS changes.

## 4. Build Outputs

### APK (install directly on Android phone)

From root:

```bash
bun run mobile:apk
```

This maps to `staging` profile and outputs APK.

### AAB (Google Play submission)

From root:

```bash
bun run mobile:aab
```

This maps to `production` profile and outputs store artifact (AAB).

### iOS IPA (App Store submission)

From `apps/mobile`:

```bash
bunx eas build --profile production --platform ios
```

## 5. New Root Mobile Scripts

Added in root `package.json`:

- `mobile:apk`
- `mobile:aab`
- `mobile:submit`

`mobile:submit` submits latest production artifacts for both Android and iOS.

## 6. Existing Android Scripts Explained

These already existed and still work:

- `mobile:android`: runs `expo run:android`
  - Builds native Android project locally and runs on emulator/device.
  - Best for local native debugging, not store release packaging.
- `mobile:android:install`: runs helper installer script for debug/dev build installation flow.
- `mobile:android:release:install`: same installer helper with release mode for local release APK install workflow.

Those are local-device workflows. EAS build scripts are cloud packaging workflows.

## 7. GitHub CI/CD Path (Main + Version Tags)

Workflow file:

- `.github/workflows/mobile-expo-cicd.yml`

Triggers:

- Push to `main`
- Push tag matching `v*.*.*`

Behavior:

- `main` push: builds Android APK with `staging` profile for internal QA distribution.
- Version tag push: builds and auto-submits production Android + iOS.
- Tag release job validates version is `>= v1.0.0` before running release submit.

So your first real store automation can start at `v1.0.0` exactly as requested.

## 8. What You Must Configure In Expo/GitHub Before Release Automation

### Expo console

1. Set project env vars listed above.
2. Configure Android signing credentials (keystore).
3. Configure iOS signing credentials (certificates + provisioning).
4. Configure EAS Submit credentials for:
   - Google Play service account access
   - App Store Connect API key / Apple credentials

### GitHub repository secrets

Add:

- `EXPO_TOKEN` (token from Expo account settings)

Without `EXPO_TOKEN`, CI cannot run authenticated EAS build/submit.

## 9. Notifications: Firebase vs Expo in This Repo

Your current setup uses both, with different targets:

- Mobile app: Expo push tokens (`Notifications.getExpoPushTokenAsync`) and backend `expo-server-sdk` for dispatch.
- Web push path: Firebase Admin service in backend for web/device tokens.

So for mobile notifications, Expo push infrastructure is in use and correctly wired in code.

To function end-to-end, ensure:

1. Device token registration endpoint is called after login/onboarding.
2. Backend has required notification env and Firebase admin values where needed.
3. Native credentials are configured in Expo for production notification delivery.

## 10. Release Flow You Will Use

1. Push to `main` for QA APK automation.
2. When ready and credentials are in place, push tag `v1.0.0`.
3. GitHub Actions runs production build + auto-submit for Android/iOS.
4. Monitor EAS build and submit logs for final store ingestion status.
