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

### AI-bot accessibility policy — decide what we want indexed
- **Source:** Firewall events review 2026-05-06 (24h Security Events sample showed Claude-SearchBot blocked once on `/sitemap.xml`).
- **What:** A "Manage AI bots" managed rule is currently active and is blocking AI-search crawlers (Anthropic, presumably also OpenAI / Perplexity / Google AI Overviews indexers). Default-deny posture inherited from the WAF default; never explicitly chosen.
- **Decision needed (Max + Josephine):** Do we *want* the site indexed by AI-search? Trade-off:
  - **Allow**: organic discovery via "best akashic record reader" / "soul blueprint reading" prompts in ChatGPT/Claude/Perplexity. New top-of-funnel channel that didn't exist 2 years ago. Low cost — these bots are well-behaved and crawl rarely.
  - **Block (status quo)**: zero risk of AI tools quoting Josephine's voice/copy, training on practice descriptions, or surfacing prices/contact in summaries. Cleaner brand control. Loses the discovery channel.
  - **Hybrid**: allow `Claude-SearchBot` + `OAI-SearchBot` + `PerplexityBot` (search/citation, link-back) but keep blocking `GPTBot` / `Google-Extended` / `ClaudeBot` / `CCBot` (training crawlers, no link-back).
- **Action when decided:**
  - CF Dashboard → Security → WAF → Managed Rules → "AI bot management": flip from block-all to allow-list, OR
  - Add a custom rule with explicit UA allowlist for the chosen crawlers.
  - Update `robots.txt` to match (currently doesn't differentiate).
  - If allowing AI-search, verify `/sitemap.xml` returns 200 to those UAs (it currently 403s per the firewall log).
- **No deadline.** Optional. Worth ~30 min of conversation with Josephine before deciding — her brand voice is a real asset and she may have a strong opinion either way.

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

### Dead `NEXT_PUBLIC_WEB3FORMS_KEY` GH secret (Max-action only)
- **What:** Set as a GH SECRET pre-launch when contact-form was on web3forms; web3forms was replaced by Resend, source code has zero references today (verified via grep). Pure dead config.
- **Action (Max):** `gh secret delete NEXT_PUBLIC_WEB3FORMS_KEY` at the repo level. No code change.

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

### Audit: orphaned schema fields & components
- **Source:** Surfaced 2026-05-02 from a Studio "required-field empty" error
  on `bookingPage.entertainmentAcknowledgment` + `coolingOffAcknowledgment`.
  Root cause: `<BookingForm>` component (the consumer of those fields) was
  removed during the booking-flow rebuild (PRs PR-A → PR-E), but the schema
  fields stayed behind as zombies. Fixed in this PR (PR-F1) — but no
  one swept the rest of the codebase for the same class of issue.
- **Action:** Walk every Sanity schema in `studio/schemas/` and confirm
  each top-level field has at least one consumer in `src/`. Any field
  with no consumer = candidate for removal (or revival, if the consumer
  was lost). Likely suspects to inspect:
  - `bookingPage` (already audited via this PR — clean now)
  - `bookingForm` (large dynamic schema — check every field)
  - `landingPage`, `siteSettings`, `bookingHero`, `thankYouPage`,
    `underConstructionPage`, every `legalPage`, `reading`, `testimonial`,
    `faqItem` — verify projection coverage
  - Hero / About / How-It-Works sub-objects within `landingPage`
- **Detection technique:** `grep -r "<fieldName>" src/lib/sanity/queries.ts`
  → if not in any GROQ projection, it's orphaned. Also check
  `src/lib/sanity/types.ts` for typed-but-unused fields.
- **Why deferred:** Cross-cutting cleanup, low-priority compared to
  feature work. Best done as one focused session before the apex
  unparks for general traffic.

### Audit: content elements that should be Sanity-editable but aren't
- **Source:** Same 2026-05-02 retro. Several visible-to-customer
  strings live as hardcoded JSX/constants in the codebase. Each one
  is a "Josephine wants to tweak the wording" call to engineering
  that shouldn't have to happen.
- **Action:** Walk every customer-facing component and identify
  hardcoded strings that aren't Sanity-backed. Candidates known
  today (non-exhaustive):
  - `<EntryPageView>` doesn't render copy, but the entry-page
    layout in `/book/[reading]/page.tsx` has hardcoded "What's
    included" header and the included-items rendering pattern
  - `<NavigationButton>` / generic CTAs across the app — button
    labels are usually Sanity-driven via `bookingPage.paymentButtonText`
    etc. but verify every CTA in the booking flow has a Sanity
    field (Hero CTA, Letter drop-cap, Intake submit/back/next,
    SubmitOverlay copy)
  - Form field validation messages (`zod` error strings) —
    currently hardcoded; consider Sanity-editable per-error-type
    if Josephine wants to soften specific error wording
  - Footer copyright / accessibility strings
  - 404 page copy (`/not-found`)
  - Refund-policy / Privacy / Terms — Sanity-backed already,
    but verify nothing falls through to a JSX fallback
  - Email subject lines and inline HTML in `src/lib/resend.ts`
    (currently inlined; backlog already has "Resend template IDs"
    item — overlaps)
- **Detection technique:** Search `src/components/**` for string
  literals that look like customer-facing copy (anything passed to
  React children with sentence-case/punctuation). Cross-reference
  against existing Sanity schema; gaps are candidates.
- **Why deferred:** Each new Sanity-editable field is schema +
  GROQ projection + type + fallback default + seed migration +
  `<VisualEditing>` overlay verification. Best batched into a
  "make Studio editorial-complete" session rather than drip-feeding.

### Code-quality: drop inferred return-type annotations
- **Source:** Max 2026-05-02. Where a function's return type is inferred
  by TypeScript correctly, an explicit annotation adds noise without
  catching anything new. Examples in current codebase:
  `): void` on `initAnalytics`, `track`, `identifySubmission`,
  `_resetForTests`, `writeConsent`, `readConsent` (returns
  `ConsentChoice | null`), `requiresConsent` (returns `boolean`),
  `deriveEnvironment` (returns `string`), the migration scripts'
  helper functions, and similar across `src/lib/**`.
- **Rule going forward:** only annotate the return type when:
  - It's a public API boundary (exported) AND the inference would be
    a wider/narrower type than intended
  - It's a recursive function (TS can't infer through recursion cleanly)
  - The function is overloaded
  - The function returns a complex generic that TS infers as `any`/wide
