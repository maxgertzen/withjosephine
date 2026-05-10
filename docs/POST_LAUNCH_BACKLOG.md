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

---

## Infrastructure

### Staging-tier provisioning runbook — DOCUMENTED 2026-05-07 in `feat/csp-nonce-and-audits`
- **Source:** `staging.withjosephine.com/book/soul-blueprint/intake` returned 404 for ~24h after the staging tier shipped (PR-S series). Root cause: Sanity `staging` dataset was created Private (default), and `sanityClient` is `useCdn:true` with no token, so customer-facing queries went unauthenticated → null → `notFound()`. Pages with static fallbacks (entry, letter) rendered fine and masked the issue. Fix was a one-toggle dashboard change (flip dataset visibility → Public).
- **Captured at:** [`docs/STAGING_RUNBOOK.md`](./STAGING_RUNBOOK.md). Provisioning checklist + the dataset-visibility gotcha + verification protocol (smoke the deepest page in a flow, not just the entry).
- **PAI memory:** `feedback_sanity_client_token.md` + `feedback_static_fallbacks_can_mask_outages.md`.
- **Action:** Reference the runbook when standing up the next non-prod env (dev?). No standalone code work.

### Dead `NEXT_PUBLIC_WEB3FORMS_KEY` GH secret (Max-action only)
- **What:** Set as a GH SECRET pre-launch when contact-form was on web3forms; web3forms was replaced by Resend, source code has zero references today (verified via grep). Pure dead config.
- **Action (Max):** `gh secret delete NEXT_PUBLIC_WEB3FORMS_KEY` at the repo level. No code change.

### `/api/booking/upload-url` architectural alternative
- **Source:** Code review (S-4 long-term fix).
- **What:** Current design: Turnstile-gated upload-url + R2 ContentLength
  signing + orphan-reaper cron. The "right" fix the reviewer suggested
  long-term is to gate uploads on an already-validated submission ID
  (i.e. `/api/booking/init` → `pendingId`, then upload-url requires it).
  Today's three layers cover the abuse surface adequately.
- **Action:** Revisit if upload abuse becomes a real signal.

