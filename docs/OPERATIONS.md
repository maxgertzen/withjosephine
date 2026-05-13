# Operations Reference

Three operational concerns that aren't big enough to deserve their own runbook but are too specific to leave undocumented: D1 migrations, the Sanity dataset model, and the Mixpanel funnels worth watching. Provisioning-grade procedures (Cloudflare, staging environment, dataset backups) live in [`runbooks/`](./runbooks/).

---

## D1 Migrations

Migration workflow for the `withjosephine_bookings` D1 database. This is a thin wrapper around `wrangler d1 migrations` — it just standardises the binding name + environment flags so commands stay consistent across machines and CI.

The migrations directory is `www/migrations/`. Each migration is a numbered SQL file (`NNNN_short_slug.sql`). Wrangler tracks applied migrations in a `d1_migrations` table on each database, scoped per environment.

### One-time bootstrap (production — already done)

The first two migrations (`0001_submissions.sql`, `0002_amount_paid.sql`) were applied to the production D1 manually via `wrangler d1 execute --file=…` **before** the migrations system was engaged. As a result, the production D1 has the schema but no `d1_migrations` tracking table.

If you run `pnpm migrate:apply:prod` on a database in this state, wrangler creates the tracking table and tries to apply both migrations from scratch. `0001` is idempotent (`CREATE TABLE IF NOT EXISTS`), but `0002` is not — `ALTER TABLE … ADD COLUMN` has no `IF NOT EXISTS` form in SQLite, so it errors with "duplicate column name".

The bootstrap SQL at `scripts/d1-bootstrap-prod-migrations.sql` creates the tracking table and inserts the two migration names with `INSERT OR IGNORE`. Run **once** against production:

```sh
pnpm exec wrangler d1 execute withjosephine_bookings --remote \
  --file=scripts/d1-bootstrap-prod-migrations.sql
```

Then verify both migrations show as applied:

```sh
pnpm migrate:list:prod
```

You should see `0001_submissions.sql` and `0002_amount_paid.sql` in the "applied" section.

The bootstrap is **not** needed on staging or local — both will apply the migration set fresh against an empty database, which works without any duplicate-column issue.

### Day-to-day workflow

**Create a new migration:**

```sh
pnpm migrate:create <short_slug>
```

Wrangler creates `migrations/NNNN_<short_slug>.sql` with the next number. Edit the file. Prefer idempotent SQL where SQLite allows it (`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`); know that `ALTER TABLE` is the unavoidable exception.

**Apply against local / staging / production:**

```sh
pnpm migrate:apply:local      # miniflare-emulated local D1 (.wrangler/state/v3/d1/)
pnpm migrate:apply:staging    # withjosephine-bookings-staging (env.staging in wrangler.jsonc)
pnpm migrate:apply:prod       # withjosephine-bookings (top-level)
```

Always apply against staging before production — staging is the canary.

**List applied migrations:**

```sh
pnpm migrate:list:prod
pnpm migrate:list:staging
pnpm migrate:list:local
```

Wrangler reports applied vs. pending per environment.

### Why a tracking table per environment

Each D1 database has its own `d1_migrations` table. Production and staging stay independent — applying a migration to staging does not change production state, and vice versa. The tracking column is unique on `name`, so re-running `pnpm migrate:apply:*` is safe (already-applied migrations are skipped).

### SQLite gotchas