- **Action:** sweep `src/lib/**` and `src/components/**` removing
  redundant return-type annotations from local helpers and one-off
  functions where inference is correct. Keep the annotations on
  exported functions that are part of a public contract IF removing
  them would make the inferred type unstable. ~30-min sweep across
  the codebase, no behavior change.

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

### Reading prices — data reconcile + Stripe Payment Link sync (Max+Josephine)
- **Source:** Smoke session 2026-05-01; full audit 2026-05-06.
- **Code surfaces fixed in `fix/reading-price-drift-class`:**
  - Sanity schema validation rule on `priceDisplay` warns when it disagrees with `price` (cents). Studio surfaces a yellow warning on any reading doc whose two fields don't agree.
  - Prebuild `pnpm sync-readings-from-sanity` writes `src/data/readings.generated.ts` so the runtime fallback (Sanity outage path) tracks whatever Sanity last published. Static-fallback drift class closed.
- **Still open (data, not code):**
  - All three reading docs (production + staging) currently fail the validation as of 2026-05-06: `soul-blueprint` price=17900¢/display=$129; `birth-chart` price=9900¢/display=$89; `akashic-record` price=7900¢/display=$89.
  - Max + Josephine: pick the canonical price for each reading, update `price` (cents) AND `priceDisplay` together in production Sanity, then update the matching Stripe Payment Link via the dashboard (Stripe prices are immutable — this is "create new Price + new Payment Link, swap URL on the reading doc, archive the old"). Staging mirror picks it up automatically through `/api/sanity-sync`.
  - Once reconciled, consider flipping the schema rule from `warning` to `error` so future drift hard-fails Studio save.

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

### Sub-PR #4 — Becky operational layer (split into 4a / 4b / 4c, decided 2026-05-07)

