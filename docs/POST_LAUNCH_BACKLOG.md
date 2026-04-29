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

### BUG-2 — confirm floating label in a real browser
- **Source:** Smoke test (false-positive flag).
- **What:** Headless smoke reported `transform: none` on filled-state float
  label. Code analysis says this IS the floated state — the CSS floats via
  `top-1.5` + `text-[0.7rem]`, not via transform. `placeholder=" "` and
  `peer` are correctly set on the input.
- **Action:** One eyeball check in a real browser at 375px (focus email,
  type, blur, see the label snap to top). No code expected.

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

### Re-enable error tracking (Sentry was removed for bundle size)
- **Source:** Worker bundle size analysis 2026-04-30. `@sentry/nextjs` and the surrounding `withSentryConfig` wrapper bloated the worker bundle from ~11 MiB to ~16 MiB on CI (where `SENTRY_AUTH_TOKEN` flips Sentry into full instrumentation mode), pushing it past the 3 MiB Cloudflare Workers free-tier compressed limit.
- **What:** `@sentry/nextjs` package removed; `withSentryConfig` wrapper dropped from `next.config.ts`; `src/instrumentation.ts` is now a no-op stub; `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts` deleted; `src/app/error.tsx` and `src/app/global-error.tsx` switched from `Sentry.captureException` to `console.error`.
- **Action:** When ready, swap to `@sentry/cloudflare` (workerd-targeted, much smaller) OR upgrade Workers to the paid plan ($5/mo for the 10 MiB limit, gives all of `@sentry/nextjs` headroom). Until then, error visibility is whatever lands in `wrangler tail` and `console.error` lines.

### Replace `@aws-sdk/client-s3` with `aws4fetch` to shrink the worker bundle
- **Source:** Bundle-size analysis 2026-04-30. Worker compressed at 2.83 MiB, just under the 3 MiB free-tier limit. Top non-Next contributor is `@aws-sdk/client-s3` + the `@smithy/*` peer deps it pulls in.
- **What:** R2 access only needs three S3 operations (`PutObject` presign, `DeleteObject`, `ListObjectsV2`). The full `@aws-sdk/client-s3` package ships ~100 operations + middleware we don't use. `aws4fetch` is ~10 KB minified and signs SigV4 fetch calls; it covers the same surface.
- **Action:** Replace `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` with `aws4fetch` in `src/lib/r2.ts`. Update `r2.test.ts` mocks. Estimated saving: 1–2 MiB compressed → real headroom against the 3 MiB limit.

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
