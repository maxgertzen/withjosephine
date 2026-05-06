# Sanity Datasets

The Sanity project (`e8jsb14m`) hosts two datasets:

| Dataset | Purpose | Source of truth |
|---------|---------|-----------------|
| `production` | Live customer-facing content | Edited by Josephine via Studio |
| `staging` | QA mirror for testing schema changes, deploys, and the booking flow before promoting to production | Seeded from `production`; can be re-seeded any time |

Schemas (in `studio/schemas/`) are **code** and apply uniformly across both datasets the moment Studio is deployed. There is no per-dataset schema state. What can drift across datasets is the **data**.

## Re-seeding staging from production

Run any time staging content is stale enough to refresh, or after a schema change adds a new doc type that you want to populate from prod:

```sh
set -a && source .env.local && set +a && pnpm seed:staging
```

The script (`scripts/seed-staging-dataset.ts`):

1. Queries `production` live for `array::unique(*[]._type)`
2. Filters out `submission` (PII) and any `system.*` types Sanity manages internally
3. Exports the remaining types + their assets via `sanity dataset export`
4. Imports into `staging` via `sanity dataset import --replace`

**Self-updating:** the type list is discovered at runtime, NOT hardcoded. As schemas evolve and new doc types appear in production, the next re-seed picks them up automatically. A vitest assertion (`scripts/seed-staging-dataset.test.ts`) locks this contract — it fails the build if anyone re-introduces a hardcoded `--types reading,siteSettings,...` literal.

**Requirements:**
- The local user must be `sanity login`-ed (the script shells out to `sanity` CLI for export/import)
- The `@sanity/client` query uses anonymous read access; no token needed for the type discovery step
- Staging will be **wiped and replaced** with the seeded content (`--replace`). Any staging-only content authored in Studio is lost. If you need to preserve staging-only edits, export staging first.

## What does NOT cross datasets

- **Submissions.** The `submission` doc type is excluded from the seed by design. Customer PII (email, name, birth data, photo URLs) lives only in `production`.
- **System docs.** `system.group`, `system.retention`, `system.schema` — auto-managed by Sanity per dataset.

## Sanity content migrations (separate concern)

When a schema change adds a *required field* to an existing doc type, both `production` and `staging` will have docs that lack that field — Studio shows validation errors on those docs. This is a **content migration** problem, not a seed problem. It applies symmetrically to both datasets and is solved with `sanity migration`-style scripts that backfill the new field on existing docs.

The seed script does NOT solve content migrations. If a schema change adds a required field, write a one-shot migration script (see `scripts/migrate-*` for examples) and run it against both `production` and `staging`.

## When to re-seed

| Trigger | Action |
|---------|--------|
| Josephine added significant content in production and staging is stale | `pnpm seed:staging` |
| New doc type added in production via Studio | `pnpm seed:staging` to bring it across |
| Required field added to existing schema | Write content migration; do NOT rely on re-seed |
| Field renamed | Write content migration; do NOT rely on re-seed |
| Localized testing of a Studio change | Use `staging` directly via Studio dataset switcher; do NOT re-seed mid-test (it'll wipe your test docs) |
| Asset re-organization in production | `pnpm seed:staging` (assets travel with the export) |

## What lives only in staging (intentionally)

Staging diverges from production where staging-only QA content makes sense:

- **`reading` doc `stripePaymentLink`** — currently same as production (re-used existing test-mode Payment Links). When apex unparks and production swaps to live-mode Payment Links (see `docs/POST_LAUNCH_BACKLOG.md` § "Apex unpark — Stripe live-mode flip target"), staging stays on test-mode URLs. Re-seeding from production AFTER that flip would clobber staging's test-mode URLs with live-mode ones — at that point, either drop the `reading` type from the seed, or post-process to revert payment links per env.