**Background.** ADR-001 acceptance + 2026-05-06 + 2026-05-07 surfacing during the operational-completeness branch. Today's flow is broken for Becky: `voiceNoteUrl` / `pdfUrl` are URL strings in Sanity Studio (plain text inputs), there's no queue/visibility surface, and the only delivery path is `pnpm tsx scripts/mark-delivered.mts` from an engineer terminal.

**Decided 2026-05-07 (research + 4-voice council debate).** Path B+ (D1 columns kept; cron mirrors Sanity → D1 at fire time, listen page unchanged). Decision artefacts: `www/MEMORY/WORK/20260507-045653_subpr4-studio-file-upload-day7-delivery/PRD.md`. Research from Perplexity / Claude / Gemini and council of 4 (SaaS ops architect / solo creator / CS specialist / minimum-mechanism architect) all converged on:
- Sanity is Becky's surface; D1 stays source-of-truth via the existing mirror (no new D1 columns).
- Airtight gate = artifact existence as the readiness flag, atomic GROQ predicate at cron fire time. Sanity schema validation is defense in depth; the cron-time GROQ is what's load-bearing.
- Queue surface = pinned Sanity Structure pane, NOT a dashboard tool. Belongs in 4b.
- Digest = threshold-triggered (≥1 item due in <48h or overdue), NOT fixed-cadence. Belongs in 4c.
- Sequence = ship 4a alone, bake 1 week, then 4b + 4c bundled.
- Shared `isDeliverable(submission)` predicate built once in 4a, reused by 4b/4c (queue filter, digest filter, ICS deadline computation).

#### Sub-PR #4a — file upload + airtight delivery gate ✅ MERGED 2026-05-07 (PR #74)
- **Scope shipped.** Schema flip (`voiceNote: file`, `readingPdf: file`, validation `required when deliveredAt set` + cross-field gate on `deliveredAt`). New `isDeliverable()` predicate (with unit tests) + `fetchDeliverableSubmissions()` / `fetchUndeliveredSubmissionIds()` GROQ helpers. Day-7-deliver cron sources candidates from Sanity, dereferences `voiceNote.asset->url` + `readingPdf.asset->url`, writes URLs + `deliveredAt` to D1, then sends. Day-7 alert cron queries Sanity for `!defined(deliveredAt)` (not D1 — avoids the race between Becky setting `deliveredAt` and the deliver cron running). `mirrorSubmissionPatch` patch shape drops the 3 delivery fields. `scripts/mark-delivered.mts` deleted. D1 schema unchanged; listen page unchanged; `repository.ts` `Row` / `rowToRecord` unchanged.
- **Status.** Merged into `feat/operational-completeness` as commit `2d183f4`. Now in 1-week bake against Becky's first real reading. Once verified, integration branch → main as a single PR.
- **Bake checklist (manual smoke).**
  1. Becky uploads voice + PDF in Studio → schema validation accepts both files.
  2. Becky sets `deliveredAt` without files → schema validation BLOCKS save (defense in depth).
  3. Becky sets `deliveredAt` with both files → schema validation accepts.
  4. Cron-time GROQ predicate fires → D1 `delivered_at` + `voice_note_url` + `pdf_url` populated within one cron tick.
  5. Customer Day-7 email arrives with valid `/listen/<token>` URL.
  6. Listen page renders both audio + PDF download.
  7. If Becky stalls past 7d, alert cron fires once to Josephine (no duplicate alerts on subsequent ticks).

#### Sub-PR #4b — Studio queue view (FOLLOW-UP, post-#4a bake)
- **Scope.** Custom Sanity Structure pane "Awaiting delivery" — pinned in Studio sidebar, GROQ-filtered to `_type == "submission" && status == "paid" && !defined(deliveredAt)`, sorted by `paidAt asc` (oldest first). Submission preview subtitle shows days-since-paid as plain text (e.g. "Day 4 of 7"). No traffic-light badges yet — defer until Becky asks.
- **Reuses from 4a.** The `isDeliverable()` predicate inverse for the filter; the GROQ shape from `fetchDeliverableSubmissions()`.
- **Effort.** ~1 day.

