# ADR-001: Submission persistence resilience

**Status:** Accepted (2026-04-30) — Option 3-lite (D1 source of truth + Sanity one-way mirror)
**Date:** 2026-04-30
**Context:** Pre-launch, branch `feat/booking-form-rebuild-phase1`.

## Decision

After review, the chosen architecture is a hybrid of Option 1 and Option 3 from the original analysis below:

- **D1 (SQLite-on-CF) is the sole source of truth** for booking submissions. Free tier; we stay within 5GB / 5M rows / 25B reads/mo / 100k writes/day for the foreseeable future.
- **Local dev + tests** use `better-sqlite3` against `.local/booking.db` (dev) or `:memory:` (tests). Same SQL works on both — the SQLite-on-CF dialect IS SQLite. Driver selected via `BOOKING_DB_DRIVER` env var.
- **Sanity holds a one-way mirror** so Studio can browse submissions read-only. Mirror writes are fire-and-forget — they never block the user. If Sanity is missing data, a future reconcile cron will diff D1 vs Sanity and push the missing rows.
- **No live data → no backfill** required. Pre-push.

This honours Max's "one source of truth" requirement (every write hits D1; Sanity is downstream) while keeping Studio useful for editorial visibility.

## Implementation shape

| File | Role |
|---|---|
| `migrations/0001_submissions.sql` | Initial schema. Run once via `pnpm exec wrangler d1 execute`. |
| `src/lib/booking/persistence/sqlClient.ts` | Driver-agnostic `dbQuery` / `dbExec`. Selects the D1 binding or local SQLite via `BOOKING_DB_DRIVER`. |
| `src/lib/booking/persistence/d1BindingClient.ts` | D1 client backed by the `withjosephine_bookings` workerd binding (declared in `wrangler.jsonc`). Used when `BOOKING_DB_DRIVER=d1`. |
| `src/lib/booking/persistence/sqliteClient.ts` | better-sqlite3 wrapper. Auto-applies migrations on first connection. Used in `next dev`, vitest. |
| `src/lib/booking/persistence/repository.ts` | Typed CRUD against the abstraction. Single source of truth for submissions. |
| `src/lib/booking/persistence/sanityMirror.ts` | One-way mirror writes to Sanity. Fire-and-forget; failures logged. |
| `src/lib/booking/submissions.ts` | High-level API. Reads from repository; writes call repository THEN fire-and-forget mirror. |

## Open follow-ups (BACKLOG.md)

- **Sanity → D1 reconcile cron.** Periodic diff that catches mirror failures.
- **Studio admin UX for `deliveredAt`.** Today there's no path for Josephine to mark a submission delivered without touching the SQL directly. CLI script `scripts/mark-delivered.mts` ships as a stopgap; a small admin page in the Next.js app is the proper Phase 1.5 fix.
- **Studio submission schema.** Currently retained for the mirror; eventually demote to a custom Studio document type that proxies reads via API.

---

## Original analysis (kept for context)

## Context

Today every booking submission is persisted only to Sanity. The full write surface:

| Operation | Where | Failure mode |
|---|---|---|
| Create submission (`status: "pending"`) | `/api/booking` POST | User sees 500 mid-checkout, can't reach Stripe |
| Mark paid (`status`, `paidAt`, `stripeEventId`, `stripeSessionId`) | `/api/stripe/webhook` `applyPaidEvent` | Stripe retries webhook; reconcile cron picks up later |
| Mark expired | webhook `checkout.session.expired` + cleanup cron | Retried by next cron interval |
| Delete (after retention) | cleanup cron | Retried |
| Append `emailsFired` entry | webhook + 3 email crons | Idempotent — retry safe |
| Set `deliveredAt` (Studio editor action) | Sanity Studio UI | Manual; retry by re-saving |

Read paths: `findSubmissionById`, `listSubmissionsByStatusOlderThan`, `listPaidSubmissionsForEmail`, `listAllReferencedPhotoKeys`. All hit Sanity.