- `ALTER TABLE … ADD COLUMN` has no `IF NOT EXISTS`. Either: live with the one-shot nature, OR detect-and-skip via `PRAGMA table_info` in a pre-migration check (more code, less common).
- Renaming columns is supported only on SQLite 3.25+ (`ALTER TABLE … RENAME COLUMN`). D1 supports it, but be deliberate — the rename is irreversible without another migration.
- Dropping columns requires a full table rebuild (D1 doesn't support `ALTER TABLE … DROP COLUMN` directly). Plan accordingly.
- `CHECK` constraints are evaluated on insert/update — adding a stricter check to an existing column on a populated table will break inserts for any row that violates. Prefer adding constraints at table-creation time.

---

## Sanity Datasets

The Sanity project (`e8jsb14m`) hosts two datasets:

| Dataset | Purpose | Source of truth |
|---------|---------|-----------------|
| `production` | Live customer-facing content | Edited by Josephine via Studio |
| `staging` | QA mirror for testing schema changes, deploys, and the booking flow before promoting to production | Seeded from `production`; can be re-seeded any time |

Schemas (in `studio/schemas/`) are **code** and apply uniformly across both datasets the moment Studio is deployed. There is no per-dataset schema state. What can drift across datasets is the **data**.

### Re-seeding staging from production

Run any time staging content is stale enough to refresh, or after a schema change adds a new doc type that you want to populate from prod:

```sh
set -a && source .env.local && set +a && pnpm seed:staging
```

The script (`scripts/seed-staging-dataset.ts`):

1. Queries `production` live for `array::unique(*[]._type)`.
2. Filters out `submission` (PII) and any `system.*` types Sanity manages internally.
3. Exports the remaining types + their assets via `sanity dataset export`.
4. Imports into `staging` via `sanity dataset import --replace`.

**Self-updating:** the type list is discovered at runtime, NOT hardcoded. As schemas evolve and new doc types appear in production, the next re-seed picks them up automatically. A vitest assertion (`scripts/seed-staging-dataset.test.ts`) locks this contract — it fails the build if anyone re-introduces a hardcoded `--types reading,siteSettings,...` literal.

**Requirements:**
- The local user must be `sanity login`-ed (the script shells out to `sanity` CLI for export/import).
- The `@sanity/client` query uses anonymous read access; no token needed for the type discovery step.
- Staging will be **wiped and replaced** with the seeded content (`--replace`). Any staging-only content authored in Studio is lost. If you need to preserve staging-only edits, export staging first.

### What does NOT cross datasets

- **Submissions.** The `submission` doc type is excluded from the seed by design. Customer PII (email, name, birth data, photo URLs) lives only in `production`.
- **System docs.** `system.group`, `system.retention`, `system.schema` — auto-managed by Sanity per dataset.

### Content migrations (separate concern)

When a schema change adds a *required field* to an existing doc type, both `production` and `staging` will have docs that lack that field — Studio shows validation errors on those docs. This is a **content migration** problem, not a seed problem. It applies symmetrically to both datasets and is solved with `sanity migration`-style scripts that backfill the new field on existing docs.

The seed script does NOT solve content migrations. If a schema change adds a required field, write a one-shot migration script (see `scripts/migrate-*` for examples) and run it against both `production` and `staging`.

### When to re-seed

| Trigger | Action |
|---------|--------|
| Josephine added significant content in production and staging is stale | `pnpm seed:staging` |
| New doc type added in production via Studio | `pnpm seed:staging` to bring it across |
| Required field added to existing schema | Write content migration; do NOT rely on re-seed |
| Field renamed | Write content migration; do NOT rely on re-seed |
| Localized testing of a Studio change | Use `staging` directly via Studio dataset switcher; do NOT re-seed mid-test (it'll wipe your test docs) |
| Asset re-organization in production | `pnpm seed:staging` (assets travel with the export) |

### What lives only in staging (intentionally)

Staging diverges from production where staging-only QA content makes sense:

- **`reading` doc `stripePaymentLink`** — currently same as production (re-used existing test-mode Payment Links). When apex unparks and production swaps to live-mode Payment Links (see [`POST_LAUNCH_BACKLOG.md`](./POST_LAUNCH_BACKLOG.md) § "Apex unpark — Stripe live-mode flip target"), staging stays on test-mode URLs. Re-seeding from production AFTER that flip would clobber staging's test-mode URLs with live-mode ones — at that point, either drop the `reading` type from the seed, or post-process to revert payment links per env.

---

## Mixpanel Funnels

How to set up and read funnels for the booking flow. This is the quantitative side of analytics; for qualitative ("why did THIS visitor bounce") see Microsoft Clarity (Phase-2 add, see [`POST_LAUNCH_BACKLOG.md`](./POST_LAUNCH_BACKLOG.md)).

### What a funnel is

A funnel is an ordered sequence of events Mixpanel watches per visitor. For each visitor (identified by `distinct_id`), Mixpanel checks: did they fire event A → then event B → then event C, in that order, within a time window? The percentage who completed each step is your **conversion rate**; the drop-off between steps tells you where the flow leaks.

Two key behaviors that matter for our flow:

- **Order matters.** Funnels are ordered. `cta_click_intake` AFTER `intake_page_view` doesn't count for a funnel that defines them in the opposite order.
- **Time window matters.** Default conversion window is 30 days, but for our booking flow (designed to complete in one session), set it to 1 hour or even 30 minutes — that's the realistic completion window. Longer windows include returning visitors which inflates conversion artificially.

### The three funnels worth setting up

**1. Top-of-funnel: discovery → intake start**

```
entry_page_view  →  cta_click_intake  →  intake_page_view
```

Tells you how many visitors who land on a reading entry page click "Book this Reading", and how many of those reach the intake form. Healthy ratios:

- ~30–60% click-through from entry page to letter page (verso-cta)
- ~70–95% click-through from letter page to intake (drop-cap)
- A drop below ~20% on either step means the entry/letter copy isn't selling, or the CTA placement is wrong, or there's a UI bug.

Setup: Reports → Funnels → "+ Build new funnel" → steps `entry_page_view`, `cta_click_intake`, `intake_page_view`; conversion window **1 hour**; filter `environment = production`; optionally segment by `reading_id`.

**2. Mid-funnel: intake completion**

```
intake_page_view  →  intake_page_next_click (validation_pass=true)  →  intake_submit_click  →  intake_submit_success
```

Drop-offs to watch:

- High drop on `intake_page_next_click` with `validation_pass=false` → users hitting validation errors. Cross-reference `intake_field_first_focus` events for the failing page — fields that get focused but the user bounces are likely the problem fields.
- High drop on `intake_submit_click` → users got to the end but didn't click Submit. Often a consent-checkbox or `nonRefundableNotice` hesitation issue.
- High drop on `intake_submit_success` (after click) → backend validation rejecting. Cross-reference `intake_submit_error` events by `error_code`.

Setup: conversion window **30 minutes**, step filter on `intake_page_next_click`: `validation_pass = true`, segment by `page_number`.

**3. End-to-end: discovery → paid booking**

```
entry_page_view  →  intake_submit_success  →  stripe_redirect  →  payment_success
```

The only metric that actually matters commercially — what % of visitors to a reading page end up paying.

Setup: conversion window **1 hour**, filter `environment = production`, segment by `reading_id` (pricing/value-prop differences will show up here).

### Filters and segments

- `environment = production` — exclude dev/preview/workers-dev/local events.
- `reading_id = <slug>` — slice by which reading the visitor was pursuing. Reading-specific UX (form fields, pricing, copy) varies meaningfully.
- `position` (on `cta_click_intake`) — `verso-cta` (entry page) vs `drop-cap` (letter page) — tells you which CTA earns the click.

### Useful cohorts

- **Form abandoners** — visitors who fired `intake_page_view` for at least one page but never `intake_submit_success`. Drill into why via Clarity replays.
- **High-effort completers** — visitors with > 2 `intake_page_back_click` events who still completed. Suggests confusing flow that succeeded despite friction.
- **Failed-submit retries** — visitors with at least one `intake_submit_error` followed by a successful `intake_submit_success` in the same session. Tells you which error codes are recoverable.

### Reading the numbers correctly

Two anti-patterns to avoid:

1. **Don't read the absolute numbers at low traffic.** With 10 visitors a week, "33% conversion" is statistically meaningless. Wait for at least 100 visitors per cohort before drawing conclusions. Until then, watch trends and use Clarity for qualitative insight.
2. **Don't conflate distinct visitors with distinct sessions.** A single visitor who bounces, returns next day, and books counts as ONE distinct_id with multiple events. If you want session-scoped analysis, filter by a session start event or use Mixpanel's Session feature.

### Operating cadence

- **Daily** (during soft-launch): glance at Live View — confirms events are still flowing, catches CSP / SDK breakage early.
- **Weekly:** review the 3 funnels above. Note any week-over-week drop > 10%.
- **Per-reading-edit:** after Josephine changes a reading description in Studio, watch the conversion rate for that reading_id over the following week. Copy changes have measurable effects.
- **Per-deploy:** spot-check Live View after any PR that touches the booking flow.

### When events stop arriving

If Live View shows nothing despite traffic, the troubleshooting order (learned during PR-F1):

1. **Browser DNT setting?** Check console for "This browser has Do Not Track enabled" warning. Should never appear with the `ignore_dnt: true` config.
2. **Consent declined?** Check localStorage for `josephine.consent = "declined"`.
3. **CSP block?** Network tab → check for blocked POST to `api-js.mixpanel.com`. If yes, check `connect-src` in `src/middleware.ts`.
4. **Non-prod gate?** If testing on preview/local, confirm `NEXT_PUBLIC_TRACK_NON_PROD=1` is set.
5. **Token missing?** Search bundle sources for the project token prefix. If absent, check `.github/workflows/ci.yml` env block forwarding.

When in doubt, set `debug: true` in `mixpanel.init()` config (`src/lib/analytics/client.ts`) — the SDK will dump everything to console.
