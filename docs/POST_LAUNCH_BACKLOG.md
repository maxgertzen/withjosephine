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
