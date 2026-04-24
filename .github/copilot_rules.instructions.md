---
alwaysApply: true
always_on: true
trigger: always_on
applyTo: "**"
---

# Project Implementation Best Practices

## Workflow

- Work effectively: don't ask "do you want me to" — just do it
- Fix tasks sequentially, do NOT skip tasks
- For each task: identify affected backend AND frontend files, then implement fully
- Don't stop until all tasks are implemented and e2e tested
- If ANY requirement fails, stop and surface the error explicitly — do NOT guess, bypass, or simplify

## Data & APIs

- Use real database data only (Prisma)
- No static data, no mock responses, no mocked APIs
- All UI actions MUST hit backend endpoints
- Logs MUST show real Prisma queries
- No fake toasts, no silent failures

## Backend

- Backend endpoint: `http://127.0.0.1:3002/v1` — API calls must NOT include `/v1` again
- The frontend, backend, and db are already running — do not restart them
- Use Bun if needed

## Roles & Permissions

- Enforce role + tier permissions on every action
- Enforce driver / supplier / consumer / admin separation

## i18n

- i18n is required everywhere
- Translation keys must never contain `?` or `!` so missing keys are always visible
- API call translations must be applied everywhere needed

## Mobile & UI

- Ensure mobile friendliness

## Verification Checklist (before stopping)

- No static data
- No mocked APIs
- All maps use DB data
- All routes computed dynamically
- All roles enforced
- Logs show Prisma queries
- Location uncertainty is visible
- Human landmarks always shown
- System works without street names
- System works if GPS permission is denied

## Context

- This system runs in Cameroon
- This is a production system, not a prototype