#### Sub-PR #4c — Becky-proactive pings (FOLLOW-UP, ships with 4b)
- **Scope.** (1) New Resend cron `email-becky-digest` at 09:00 ET that fires only when ≥1 submission is overdue (>7d since paid + no `deliveredAt`) OR due within 48h. New Sanity siteSettings field `practitionerOpsEmail` for the recipient (Becky's address). Threshold-triggered = no fixed cadence — silence on quiet days is the signal. (2) ICS attachment on the per-booking notification email (sent at payment time): `.ics` file with `METHOD:PUBLISH` (NOT REQUEST — avoids attendee-response UI), `VTIMEZONE` block + `TZID`-qualified `DTSTART`/`DTEND`, deadline = `paidAt + 6d` (24h buffer before the 7d SLA). Auto-populates Becky's calendar without OAuth.
- **Declined options (durable record):** 48h-before-deadline single-shot reminders (overlap with digest); Telegram/Pushover phone push (channel proliferation, all sources warn against it at this scale).
- **Reuses from 4a.** `isDeliverable()` for the digest filter.
- **Effort.** ~1 day.

**Why split (locked rationale):** schema migrations on live Sanity always surface edge cases (existing string-field docs, asset reference shape mismatches). Shipping the gate alone lets it bake under real Becky usage before layering visibility + ping surfaces on top of it. Council 3/4 endorsed the split; the dissenter (M4, minimum-mechanism architect) conceded once migration risk was named.

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

### Sentry follow-ups (post-`@sentry/cloudflare` ship)
- **Shipped:** server-side error capture via `Sentry.withSentry` wrap in `custom-worker.ts` (PR #70). Client-side React error capture via `@sentry/browser` from `error.tsx` / `global-error.tsx`, gated on the same consent banner as Mixpanel; client-side sourcemap upload to Sentry via a `pnpm sentry:sourcemaps` CI step (the @sentry/browser PR). DSN is the kill switch — unset `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client) = silent no-op.
- **Open follow-ups:**
  1. **Worker-bundle sourcemap upload to Sentry** — blocked upstream on sentry-javascript#19213. `sentry-cli sourcemaps inject/upload` succeeds against `.open-next/worker.js[.map]` but runtime stack frames don't reference the uploaded Debug IDs because something in OpenNext's worker init strips them. Until upstream lands a fix, server-side stack traces from `Sentry.withSentry` reach Sentry minified. Acceptable tradeoff — `error.digest` provides per-error correlation; client-side captures are symbolicated.
  2. **Validate against the open AsyncLocalStorage bug** — sentry-javascript#18842 affects the `@sentry/nextjs` `onRequestError` hook, which we deliberately avoided. Worth re-checking in 6 months; if upstream resolves it, `@sentry/nextjs` would unlock automatic request-context correlation that `@sentry/cloudflare` standalone doesn't provide.

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

### Embed Sanity Studio at `staging.withjosephine.com/studio` (nice-to-have)
- **Source:** Max 2026-05-06, after surfacing that Sanity Studio's Presentation tool can't iframe `staging.withjosephine.com` cleanly when CF Access is in the way. Workaround in place today: open staging.withjosephine.com in another tab, complete Access login, then Presentation iframe carries the cookie (works only if CF Access SameSite=None and browser third-party-cookie policies cooperate — fragile to Privacy Sandbox tightening).
- **What:** Mount Sanity Studio inside the Next.js worker at `staging.withjosephine.com/studio` using `next-sanity`'s `<NextStudio>` component. Studio shell + iframed preview content live on the same origin → Access cookie is first-party → no SameSite issue, no fragility.
- **Scope:**
  1. `pnpm add next-sanity sanity` to www (sanity already in studio/, lands in www too).
  2. New route `src/app/studio/[[...index]]/page.tsx` mounting `<NextStudio config={config}>`.
  3. Reference `studio/sanity.config.ts` so the embedded Studio uses the same schema (or extract to a shared module).
  4. Sanity Project Settings → API → CORS Origins → add `https://staging.withjosephine.com`.
  5. Optionally retire the hosted `withjosephine.sanity.studio` once embedded is verified — or keep it for prod-dataset edits without preview.
- **Why deferred:** the cross-tab login workaround is good-enough today. The embed is the architecturally cleaner answer (canonical "co-locate Studio with preview origin" pattern) and removes the SameSite-cookie fragility — worth doing when the workaround starts breaking or when Becky / Josephine want a smoother editor flow.
- **Effort:** 2–4 hours code + Sanity CORS config + verification.

### Sanity webhook sync — extend to copy referenced assets
- **Source:** PR-S5b1 sync endpoint scoping 2026-05-06.
- **What:** `/api/sanity-sync` syncs document edits from prod → staging via Sanity webhook → HMAC-verified endpoint → `getSanityWriteClient().createOrReplace()`. Asset documents (`sanity.imageAsset`, `sanity.fileAsset`) are explicitly skipped by the endpoint — Sanity asset binaries are stored per-dataset in Sanity's CDN, and copying just the asset doc to staging produces broken CDN URLs (the binary lives in the prod dataset's CDN path, not staging's).
- **Symptom:** if Becky uploads a NEW image in Studio (not editing existing), the doc's `image.asset._ref` points at a prod-only asset, and rendering on `staging.withjosephine.com` shows a broken image until a manual `pnpm seed:staging` re-seeds.
- **Action:** When the sync endpoint receives a doc with `image.asset._ref` fields, fetch the referenced asset from prod (Sanity API) and write it to staging too — including binary upload via `client.assets.upload()`. Recurse through reference chains. Test against a doc with multiple image refs.
- **Why deferred:** Becky's typical edits are text changes, not image uploads. The seed script is a manual recovery path until the asset auto-sync ships. Worth doing when image-upload edits become regular.

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

### Apex unpark — Stripe live-mode flip target (captured 2026-05-06 during PR-S1)

Locked here because the dev/staging/prod separation plan deliberately scoped Stripe live-mode out (PR-S1 kept all 3 envs on test mode for now since prod apex is parked). When apex unparks for real customer traffic, this is the exact set of changes needed:

1. **Stripe (Live mode)** — register a live webhook endpoint at `https://withjosephine.com/api/stripe/webhook`, subscribe to the same event set as the existing test-mode webhook. Capture the live signing secret.
2. **Stripe (Live mode)** — create 3 new Payment Links (one per reading: Soul Blueprint $129, Birth Chart $99, Akashic Record $79) with `success_url = https://withjosephine.com/thank-you/{slug}?sessionId={CHECKOUT_SESSION_ID}`. Capture the URLs.
2a. **Stripe (Test mode existing PLs)** — during PR-S1 (2026-05-06) the existing 3 test-mode PL success_urls were pointed at `https://staging.withjosephine.com/thank-you/...` so staging QA works while apex is parked. After live-mode PLs replace them in production Sanity (step 3 below), the test-mode set can stay pointing at staging permanently — staging is the only consumer of the test-mode set going forward.
3. **Sanity production dataset** — update each `reading` doc's `stripePaymentLink` field to the new live-mode URL. Path: `*[_type == "reading" && slug.current == "<slug>"]`. Use Studio Presentation tool or `sanity documents create/replace` CLI mutation. Per the saved fetch-before-edit rule, fetch the live doc first, edit from that base.
4. **Worker production secrets** — `wrangler secret put STRIPE_SECRET_KEY` (paste `sk_live_*`), `wrangler secret put STRIPE_WEBHOOK_SECRET` (paste live signing secret from step 1).
5. **GH Environment production variables** — flip `NEXT_PUBLIC_UNDER_CONSTRUCTION` from `1` → `0`. Redeploy.
6. **Becky-coordination** — only proceed after Becky's reading delivery is complete. Her current booking flow uses the test-mode PLs; flipping mid-flight strands her transaction in test mode while the dataset says live.

Independence from staging-separation: this is fully orthogonal. None of the staging PRs depend on this; this doesn't block any staging PR. Lives in the apex-unpark plan when that's drafted.

---

## How to use this doc

When an item lands, delete it from this file. When a new "we'll defer
this" decision happens during a session, add it here so it doesn't drift
out of memory in a commit message.
