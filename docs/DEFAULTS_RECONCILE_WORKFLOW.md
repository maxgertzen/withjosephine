# Defaults reconciliation workflow

`src/data/defaults.ts` is the build-time fallback for CMS-driven copy. When Becky edits a field in production Sanity Studio, the production page reflects her change. If a field is missing from Sanity (e.g., a new singleton that has not been seeded), the in-code default is what customers see.

Over time, Becky's edits drift from the in-code defaults. The reconciliation goal is to fold those edits back into the defaults so:

1. A fresh dataset (staging seed, a future preview env) renders with copy close to what production actually shows.
2. The defaults remain accurate "last-known-good" content if Sanity itself is degraded (the binding constraint that defaults exist at all).

## Step 1: run the audit

```bash
set -a && source .env.local && set +a
pnpm tsx scripts/audit-defaults-drift.mts production
```

The script is read-only. It does not mutate Sanity. Output sections:

- `[OK]  <docType>`: zero drift across scanned scalar fields. Nothing to do.
- `[DRIFT] <docType>`: one or more diverged scalar fields. The report lists each as `[drift]`, `[missing-in-prod]`, or `[extra-in-prod]`.

Coverage today: `entryPage`, `myReadingsPage`, `myGiftsPage`, `giftClaimPage`, `giftIntakePage`, `magicLinkVerifyPage`, `notFoundPage`, `underConstructionPage`. Nested singletons (`landingPage` sections, `siteSettings`, form schemas) need a per-section walker that does not exist yet.

## Step 2: decide per drift

For each `[drift]` line, decide:

- **Becky's value is the new canonical copy.** Update `src/data/defaults.ts` to match. Commit on a feature branch.
- **The default is correct; Becky's edit is wrong or stale.** Open Studio, restore the field to default. Re-run the audit and confirm zero drift.
- **Both are valid in their contexts** (e.g., staging vs prod intentionally diverge). Document the exception inline near the default constant.

`[missing-in-prod]` usually means Becky has not yet been onboarded to the new field. Confirm with her; if she wants the default, seed the field via `pnpm tsx scripts/seed-customer-emails-and-pages.mts` or a one-off migration.

`[extra-in-prod]` means Sanity carries a scalar that the in-code interface does not declare. Either:

- The schema-drift detector (`sanity-validate-drift.mts`) already lists it as legacy; no action.
- It is a new field Becky added in Studio that the codebase has not picked up yet. Add to the schema + defaults interface.

## Step 3: re-run

After each reconciliation pass, re-run the audit and confirm `drifts=0` for the singletons you touched.

## Coverage gaps

Nested singletons need their own audit pass. Tracked as future dex tasks rather than blocking this script's usefulness for the flat pages.
