# Post-Launch Backlog

Items deferred from the booking-form rebuild pre-push reviews (code review
2026-04-30, security review 2026-04-30). None of these block the initial
push; revisit after launch traffic stabilises.

Each item: where it came from + why it was deferred + a one-line action.

---

## Security

### S-3. WAF rate-limit rules
- **Source:** Security review.
- **What:** No per-IP throttling on `/api/booking`, `/api/contact`, or
  `/api/booking/upload-url`. Worst case is resource cost (Resend quota,
  R2 storage), not data theft.
- **Action:** Cloudflare dashboard → Security → WAF → Rate limiting rules.
  10 req/min/IP per route is generous for legitimate use. No code change.
- **Folds into:** Punch 6 (R2 CORS) — both are CF dashboard tasks.

### F-10. Verify Resend domain before first prod send
- **Source:** Security review.
- **What:** `src/lib/resend.ts` `FROM_ADDRESS` is `Josephine <hello@withjosephine.com>`.
  If the domain isn't verified in Resend (DKIM/SPF/DMARC published in CF DNS),
  every send returns 500.
- **Action:** Resend dashboard → Domains → confirm `withjosephine.com` verified.
  Send a test from the dashboard before opening the form to traffic.

### F-11. Constant-time comparison in cron-auth
- **Source:** Security review (FYI severity).
- **What:** `src/lib/booking/cron-auth.ts:16` does `===` string compare on the
  bearer token. Theoretically allows timing attacks against `CRON_SECRET`.
  Practical risk on CF Workers is near-zero given network jitter.
- **Action:** Replace with a byte-loop or use the same HMAC pattern as listenToken.

