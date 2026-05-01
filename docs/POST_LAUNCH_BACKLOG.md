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

### Microsoft Clarity (session replay) — pair with Mixpanel
- **Source:** Mixpanel + Clarity tooling discussion 2026-05-02. Mixpanel
  answers "what % drop off at intake page 3"; Clarity answers "why did
  THIS visitor bounce on intake page 3" via DOM-based session replays,
  heatmaps, and rage-click detection. At soft-launch volumes (single
  digits of bookings/week), the qualitative signal is more useful than
  the quantitative one — but the right answer is to pair them, not
  replace.
- **Why Clarity vs Fullstory/Hotjar:** Free **forever**, unlimited
  sessions, **auto-masks form inputs by default** (DOB, names, photos
  redacted out of the box), better privacy posture than Fullstory.
  Microsoft sub-processor — already common.
- **Action:**
  1. Sign up at clarity.microsoft.com → create project → get tracking ID.
  2. Add a `<ClarityScript>` client component mounted from
     `<AnalyticsBootstrap>` so it inherits the same geo-conditional
     consent gate + non-prod opt-in. Tracking ID via
     `NEXT_PUBLIC_CLARITY_PROJECT_ID` (3-place CI discipline as usual).
  3. Update privacy policy to add Clarity as a sub-processor (session
     replay category, data class explicitly noted) — Microsoft (US)
     under DPF/SCCs, same template as the Mixpanel patch.
  4. Verify masking is working in Clarity dashboard before pointing
     traffic at it: confirm DOB / name / photo fields show as redacted
     blocks, not actual content.
- **Why deferred:** Phase-2 add. Mixpanel ships now; Clarity follows
  once the funnel data starts filling in and we know what to look at
  qualitatively. Also good moment to do the privacy-policy patch
  alongside the Web3Forms→Resend cleanup.

### PR-F1 simplify-pass deferrals (code-quality follow-ups)
**Source:** Code-quality + efficiency review on `feat/mixpanel-pr-f1` 2026-05-02. Issues identified, judged not blocking the PR, captured here so they don't drift out of view.