Max's stated concern (`MEMORY/project_persistence_resilience_followup.md`):
1. **Availability:** Sanity outage at submit time blocks the user → Stripe handoff fails.
2. **Vendor concentration:** Future migration off Sanity means moving live submission data.

Sanity itself: free tier, GROQ + JSON document store, ~99.9% uptime SLA on paid tiers, free tier has no SLA. Editorial content (readings, FAQs, legal pages, theme) genuinely belongs in a CMS — that's not in scope for this decision. The question is only about the `submission` doc type.

## Threat model

What we're actually defending against:

1. **Sanity API outage during submit.** Most painful. Ten minutes of downtime during peak traffic = lost bookings. Sanity free tier has no SLA; outages happen.
2. **Sanity rate limiting.** Free tier has API quotas. A traffic spike (e.g. TikTok hit) could 429.
3. **Future migration cost.** If Max wants to move off Sanity in 12 months, every paid submission must be exported via API and re-imported into the new store. With 1k+ records and image-key references, this is a project.
4. **Sanity data loss / corruption.** Vendor-side incident. Backups exist but recovery procedure is theirs, not ours.
5. **Sanity write-token compromise.** Editor-scoped token can read+write any document. If leaked, attacker can mutate live submissions.

What we're explicitly NOT defending against:
- Stripe outage — out of scope, payment provider risk lives with Stripe.
- R2 outage — photos are non-critical (the reading itself doesn't depend on them being readable).
- CF Worker outage — kills everything; nothing we can do.

## Three options

### Option 1: Dual-write to a relational DB (recommended)

Submissions are created in BOTH Sanity AND a relational DB. Either store can serve the read path; primary read stays Sanity until further notice.

**DB choice:** Cloudflare D1 (SQLite-on-CF). Free tier: 5GB storage, 5M rows, 25B reads/month. Native binding to Workers. Same vendor as everything else, single deploy story. (Alternatives: Turso — SQLite over libSQL, free, has multi-region; Postgres on Neon/Supabase — bigger ecosystem but new vendor.)

**Schema:** ~12 columns mapping `submission` doc:
```sql
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,           -- Sanity _id
  email TEXT NOT NULL,
  status TEXT NOT NULL,          -- pending|paid|expired
  reading_slug TEXT NOT NULL,
  responses_json TEXT NOT NULL,  -- field array as JSON
  consent_label TEXT NOT NULL,
  photo_r2_key TEXT,
  stripe_event_id TEXT,
  stripe_session_id TEXT,
  client_reference_id TEXT,
  created_at TEXT NOT NULL,
  paid_at TEXT,
  expired_at TEXT,
  delivered_at TEXT,
  voice_note_url TEXT,
  pdf_url TEXT,
  emails_fired_json TEXT NOT NULL DEFAULT '[]',
  abandonment_recovery_fired_at TEXT
);
CREATE INDEX submissions_status_paid_at ON submissions(status, paid_at);
CREATE INDEX submissions_status_created_at ON submissions(status, created_at);
```

**Write path:**
1. POST `/api/booking`: create in D1 first (always-online by virtue of CF binding). Then create in Sanity. If Sanity fails, log + queue retry, but the user already has a submission in D1 → proceed to Stripe.
2. Webhook + crons: update both stores in a `Promise.allSettled`; log mismatches.

**Read path:** Stays Sanity-primary for now. D1 is the safety net. Future flip to D1-primary is one PR.

**Pros:**
- Closes vendor concentration: data exists in two unrelated systems.
- Future migration off Sanity is trivial — D1 is the source of truth on day 1, just need to redirect reads.
- Studio editorial workflow unchanged.
- D1 is free + native to existing CF stack.

**Cons:**
- Two write paths → consistency drift if one fails. Mitigated by reconciliation: a periodic `pnpm tsx scripts/reconcile-submissions.mts` that diffs D1 vs Sanity.
- Schema duplication: Sanity submission schema is the editor view, SQL schema is the row view. Drift requires discipline.
- Extra moving piece in dev (D1 local SQLite via wrangler — needs `pnpm exec wrangler d1` setup).

**Effort estimate:** 1 weekend (8–12h)
- D1 binding + schema migration
- Repository layer (`src/lib/booking/persistence/d1.ts`)
- Update `submissions.ts` to dual-write (8 call sites map cleanly)
- Update webhook + 5 cron routes
- Update `/api/booking` route
- Tests for the new repository
- Migration script to backfill D1 from existing Sanity data

### Option 2: Queue-buffered submission

`/api/booking` POST writes to a Cloudflare Queue and returns 202 immediately. A queue consumer Worker writes to Sanity asynchronously.

**Pros:**
- User flow unblocked even during Sanity outage — submit returns fast, Stripe handoff is immediate.
- Backpressure handled by queue durability.

**Cons:**
- **Doesn't address vendor concentration.** Data still ends up only in Sanity.
- Eventual consistency: submission appears in Studio after seconds-to-minutes. Webhook firing before submission lands creates lookup races.
- Queue durability is a CF guarantee, not Max-controlled.
- Adds a new component without solving the migration concern.

**Effort estimate:** 1 weekend (8–12h)

**Verdict:** Solves availability but not vendor lock-in. Max's primary concern is the latter, so this option is misaligned.

### Option 3: DB authoritative, Sanity demoted to mirror

D1 (or Postgres) is the source of truth. Every Sanity update happens via a one-way mirror after DB commit. Studio shows a read-only-ish dashboard.

**Pros:**
- Cleanest long-term design.
- Owner controls source of truth.
- Future migration is trivial (DB IS the data).

**Cons:**
- **Biggest surgery.** Every read path remaps. Studio dashboard workflows that depend on real-time data break.
- Sanity becomes a denormalized cache; consistency bugs show up in Studio.
- Effort doesn't pay back unless we're already migrating off Sanity.

**Effort estimate:** 2 weekends (16–24h)

**Verdict:** Right design for "we're definitely leaving Sanity in 6 months." Premature today.

## Recommendation

**Option 1, with D1 as the DB.** Closes both of Max's concerns (availability via D1 always-online; vendor concentration via dual-store) for the smallest scope. Leaves Option 3 open as a future Phase 2 ("flip read primary to D1") without re-architecting now.

Sequence:
1. Add D1 binding + schema migration.
2. Build `src/lib/booking/persistence/d1.ts` repository + tests.
3. Update `submissions.ts` to dual-write, with `Promise.allSettled` so neither write blocks the other. Sanity-write failures are logged; D1 is now the safety net.
4. Backfill script: read all current `submission` docs from Sanity, insert into D1.
5. Reconciliation cron (extends existing `/api/cron/reconcile`): diff D1 vs Sanity, flag drift.

After this lands and runs for a month with no drift signals, a follow-up PR can flip the read primary to D1, demoting Sanity to one-way mirror.

## Open questions for Max

1. **D1 vs Turso vs Postgres.** Recommendation is D1 for stack continuity. Want the alternatives spelled out?
2. **Pre-push or post-push?** The original memory deferred this to post-launch. Building it pre-push delays push by ~weekend; post-push needs a backfill script for whatever submissions arrive in the meantime.
3. **Studio dashboard expectations.** Does Josephine read submission data live in Studio today, or is it ops-only?

## What lands if approved

A new sibling commit set:
- `wrangler.jsonc` — D1 binding `BOOKING_DB`
- `migrations/0001_submissions.sql` — initial schema
- `src/lib/booking/persistence/d1.ts` + tests
- `src/lib/booking/submissions.ts` — dual-write integration
- `scripts/backfill-submissions-to-d1.mts` — one-shot
- `docs/BACKLOG.md` — entry to flip read primary to D1 after observation period
- `SECRETS_CHECKLIST.md` — D1 setup steps