### S-5. Nonce-based CSP migration
- **Source:** Security review.
- **What:** CSP currently allows `script-src 'unsafe-inline'` because Next.js
  App Router uses inline scripts for hydration data. This is an XSS
  amplifier. No known DOM-XSS sinks in current code (React handles
  escaping; user input is `escapeHtml`'d in email templates), but the
  defensive layer is missing.
- **Action:** Migrate to nonce-based CSP via Next.js middleware. The only
  non-Next inline script is the Cloudflare Insights beacon (already
  explicitly allowed by host).

### Build-time assertion that prod never carries the Turnstile bypass
- **Source:** Code review (nice-to-fix), Security review F-2 (nice-to-have).
- **What:** Three `process.env.NODE_ENV !== "production"` guards short-circuit
  to false in prod builds — verified empirically in the worker bundle.
  But if a deploy ever sets `NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS=1`, that
  variant is inlined at build time and would be present (still dead code
  due to the AND with NODE_ENV, but worth a belt-and-braces check).
- **Action:** `next.config.mjs` or pretest script that throws when
  `NODE_ENV === "production"` and any bypass flag is truthy.

---

## Infrastructure

### CI env block — remaining missing NEXT_PUBLIC_* vars
- **Source:** Upload-url 400 investigation 2026-04-30. `NEXT_PUBLIC_*` vars are inlined at build time, so any var not in `.github/workflows/ci.yml` `env:` block is *missing in prod regardless of the GH variable being set*.
- **Fixed 2026-04-30 in same PR as upload-url:** added `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `NEXT_PUBLIC_SANITY_STUDIO_URL` (the latter was already a GH var since 2026-04-15 but never forwarded).
- **Still open:**
  - `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` — read by `src/app/layout.tsx:21` for Cloudflare Web Analytics. Currently absent → analytics never initializes in prod. Add to `vars` + `ci.yml` env block.
  - `NEXT_PUBLIC_WEB3FORMS_KEY` is set as a SECRET, but `NEXT_PUBLIC_*` should be a (non-secret) variable; also web3forms was replaced with Resend per project decisions, so this is dead. Remove the leftover GH secret.
- **Action:** when adding any new `NEXT_PUBLIC_*` env var, add it to BOTH `gh variable set` AND `ci.yml` env block in the same change.

### OpenNext `scheduled` handler dispatch
- **Source:** PR-E shipping (`5abec07`) + every cron route added since.
- **What:** `wrangler.jsonc` configures cron schedules but OpenNext does not
  expose a `scheduled` handler that translates them into fetches. Today the
  reconcile + cleanup + day-2 + day-7 + day-7-deliver routes are triggered
  externally via `Authorization: Bearer ${CRON_SECRET}` curl. The schedules
  in wrangler are aspirational.
- **Action:** Either upstream a `scheduled` handler to OpenNext, write a
  small custom one in the Worker entry, or set up an external scheduler
  (GitHub Actions cron, CF Worker triggering itself, etc.).

### Resend template IDs
- **Source:** PR-E spec.
- **What:** Email bodies are inlined HTML strings in `src/lib/resend.ts`.
  SPEC §13 mentioned using Resend template IDs (`template_order_confirmation`
  etc.) for editor-friendly copy iteration.
- **Action:** Provision Resend templates, swap `client.emails.send({ html })`
  to `client.emails.send({ react: ... })` or the templates API.

### `/api/booking/upload-url` architectural alternative
- **Source:** Code review (S-4 long-term fix).
- **What:** Current design: Turnstile-gated upload-url + R2 ContentLength
  signing + orphan-reaper cron. The "right" fix the reviewer suggested
  long-term is to gate uploads on an already-validated submission ID
  (i.e. `/api/booking/init` → `pendingId`, then upload-url requires it).
  Today's three layers cover the abuse surface adequately.
- **Action:** Revisit if upload abuse becomes a real signal.

---

## Code quality (nice-to-fix)

All from the code review of the 38-commit pre-cleanup state. None are
load-bearing.

- **TrustLine component unused.** `src/components/IntakeForm/TrustLine.tsx`
  is exported, tested, and never rendered. Either wire it in (final-page
  consent block) or delete it + its test + the `consentBlock.trustLine`
  Sanity projection.
- **`clientReferenceId` always equals `_id`.** `src/app/api/booking/route.ts`
  sets both to the same UUID. Either drop the field from schema or document
  why it exists separately from `_id`.
- **`void chipTick` re-render trigger.** `src/components/IntakeForm/IntakeForm.tsx:195-206`
  uses `void chipTick;` to force a 30s re-render on the saved-time chip.
  Cleaner via `useMemo([..., chipTick])` or extracting a `<SavedIndicator />`
  child component.
- **`legal_full_name` in `SWAP_PRESERVED_KEYS`.** Kept as a fallback for
  pre-migration localStorage drafts. Drafts have a 30-day TTL — drop after
  2026-05-29 with confidence.
- **`letter/page.tsx` IIFE simplification.** The fallback IIFE at lines
  51-58 reduces to `getReadingById(readingId) ? { slug: readingId } : null`.
- **3× `fetchBookingForm` per `/book` flow.** Each of `/book/[id]`,
  `/letter`, `/intake` calls it independently. `cache()`-wrapped per request,
  so 3 separate Worker invocations = 3 fetches. Acceptable today; if Sanity
  CDN ever throttles, batch the fetch upstream.

---

## UX

### Manual end-to-end Stripe round-trip
- **Source:** Punch 2 — partially covered by smoke agent (stopped before
  Stripe redirect).
- **What:** Click through Soul Blueprint / Birth Chart / Akashic Record
  intake all the way through Stripe sandbox checkout, confirm the redirect
  to `/thank-you/[readingId]?sessionId=cs_test_...`, confirm webhook fires
  and marks submission paid in Sanity.
- **Action:** Manual smoke against a Stripe test card before opening real
  traffic. Required after R2 CORS is configured (Punch 6) since the photo
  upload will be exercised.

---

## Persistence (ADR-001 follow-ups)

D1 is the source of truth; Sanity is a one-way mirror. The mirror is
fire-and-forget — drift can happen on Sanity outages.

### D1 → Sanity reconcile cron
- **Source:** ADR-001.
- **What:** Periodic diff between D1 (truth) and Sanity (mirror) that
  pushes any rows Sanity is missing or stale on. Belt-and-braces against
  fire-and-forget mirror failures.
- **Action:** Add `/api/cron/reconcile-mirror` route. Walk D1, fetch the
  matching Sanity doc by `_id`, replay the create/patch if missing or
  divergent on key fields (`status`, `paidAt`, `deliveredAt`, last
  `emailsFired` entry).

### Studio admin UX for `deliveredAt`
- **Source:** ADR-001 acceptance.
- **What:** Today there's no path for Josephine to mark a submission
  delivered without running SQL. The CLI stopgap is
  `scripts/mark-delivered.mts`. Properly: a small admin page at
  `/admin/submissions` in the Next.js app, basic-auth gated, that lists
  paid-but-undelivered submissions and lets her paste voice/PDF URLs +
  click "mark delivered".
- **Action:** Phase 1.5 task. Probably ~1 weekend.

### Static fallback prices in `src/data/readings.ts` may drift from Sanity
- **Source:** Smoke test BUG-3 + post-discussion (Sanity now $129 for Soul Blueprint, fallback file still says $179).
- **What:** `READINGS` fallback array in `src/data/readings.ts` only renders when the Sanity fetch fails. Today Sanity's Soul Blueprint is $129 but the fallback says $179, so a Sanity outage shows the wrong price. Same risk for any future price change Josephine makes in Studio.
- **Action:** Either (a) periodically sync `READINGS` from Sanity (a script), (b) drop the fallback prices entirely and show a "reading temporarily unavailable" state on Sanity outage, or (c) bake the prices into the build via a prebuild script. (c) is the cleanest IMO — same pattern as `pnpm generate-tokens`.

### Apex + preview 500 (`InvariantError: Expected workStore to be initialized`) — FIXED + DEPLOYED 2026-04-30 (PR #44)

**Root cause:** Next 16.2.x's `outputFileTracingExcludes` interacts badly with `@opennextjs/cloudflare` 1.19.4's bundler under workerd. Excluding even harmless files (e.g. the `capsize-font-metrics.json` static asset, the unused Turbopack runtime) causes Next's per-request `workAsyncStorage.run` wrapper to set the store on a different `AsyncLocalStorage` instance from the one Next's render code reads via `getStore()` — producing the InvariantError on every server render. Static assets and pure API handlers were unaffected because they don't read workStore.

**Fix (commit pending):** Removed the entire `outputFileTracingExcludes` block from `next.config.ts`. Local repro (`pnpm cf:build && pnpm cf:dev`) returns HTTP 200 with full HTML on `/`, `/book/soul-blueprint`, and other dynamic routes; zero `InvariantError` in `wrangler tail`. Three quality gates green: typecheck, lint, 506/506 tests.

**Bisect evidence (this session, in order):** All performed against the local `cf:dev` harness from PR #44.
1. Gate `<SanityLive />` behind `{isDraftMode && ...}` — **NOT FIXED**, 500 + 10× InvariantError.
2. Lazy-init `defineLive(...)` (move out of module top-level) — **NOT FIXED**, 500 + 8× InvariantError.
3. Remove `await draftMode()` from RootLayout — **NOT FIXED**, 500 + 8× InvariantError.
4. Remove ALL `outputFileTracingExcludes` — **FIXED**, 200 + 0 errors.
5. Restore non-react-dom excludes (5 of 8) — back to 500.
6. Restore only capsize + turbo excludes (2 of 8) — still 500.
7. → Empty excludes block is the only working state.

**Bundle-size implications (FOR FUTURE OPTIMIZATION — read carefully before re-adding excludes):**

The original excludes were strips intended to keep the worker under Cloudflare's 3 MiB free-tier compressed limit. We're now on the paid plan (10 MiB limit) so the budget is no longer pressing. Empirical handler.mjs sizes observed during this bisect:
- All 8 excludes: 13231 KiB
- Two excludes (capsize + turbo): 13231 KiB
- Zero excludes: **12697 KiB** — counterintuitively *smaller* than with excludes.

Why excludes made the bundle bigger AND broke workStore: best current hypothesis is that when Next sees those paths excluded from tracing, it pulls in alternate (larger, polyfilled) fallback code paths that bundle a *separate* AsyncLocalStorage instance — and those paths are what end up in the OpenNext output, not the strips. So you pay a size penalty AND break workStore. This is upstream behavior, not something we can fix in our config.

**Items deferred from this fix:**
- **Cleaner narrowed exclude set.** I never bisected to a single load-bearing exclude — time-budget pressure and "fix it locally first" priority forced me to drop them all. Future work: bisect one-at-a-time (capsize, turbo, compression, vercel/og, server/og, react-dom-legacy, react-dom-browser, react-dom-bun) to find which specific entry triggers the duplication, then keep the safe ones. Ideally upstream the finding to OpenNext as an issue.
- **OpenNext upstream issue.** Worth filing once we have a minimal repro: `outputFileTracingExcludes` causes workStore duplication on Next 16.2.x via OpenNext 1.19.4 / workerd. Reference Next discussion #86978 (sibling symptom) and OpenNext #1157 (different message, same Next-16.2-on-Workers class).
- **Worker bundle compressed-size audit post-deploy.** Need to verify the 10 MiB limit isn't crossed on the next deploy; if it is, narrowing the excludes (per above) is the lever — the tradeoff is reintroducing the bug class.

**Pre-fix attempts (2026-04-30, deployed but didn't move it):**
- **PR #42** — restored `compiled/edge-runtime/**` + `compiled/@edge-runtime/**` NFT excludes (commit `d005f74` had stripped them on the wrong premise that workerd is "Node.js runtime"). Wrong cause, fix kept anyway.
- **PR #43** — bumped `@opennextjs/cloudflare` 1.19.1 → 1.19.4, Next 16.2.3 → 16.2.4, wrangler 4.83.0 → 4.86.0. Wrong cause; bundle grew 2.58 → 3.91 MiB compressed.
- **Workers paid plan** ($5/mo, 10 MiB compressed limit) upgraded — paid for, bundle no longer the constraint.

### Re-enable error tracking via `@sentry/cloudflare`
- **Source:** Worker bundle size analysis 2026-04-30. `@sentry/nextjs` removed because it bloated the worker bundle from ~11 MiB to ~16 MiB on CI (where `SENTRY_AUTH_TOKEN` flips Sentry into full instrumentation mode). With Workers paid plan now active (10 MiB compressed limit, currently using ~4 MiB), the headroom exists for a Sentry re-add — but the lighter `@sentry/cloudflare` package is still preferable.
- **What:** `@sentry/nextjs` package removed; `withSentryConfig` wrapper dropped from `next.config.ts`; `src/instrumentation.ts` is now a no-op stub; `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts` deleted; `src/app/error.tsx` and `src/app/global-error.tsx` switched from `Sentry.captureException` to `console.error`.
- **Action:** Add `@sentry/cloudflare` (workerd-targeted, much smaller). Until then, error visibility is whatever lands in `wrangler tail` and `console.error` lines.

### D1 live-write smoke test (immediately post-deploy)
- **Source:** ADR-001 acceptance.
- **What:** First post-deploy verification that `/api/booking` actually
  writes to prod D1 (not just our unit tests against in-memory SQLite).
  Submit one real booking via the form (test data, junk email), confirm
  the row appears in `wrangler d1 execute --command "SELECT * FROM submissions" --remote`,
  then clean it up. Also confirm Sanity mirror landed via Studio.
- **Action:** Run within an hour of the first post-merge deploy. If
  drift, check Worker logs (`wrangler tail`) for D1-HTTP errors.

### Demote Sanity submission schema to read-only proxy
- **Source:** ADR-001 future state.
- **What:** Currently Studio shows submissions via the standard editable
  document type. Edits get clobbered by mirror sync. Replace with a
  custom Studio document type that fetches via API rather than holding
  its own copy.
- **Action:** Defer until ops actually use Studio for submissions.

## Phase 1.5 (planned, not deferred)

These were always scoped out of Phase 1 by the booking-flow build PRD.

- **Day +14 follow-up email.** SPEC §13.E. Needs `/api/cron/email-day-14`
  + helper + verbatim copy from §13.E.
- **Mixpanel analytics.** PR-F — 17 events from SPEC §15.

---

## How to use this doc

When an item lands, delete it from this file. When a new "we'll defer
this" decision happens during a session, add it here so it doesn't drift
out of memory in a commit message.