### Microsoft Clarity (session replay) — wiring SHIPPED, provisioning pending
- **Wiring shipped:** `<ClarityScript>` client component mounted from `<AnalyticsBootstrap>` (inherits consent gate + non-prod opt-in), external `<Script src="https://www.clarity.ms/tag/...">` form (CSP-compliant, no nonce concern), `shouldEnableClientObservability(host)` shared gate, CSP `script-src` + `connect-src` extended to `https://*.clarity.ms`, `NEXT_PUBLIC_CLARITY_PROJECT_ID` wired through `.env.local.example` + `.github/workflows/ci.yml`. Privacy policy patch script staged at `scripts/migrate-privacy-clarity.ts` (idempotent, mirrors the Mixpanel patch from PR #57).
- **Outstanding Max-actions (sequence):**
  1. Sign up at clarity.microsoft.com → create project → get the 10-char tracking ID.
  2. Add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH repo Variables (Settings → Variables → Actions → New repository variable). Value = the tracking ID. No env-scoped override needed; same project for prod + staging (staging won't render Clarity unless `NEXT_PUBLIC_TRACK_NON_PROD=1` is also flipped).
  3. Trigger a production deploy (re-run latest workflow) so the new build inlines the env var.
  4. Visit the site, click around, confirm `https://www.clarity.ms/tag/<id>` script loads in DevTools Network without CSP errors.
  5. Run `set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-clarity.ts` against the production Sanity dataset (and again with staging dataset) to add the sub-processor disclosure to the privacy policy. Idempotent — safe to re-run.
  6. Verify masking in Clarity dashboard: load a few real intake-form sessions, confirm DOB / first_name / last_name / photo fields render as redacted blocks, not actual content. ALL of these masks before opening real traffic.

### Resend `EmailSendResult` discriminated union

- **Source:** /simplify quality reviewer flag in `fix/staging-smoke-followups` (PR #86, 2026-05-08).
- **What:** `sendOrSkip` returns `{ resendId: null }` for three distinct outcomes: dry-run skipped (intentional, success-equivalent), `RESEND_API_KEY` missing (config failure), and Resend send failure. Six callers (booking, contact, 3 crons, Josephine notification) currently can't distinguish these without re-reading env flags. Contact route now does `!isFlagEnabled("RESEND_DRY_RUN")` to disambiguate — leaks Resend's internal flag awareness up to the route boundary.
- **Action:** Widen `EmailSendResult` to a discriminated union — `{ status: "sent"; resendId: string } | { status: "skipped"; reason: "dry_run" | "no_api_key" | "no_recipient" } | { status: "failed"; error: string }`. Each caller branches on `status`. Contact route's TODO at `route.ts` becomes a clean `if (result.status === "failed") return 500`. Touches every email caller — own PR.
- **Why deferred:** Surgical 3-liner unblocks staging; the proper boundary fix is its own PR. Touches 6+ callers + the lib + tests across each.

### Sanity write-client helper extraction (`scripts/_lib/sanity-write-client.mts`)

- **Source:** /simplify reuse reviewer flag in `fix/staging-smoke-followups` (PR #86, 2026-05-08). Tipping point reached: 3 scripts (`seed-booking-page-entry-copy.mts`, `seed-quality-sweep-fields.mts`, `cleanup-orphan-field-values.mts`) now duplicate the same env-load + token guard + `createClient` boilerplate (~22 lines each).
- **What:** Extract `scripts/_lib/sanity-write-client.mts` exporting `loadDotEnv()` + `createSanityWriteClient()` returning `{ client, dataset }`. Migrate the 3 callers to the helper.
- **Action:** New file under `scripts/_lib/`, refactor 3 existing scripts to ~3 lines of setup each. Mechanical, low risk.
- **Why deferred:** Out of scope for the staging-smoke fix bundle. Worth a focused 30-minute pass; pre-empt the 4th copy.

### Defaults-merge convention drift across content components

- **Source:** /simplify reuse reviewer flag in `feat/quality-sweep-projections-copy-types` (PR #85, 2026-05-07).
- **What:** ContactForm now uses per-field merge (`{ ...CONTACT_DEFAULTS, ...content }`), but Hero / HowItWorks / Footer / Navigation still use all-or-nothing fallback (`content ?? DEFAULTS`). The two forms behave differently the moment a partial Sanity doc exists — `?? DEFAULTS` drops every default the moment the doc is non-null, so any new optional field silently renders `undefined`. This is dormant today (those components don't have optional fields), but the next time someone extends e.g. `HeroContent`, they'll trip the same bug class ContactForm just escaped from.
- **Action:** Migrate Hero / HowItWorks / Footer / Navigation to the same `{ ...DEFAULTS, ...content }` shape. Mechanical, low risk, blast radius small (each component is a leaf with stable prop shape).
- **Why deferred:** Not blocking. Worth a focused 30-minute pass in the next sweep.

### Audit: orphaned schema fields — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

PROJECTED-BUT-UNUSED follow-up complete. 9 fields deleted, 1 wired up (`bookingPage.paymentButtonText` → PageNav), 6 new optional fields added (PageNav nav copy, PageIndicator tagline, ContactForm success state). 4 audit "ambiguous" entries verified as CONSUMED (`bookingForm.entryPageContent.*`, `bookingForm.pagination.overrides`, `bookingForm.loadingStateCopy`, `bookingForm.nonRefundableNotice` — schema description fixed). Full per-field landscape in `www/docs/audits/orphan-schema-fields.md`. Manual seed via `scripts/seed-quality-sweep-fields.mts` against production + staging (Max-action).

### Audit: hardcoded customer-facing copy — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

H3/H4/H5 shipped (SubmitOverlay loading copy via Sanity seed; ContactForm success state via `landingPage.contactSection` extension; IntakeForm PageNav labels via `bookingPage.paymentButtonText` + new `bookingForm.nextButtonText` + `saveAndContinueLaterText`). M1/M2/M3/M5 dropped with durable rationale. M4 PageIndicator resolved via new `bookingForm.pageIndicatorTagline` optional knob. Email-template copy remains out-of-scope (CRM migration path). Full landscape in `www/docs/audits/hardcoded-copy.md`.

### PR-F1 simplify-pass deferrals (remaining after Bundles 2 + 4)

**Source:** Code-quality + efficiency review on `feat/mixpanel-pr-f1` 2026-05-02. Three of five original items closed across PR #77 (Bundle 2 — `consentEffectRanRef` ref-guard + `<SavedIndicator>` extraction) and PR #79 (Bundle 4 — confirmed-and-rejected `process.env.*` hoist; see "Why kept inline" below). Remaining:

- **Why `process.env.*` reads in IntakeForm render path were KEPT inline (durable rationale, do not re-propose).** Tried hoisting to both module scope (Bundle 2) and `useMemo([], [])` (Bundle 4); both reverted. Root reason: Next's webpack DefinePlugin already inlines `NEXT_PUBLIC_*` as string literals at build time. The "inline reads" in source compile to bare constants in the output bundle. Module-scope hoist has the same runtime cost AND breaks `vi.stubEnv` test stubs. `useMemo` has the same runtime cost AS the inline reads PLUS hook overhead (cache lookup, deps-array compare). The inline reads ARE the optimal pattern at this build pipeline. Saved as memory `feedback_next_publicenv_inlining.md`.

- **`setState`-in-effect lint suppression in AnalyticsBootstrap.** Cleaner long-term fix is `useSyncExternalStore` for the consent state read. Refactor when the consent flow gains complexity (e.g. when we add per-purpose consent granularity).

- **`window.location.host` re-read in `initAnalytics()`.** Called once due to the `bootstrapped` guard. Hoist if/when re-init support is added (currently not on the roadmap). Eager module-scope read is unsafe (SSR breaks); lazy module-scope cache is identical work to the function-scope cache.

- **`migrate-privacy-mixpanel.ts` re-fetches on no-op idempotency check.** The script fetches the entire doc before short-circuiting. Acceptable today (script runs maybe 1–2 times in its lifetime); swap to a lightweight projection query if it becomes a template.

### Core Web Vitals → Mixpanel — CLOSED-AS-DROPPED 2026-05-07
- **Decision:** Dropped during the items-4/5/6 bundle planning. PerplexityResearcher confirmed Microsoft Clarity natively captures the three Google-ranked CWV metrics (LCP, INP, CLS) at p75 with session-replay correlation — strictly more useful than Mixpanel histograms. FID is deprecated (replaced by INP March 2024); FCP and TTFB are diagnostic, not Google-ranked. Quota wasn't the issue (~2,580 events/mo is 0.26% of Mixpanel's 1M free-tier cap), but the duplicate signal isn't worth one always-mounted client component plus per-route property slicing we can already get from Clarity's Performance widget. Locked by Max via AskUserQuestion.

### Generic delegated tracking listener (`data-mp-*`) — SHIPPED
- Shipped as part of the items-4/5/6 bundle. `<DelegatedTracking />` mounted in `src/app/layout.tsx`, single bubble-phase `click` listener at `document` resolves `closest("[data-mp-event]")`, reads remaining `data-mp-*` attrs as snake_case properties, fires `trackUntyped(event, props)`. Typed `track()` remains the only entry-point for SPEC §15 events; `trackUntyped` is documented as "delegated path only" in `client.ts`.

## Code quality (nice-to-fix)

Remaining items after PRs #76–#78 (Bundles 1–3) closed: F-11 cron-auth, build-time Turnstile bypass assertion, TrustLine cleanup, `clientReferenceId` orphan removal (+ D1 column drop via migration `0003`), `abandonmentRecoveryFiredAt` orphan removal, `void chipTick` refactor, `letter/page.tsx` IIFE simplification, `intake_save_auto` throttle, `@next/bundle-analyzer` wiring, `experimental_taintObjectReference` markers. Inferred-return-type sweep across components/routes — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types` (Explore-agent enumeration found Bundle 4 + earlier sweeps had already covered all but one helper in StarField.tsx; remaining src/lib/** functions retain explicit annotations from PR #79).

- **`legal_full_name` in `SWAP_PRESERVED_KEYS`.** Kept as a fallback for
  pre-migration localStorage drafts. Drafts have a 30-day TTL — drop after
  2026-05-29 with confidence.
- **3× `fetchBookingForm` per `/book` flow.** Each of `/book/[id]`,
  `/letter`, `/intake` calls it independently. `cache()`-wrapped per request,
  so 3 separate Worker invocations = 3 fetches. Acceptable today; if Sanity
  CDN ever throttles, batch the fetch upstream.

### react-hooks/refs sweep (deferred 2026-05-09 from `feat/listen-redesign-and-gifting`)

`pnpm update --recursive --depth=Infinity` on the feature branch (run to
patch transitive OSV vulns) bundled an `eslint-plugin-react-hooks` upgrade
that promotes a few previously-warning patterns to errors. Three locations
got targeted `eslint-disable` lines with reason comments to unblock CI;
they need a proper refactor before the branch merges to main.

- `src/components/Form/DatePicker/DatePicker.tsx` — `setMonth(selected)`
  inside an effect (`react-hooks/set-state-in-effect`). Refactor to
  derived state via `useState` initializer or `useMemo`-driven month.
- `src/components/IntakeForm/IntakeForm.tsx:194` —
  `setSwappedFromReadingName(readingName)` inside the restore-on-mount
  effect. Same rule. Refactor: hoist the swap detection to a
  `useSyncExternalStore` or a derived value computed at render.
- `src/components/IntakeForm/IntakeForm.tsx:268` —
  `currentPageRef.current = currentPage` outside an effect (`react-hooks/refs`).
  Refactor: replace the ref-mirror pattern with `useEvent`-style stable
  callback or move the focus-listener registration inside the effect that
  already knows about `currentPage`.
- `src/components/IntakeForm/IntakeForm.tsx:632` (`currentSections.map`) —
  `renderField` closure captures `requestFreshTurnstileToken` which reads
  `turnstileRef.current` (`react-hooks/refs`). Refactor: pass a stable
  ref-resolver via context or move Turnstile orchestration up the tree.

### Sanity TypeGen adoption (deferred 2026-05-09)

`next-sanity` 12.4.5 (bundled with the same dep refresh) tightened
`sanityFetch`'s data type to `ClientReturn<QueryString, unknown>` —
without registered query→type mappings it falls through to `unknown`.
Workaround: typed wrapper at `src/lib/sanity/live.ts` that takes an
explicit `<T>` and asserts the result. Each `fetch.ts` wrapper supplies
`<T>` per call. Long-term fix is **Sanity TypeGen**: scan `groq` queries
+ schema, emit `query-types.d.ts`, and the typed wrapper becomes
unnecessary. Setup is `pnpm exec sanity typegen generate` against
`studio/schema.json`. ~1 session of work plus CI integration so the
generated file stays current.

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

#### Sub-PRs #4b + #4c — RE-SCOPE BLOCKER (locked 2026-05-07)

**Both deferred pending a broader email-stack rediscussion.** Originally next-up after the #4a bake; the call now is to NOT build #4b or #4c in-codebase before deciding whether the email layer should move to a CRM (Mailchimp / similar — see CLAUDE.md "Post-launch future enhancements → Email automation → outsource to a CRM"). If the CRM migration lands first, parts of #4c (digest cron + per-booking notification) likely move into the CRM's automation layer; building them in-codebase now risks throwaway work.

**Scope of the rediscussion (must happen before any #4b/#4c implementation):**
- Which CRM (Mailchimp working assumption, but unconfirmed with Becky).
- What email types migrate: booking transactionals (`order_confirmation`, `day_2`, `day_7_delivery`, `day_7_overdue_alert`)? Marketing? Digest reminders to Becky?
- What stays in-code: admin notifications (Josephine alert), ICS attachment on per-booking email (calendar-attachment generation isn't a CRM primitive), `/api/sanity-sync` mirror cron.
- The Studio queue pane (#4b) is independent of email — could ship standalone if the CRM discussion stalls. Council-locked split rationale (research artefacts in `www/MEMORY/WORK/20260507-045653_subpr4-studio-file-upload-day7-delivery/PRD.md`) still stands.

Original scope kept below for reference.

#### Sub-PR #4b — Studio queue view (FOLLOW-UP, parked pending rediscussion)
- **Scope.** Custom Sanity Structure pane "Awaiting delivery" — pinned in Studio sidebar, GROQ-filtered to `_type == "submission" && status == "paid" && !defined(deliveredAt)`, sorted by `paidAt asc` (oldest first). Submission preview subtitle shows days-since-paid as plain text (e.g. "Day 4 of 7"). No traffic-light badges yet — defer until Becky asks.
- **Reuses from 4a.** The `isDeliverable()` predicate inverse for the filter; the GROQ shape from `fetchDeliverableSubmissions()`.
- **Effort.** ~1 day.

#### Sub-PR #4c — Becky-proactive pings (FOLLOW-UP, parked pending rediscussion)
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

## Phase 1 magic-link auth — review deferrals (LAUNCH-BLOCKING)

5-vantage code review on 2026-05-10 (Engineer + Pentester + /simplify Reuse/Quality/Efficiency) surfaced ship-blockers (#1–#5) and should-fix items (#6–#11) that landed in the same PR as the auth foundation. The items below were deferred — they MUST land before apex unpark / Stripe live-mode flip. Tracked here so they don't drift.

**Hard gate: every item in this section is launch-blocking.** Apex stays parked until they're shipped or explicitly closed-as-won't-do.

### A. Deferred from review (correctness/security follow-ups)

#### A-1. Unicode NFC normalization in `normalizeEmail`
- **Source:** Code review Pentester [LOW-7] 2026-05-10.
- **What:** `src/lib/auth/users.ts` `normalizeEmail` does `.trim().toLowerCase()` only — no `.normalize('NFC')`. A user whose email client autocompletes a decomposed form (`café@x.com`) while Stripe stored the precomposed form (`café@x.com`) will be locked out at email-match.
- **Action:** Add `.normalize('NFC')` in `normalizeEmail`; apply at both write (getOrCreateUser) and read (redeemMagicLink) sites. Bundle with the auth-polish PR.

#### A-3. Constant-time token-hash comparison
- **Source:** Code review Engineer [NIT] 2026-05-10.
- **What:** SQLite `WHERE token_hash = ?` short-circuits string equality; over a high-volume endpoint with timing observability this leaks bits. Practical risk is low because the attacker would need to generate the SHA-256 hash *prefix* (not the raw token), but defense-in-depth is cheap.
- **Action:** Phase 4 hardening. Apply `crypto.timingSafeEqual` after the lookup in `redeemMagicLink` + `getActiveSession`. Or accept the residual risk and document.

#### A-5. Session cookie rotation on use
- **Source:** Code review Engineer [surprise] 2026-05-10.
- **What:** 7d session cookie with a static value + Level 1 email-match only + no IP binding = stolen cookie is good for the full TTL with zero detection signal. Standard pattern, but combined with the rest of the threat model it's the residual risk.
- **Action:** Phase 4 threat-model doc + (optional) sliding-expiry-with-rotation. Decide: document residual risk vs implement rotation.

#### A-6. Cleanup cron for stale unconsumed magic links
- **Source:** Code review Engineer [surprise] 2026-05-10.
- **What:** No upper bound on how many unconsumed magic links can exist for a user. An attacker (or buggy client) could trigger thousands of issuances. Each row is small but the table grows unbounded.
- **Action:** Phase 4 cleanup-cron addition. `DELETE FROM listen_magic_link WHERE expires_at < (now - 7 days)`. Add to `/api/cron/cleanup`.

#### A-7. `idx_listen_audit_user` write-amp profiling
- **Source:** Code review Efficiency [INDEX] 2026-05-10.
- **What:** Every audit row writes 4 indexes (PK + idx_user + idx_submission + idx_timestamp). Audit fires on every magic-link issue, every redeem branch, every session start, every session-denial (after fix #7 lands). If audit is queried by `submission_id` 99% of the time, `idx_listen_audit_user` is overhead.
- **Action:** Profile after 30d of production traffic. Drop the index if not queried. Lightweight optimization.

### B. Polish (`/simplify` follow-up batch — single PR after main PR lands)

These are noise-level items the 5-vantage review surfaced. Bundle into one `/simplify` PR after the main session-1 auth foundation merges.

#### B-1. Lift `sha256Hex` into `src/lib/hmac.ts`
- **Source:** Code review Reuse [REUSE-OPP] 2026-05-10.
- **What:** `src/lib/auth/listenSession.ts` defines a private `sha256Hex` that wraps `crypto.subtle.digest` + manual hex conversion. `src/lib/hmac.ts` already exports `bytesToHex` — exactly the same byte-to-hex loop.
- **Action:** Export `sha256Hex` from `src/lib/hmac.ts` (reuses `TEXT_ENCODER` + `bytesToHex`). Import in `listenSession.ts`. `src/lib/auth/users.ts` doesn't currently use it but will after fix #2 lands — same import.

#### B-2. Use `normalizeEmail` instead of inline `trim().toLowerCase()`
- **Source:** Code review Reuse [REUSE-OPP] 2026-05-10.
- **What:** `src/lib/auth/listenSession.ts:192` currently does `args.claimedEmail.trim().toLowerCase()` inline; `users.ts:19` already exports `normalizeEmail`.
- **Action:** Import + use `normalizeEmail`. One-source-of-truth so the future NFC fix (A-1) auto-propagates.

#### B-3. `seedSubmissionForUser` test helper → `repo.createSubmission`
- **Source:** Code review Reuse + Quality + Engineer (3-lens convergence) 2026-05-10.
- **What:** `src/lib/auth/listenSession.test.ts` writes raw SQL to seed test rows, bypassing `createSubmission`. Drift risk: any future column added to `submissions` won't be exercised by these tests.
- **Action:** Lift to `src/test/seeds/submissions.ts` with a richer signature (`{ id, userId, status?, email?, readingSlug? }`). Reuse from Phase 2/5 tests.

#### B-4. `denyAndAudit` helper to collapse 4× duplicated audit writes
- **Source:** Code review Quality [NIT] 2026-05-10.
- **What:** `redeemMagicLink` repeats the same `await writeAudit({...}); return { ok: false, reason }` block at 4–5 error branches. Real divergence already showed up: `link_invalid` branch was missing `userAgentHash` that `link_email_mismatch` included.
- **Action:** Extract `denyAndAudit(reason, eventType, { userId, ipHash, userAgentHash, submissionId, now })`. Enforce consistency by construction.

#### B-5. Drop "iter 2" iteration markers from comments
- **Source:** Code review Quality [NOISE] 2026-05-10.
- **What:** `migrations/0004_listen_auth.sql:1` says "user-keyed (iter 2)"; `listenSession.ts` header has "Identity model (iter 2)" preamble. Iteration numbers belong in git, not the source.
- **Action:** Strip iteration markers; keep substantive content.

#### B-7. Drop tautological `constants` describe block
- **Source:** Code review Engineer [NIT] 2026-05-10.
- **What:** `src/lib/auth/listenSession.test.ts` has a `describe("constants")` block asserting literal numbers (`MAGIC_LINK_TTL_MS === 24*60*60*1000`). This is testing TypeScript, not behavior.
- **Action:** Delete the block.

#### B-8. Make `dailySalt` rotation test boundary-explicit
- **Source:** Code review Engineer [BUG-test] 2026-05-10.
- **What:** Current "different day, different hash" test uses `Date.UTC(2026, 4, 9, 12, 0, 0)` + 24h, which works but is fragile across timezone/locale assumptions.
- **Action:** Construct `day1 = day_n * 86_400_000` and `day2 = (day_n+1) * 86_400_000` explicitly so the test asserts the floor-arithmetic boundary directly.

#### B-10. Add explicit "forwarded-link Level 1 success path" test
- **Source:** Code review Engineer [BUG-test] 2026-05-10.
- **What:** No test explicitly frames the case "issued for alice; redeem with claimedEmail='alice@example.com' succeeds and grants alice's session". The current happy-path test covers this mechanically but not as the documented Level 1 hardening property.
- **Action:** Add a clearly-named test asserting the property + invariant comment.

---

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