- **`process.env.*` reads in IntakeForm render path.** `IntakeForm.tsx:264–268` reads `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `NODE_ENV`, and `NEXT_PUBLIC_BOOKING_TURNSTILE_BYPASS` on every render. Pre-existing pattern (not new in PR-F1) but worth hoisting to module scope or a single `useMemo`. Trivial impact unless this component re-renders many times per page (it doesn't today).

- **AnalyticsBootstrap `consentRequired` effect re-run guard.** `AnalyticsBootstrap.tsx:48` — useEffect dep array is `[consentRequired]`. Today the prop is stable per request (computed once from server headers in the layout) so the effect runs once. If a future change ever makes `consentRequired` recompute on parent re-render, the effect would re-read localStorage and re-call `initAnalytics()` (idempotent today via `bootstrapped` guard, but fragile). Add an explicit "did we already run" ref-guard if the parent's render shape changes.

- **`setState`-in-effect lint suppression in AnalyticsBootstrap.** Line ~45 has an `eslint-disable-next-line react-hooks/set-state-in-effect`. The justifying comment is correct (localStorage is mount-only) but the cleaner long-term fix is `useSyncExternalStore` for the consent state read. Refactor when the consent flow gains complexity (e.g. when we add the cookie banner copy from Sanity, or per-purpose consent granularity).

- **`window.location.host` re-read in `initAnalytics()`.** `client.ts:42` — read inside the function. Today it's called once due to the `bootstrapped` guard, so no real cost. If init ever needs to support re-init (e.g. switching projects after consent change), hoist to module scope.

- **`migrate-privacy-mixpanel.ts` re-fetches on no-op idempotency check.** The script fetches the entire doc, then checks `body.some(_key === MIXPANEL_BLOCK_KEY)` to short-circuit. The fetch happens regardless. Acceptable today (script runs maybe 1–2 times in its lifetime); if reused as a template, swap the no-op check to a lightweight projection query.

### `intake_save_auto` event throttle + clear-button UX question
- **Source:** Mixpanel quota review 2026-05-02. The autosave event
  fires every 500ms after a value change. A user typing a long
  Akashic-record question for 10 minutes with frequent edits could
  fire 100+ saves per session. Bounded but noisy.
- **Throttle action:** Cap `intake_save_auto` to one event per 30
  seconds per session, OR fire only on page transitions (not on
  every value change). The localStorage save itself keeps happening
  every 500ms — only the analytics event gets throttled.
- **Open UX question (Max raised 2026-05-02):** Should the intake
  form expose a manual "Clear saved draft" button so visitors can
  abandon a half-filled form without it auto-restoring on next
  visit? Today the only way to clear is: submit successfully (clears
  via `clearDraft`), wait 30 days for TTL, or open DevTools and
  delete localStorage manually. None are obvious to a casual visitor.
  - Option A: Cleanup button in the form footer ("Start fresh →
    clears saved draft"). Adds clarity but encourages discarding work.
  - Option B: Auto-clear on idle timeout (e.g. no edits in 24h).
    Less explicit; fewer accidents.
  - Option C: Status quo. Trust that 30-day TTL handles it.
  Decide before shipping the throttle.

### Core Web Vitals → Mixpanel via `useReportWebVitals`
- **Source:** Next.js production checklist 2026-05-02. Next exposes
  Core Web Vitals (LCP, FID, CLS, TTFB, INP) via `useReportWebVitals`
  in `app/layout.tsx`. Currently we don't capture them anywhere
  application-side; Cloudflare Web Analytics covers the basics at
  the edge but they aren't sliced by reading_id, intake page number,
  or other funnel dimensions.
- **Action:** Add `useReportWebVitals` in a small client component on
  the layout, send each metric as a `web_vitals` Mixpanel event with
  properties `{ name, value, id, navigation_type, page_path }`.
  Lets us correlate slow pages against funnel drop-off (e.g. "intake
  page 3 has high LCP and 40% drop").
- **Why deferred:** CF Web Analytics already captures aggregate Core
  Web Vitals; this is partial duplication that pays off only once we
  want the per-route slicing in Mixpanel funnels.

### `@next/bundle-analyzer` wiring
- **Source:** Next.js production checklist 2026-05-02. We have a
  `www/Plans/bundle-size-reduction-phase2.md` doc but no analyzer
  plugin on the build itself. Today we measure worker-bundle size
  via wrangler output; we don't measure CLIENT bundle composition.
- **Action:** Add `@next/bundle-analyzer` as a devDep, wire it through
  `next.config.ts` gated on `ANALYZE=1`. Add `pnpm analyze` script.
  Run before any client-bundle-impacting change.
- **Why deferred:** No active client-bundle work right now; the worker
  bundle is the active constraint and `outputFileTracingExcludes`
  narrowing is the relevant lever for that.

### `experimental_taintObjectReference` for server secrets
- **Source:** Next.js production checklist 2026-05-02. Next's defense
  against accidentally serializing server-only objects to the client.
  Tainted objects throw if a Server Component tries to pass them to a
  Client Component as a prop.
- **Action:** Apply taint markers:
  - `src/lib/sanity/client.ts` → taint the `SANITY_WRITE_TOKEN` carrier
  - `src/lib/stripe.ts` → taint the Stripe client (uses `STRIPE_SECRET_KEY`)
  - `src/lib/d1.ts` → taint the D1 binding wrapper
  - `src/lib/r2.ts` → taint the R2 client (uses `R2_SECRET_ACCESS_KEY`)
- **Why deferred:** None of these currently leak to client code; the
  taint markers are belt-and-braces. Worth doing once a code-quality
  pass resumes.

### Generic delegated tracking listener (`data-mp-*`)
- **Source:** Mixpanel best-practices research 2026-05-02. ChargeAfter's
  `<EventTracker>` (libs/event-tracker/src/lib/components/EventTracker.tsx)
  attaches a single delegated `click` listener at the app root and fires
  `button_click` / `link_click` events for any element tagged with HTML
  attributes (`track-id="my-button"`). Zero imports per call site, zero
  new wrapper components.
- **Action:** Add a delegated listener mounted from the root layout
  that reads `data-mp-event` (event name) and `data-mp-*` (snake_case
  properties) from the event target and fires `track(...)`. Coexists
  with `<TrackedLink>` — typed wrappers stay for the SPEC §15 events
  with strict property shapes; attribute tagging is for ad-hoc
  additions that don't warrant a typed entry (e.g. generic `button_click`
  with `button_name`).
- **Why deferred:** Doesn't help with the SPEC §15 events (they need
  type safety the attribute-tag pattern can't provide). Worth adding
  once we want quick instrumentation on supplementary surfaces without
  a tracking-plan revision.

### Dev / staging / production environment separation
**ELEVATED PRIORITY (2026-05-02)** — Max called this out as the
underlying issue causing the per-PR "is this tracked / is this gated /
is this safe?" overhead. This work should land sooner rather than later;
the Mixpanel non-prod opt-in flag (PR-F1, `NEXT_PUBLIC_TRACK_NON_PROD`)
is a bridge, not a substitute. **During soft-launch:** Becky books on
preview. The non-prod gate would skip her events by default — set the
opt-in flag on the preview deploy until apex is unparked, then unset.

- **Source:** Soft-launch retrospective 2026-05-01. The apex was deployed
  wide-open with the under-construction page layered on as a page-level
  flag that only gated `/`. Result: `/book/*`, `/api/*`, and legal pages
  were all reachable on the supposedly-parked apex until PR #55 moved the
  gate into middleware. Page-level feature flags are not access controls —
  the project conflated "marketing toggle" with "environment gate" and
  shipped prod without a closed-by-default posture.
- **What's missing today:**
  - No real staging environment. `preview.withjosephine.com` doubles as
    Studio target, soft-launch booking surface, and de-facto staging —
    no clean separation of concerns. There's no host where Max can test
    a destructive change without affecting Becky's live bookings.
  - No "production is closed by default" pattern. Every new route ships
    publicly accessible the moment it lands on `main`, with the option
    to layer access controls on after.
  - GH Actions has one `vars` block — same env values for every build.
    No way to point a "staging" deploy at a separate D1 / R2 / Stripe
    test mode without fighting wrangler.
  - CF Access is on `preview.` but that's a soft-launch hack, not a
    permanent staging boundary. Once apex is unparked, the 2-email
    allowlist on preview becomes obsolete and we lose the staging tier.
- **Action (multi-step, post-launch):**
  1. Provision a third Worker/D1/R2 trio for `staging.withjosephine.com`
     (or rename current preview → staging once apex is live). Stripe
     test mode keys, separate Sanity dataset, separate D1 binding.
  2. Add `wrangler.staging.jsonc` (or use Wrangler environments) so
     `pnpm deploy:staging` and `pnpm deploy:prod` are distinct paths.
  3. Two GH Actions environments (`staging`, `production`) with their
     own `vars` + secrets. Promotion = manual approval workflow, not
     "merge to main = deploy to prod."
  4. Default-closed posture for any future production environment:
     ship it middleware-gated to a holding/coming-soon, with an
     explicit env flag to open the gate. Document the open/close flip
     as a release step, not a code change.
  5. Lighthouse / PageSpeed runs against staging (representative perf)
     before promotion, not against the live customer surface.
- **Why this is debt, not a defect:** the site works for a single
  practitioner with one customer in flight. The pattern only breaks
  when (a) Max needs to test a destructive change without touching
  production data, or (b) the next "private launch" mode happens and
  someone forgets to gate at the middleware layer again.

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

### Pre-prod data cleanup (test smoke residue)
- **Source:** Smoke session 2026-05-01.
- **What:** Test bookings ran end-to-end against prod (CF Workers + real D1 + real Sanity + real R2). The submissions / mirrored Sanity docs / uploaded photos remain. We don't have a dedicated dev environment yet; everything lands in the prod stores.
- **Action before opening real traffic:**
  1. `pnpm wrangler d1 execute withjosephine-bookings --remote --command "DELETE FROM submissions WHERE email LIKE '%@gmail.com' OR email LIKE '%@example.com'"` — adjust filter to actual test emails.
  2. Studio → Submissions → delete each test row that mirrored.
  3. R2: delete the orphaned objects under `submissions/<id>/` for the deleted IDs (or wait for the orphan-reaper cron once it's running).
- **Long-term fix:** stand up a real dev environment (separate D1 DB + Sanity dataset + R2 bucket + Stripe test mode wiring on dedicated subdomain like `dev.withjosephine.com`) so the next round of smoke testing doesn't pollute prod.

### Stripe Payment Link prices ↔ Sanity priceDisplay drift (recurring class)
- **Source:** Smoke session 2026-05-01 — Sanity Soul Blueprint shows `$129` but Stripe Payment Link still charges `$179`.
- **What:** Sanity has two related fields per reading: `price` (cents, INTEGER) and `priceDisplay` (string). Both editable independently. The Stripe Payment Link is a separate config in Stripe dashboard. Three sources of truth, none reconciled. A Sanity edit to `priceDisplay` doesn't update Stripe; an edit to `price` doesn't update `priceDisplay` either.
- **Symptoms today:** Sanity shows `priceDisplay: "$129"` + `price: 17900` (cents = $179). Customer is shown $129 throughout the booking flow but charged $179 on Stripe checkout. Thank-you page renders the actual Stripe-charged amount ($179) which now exceeds the listed price.
- **Action:**
  1. Pick the canonical price for each reading. Update Sanity `price` (cents) AND `priceDisplay` (string) together. Update the Stripe Payment Link price for that reading. Verify by ordering through.
  2. Add a Sanity validation rule on `reading` that asserts `priceDisplay` is consistent with `price` (parses dollars-and-cents from the string and matches the cents field). Wouldn't catch Stripe drift but kills the Sanity-internal class.
  3. Long-term: bake reading prices into a build-time constants file via prebuild script (same pattern as `tokens.override.css`). Drift becomes a build break.

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

## Next-version features (Phase 2)

Items not in current scope. Captured here so they don't drift; revisit
after launch + the staging/dev separation work lands.

### Server-side consent audit log
- **Source:** Max 2026-05-02 (PR-F1 review). Today the visitor's
  Accept/Decline choice for analytics consent lives only in their
  browser's localStorage under `josephine.consent`. That's enough to
  technically gate the SDK, but it's NOT a record we can produce if
  challenged by a regulator (GDPR Article 7(1) — "the controller shall
  be able to demonstrate that the data subject has consented").
- **What's missing:** an audit trail proving *who* consented, *when*,
  to *which version* of the privacy policy. localStorage can be cleared,
  spoofed, or wiped between sessions; it's not evidence.
- **Action:**
  - Add a `consent_record` table in D1 (or a `consentRecord` document
    type in Sanity if Josephine wants visibility in Studio): `{ id,
    anonymous_visitor_id, accepted_at, policy_version, accepted_categories,
    ip_hash, user_agent }`. The visitor ID is a random UUID generated
    at first visit and stored in localStorage alongside the consent
    state — never personal data.
  - Add a `policyVersion` field on the privacy `legalPage` doc in
    Sanity, manually incremented when material wording changes ship.
    Read at consent-record write time.
  - Add `/api/consent` route, called fire-and-forget from the Accept
    handler in `<AnalyticsBootstrap>`. Body: `{ visitor_id, policy_version,
    accepted_categories: ["analytics"] }`. Server hashes IP, captures
    user agent, writes the row.
  - Document the audit log itself in the privacy policy (it IS personal
    data — recursive disclosure required). Section "Records of consent."
- **Why deferred:** Regulatory enforcement risk for a single-practitioner
  site at this scale is near-zero unless someone files a specific
  complaint. The localStorage-only posture is a defensible starting
  point; the audit log is the next maturity step before scale or
  before adding marketing-driven processing (which the Phase-2
  newsletter waitlist below would also need).

### "Fully booked" toggle with newsletter waitlist
- **Source:** Max 2026-05-01. Once Josephine is taking real bookings,
  there will be periods where she's at capacity and needs to pause
  intake without taking the site down.
- **What:** A Sanity-controlled switch that, when enabled, replaces
  the "Book a Reading" CTA with a "Fully booked for now" message and
  a newsletter signup form. Visitors can opt in to be notified when
  openings reappear.
- **Sanity schema (proposed):**
  - Site-wide kill switch on `siteSettings`: `acceptingNewBookings: boolean`.
  - Per-reading override on each `reading` doc: `acceptingNewBookings: boolean`
    (defaults to site-wide value if unset). Lets Josephine close
    Soul Blueprint while keeping Akashic Record open.
  - Editable copy fields on `siteSettings` for the closed state:
    `fullyBookedHeading`, `fullyBookedMessage`, `waitlistOptInLabel`,
    `waitlistConfirmationMessage`. All Sanity-driven, no hardcoded text.
- **UX states:**
  - **Open (current behavior):** reading card CTA → `/book/[reading]`.
  - **Closed:** reading card CTA → opens an inline form (no route
    change). Form fields: first name (optional), email (required,
    validated), opt-in checkbox **unchecked by default** (GDPR/PECR
    requires affirmative consent for marketing email).
  - On submit: success state with confirmation copy + close button.
- **Backend:**
  - New `/api/waitlist` route. Turnstile-gated like `/api/contact`.
  - Dual write: Sanity `waitlistSubscriber` doc (so Josephine sees
    signups in Studio) + Resend Audience (for later broadcast).
    Same dual-write pattern as bookings.
  - Double opt-in flow recommended: signup writes a `pending` row,
    sends a confirmation email with a tokenized link, link flips
    row to `confirmed` and adds to Resend Audience. Demonstrates
    consent for compliance.
- **"Openings available" trigger:**
  - V1: manual broadcast via Resend dashboard → Audience → Send
    campaign. No code needed beyond getting them into the audience.
  - V2 (later): Sanity field `nextOpeningAt: datetime` + cron
    that fires the campaign automatically. Skip until v1 is in use.
- **Privacy/legal updates required:**
  - `/privacy` policy must add a section covering the marketing list
    (purpose, lawful basis = consent, retention, withdrawal).
  - Every email needs an unsubscribe link. Resend handles this in
    their hosted templates — if we keep inline HTML emails, must
    add the link manually + wire the Resend unsubscribe webhook.
- **Scope estimate:** 1–2 days. Sanity schema add (4 fields + 1 doc
  type) + IntakeForm conditional render + new `<WaitlistForm>`
  component + `/api/waitlist` route + Resend Audience integration
  + 2 email templates (confirmation + welcome) + privacy policy
  copy update.
- **Sequencing:** after PR-F (Mixpanel) + the dev/staging/prod
  separation work. Phase-2 feature, not blocking initial launch.

---

## How to use this doc

When an item lands, delete it from this file. When a new "we'll defer
this" decision happens during a session, add it here so it doesn't drift
out of memory in a commit message.
