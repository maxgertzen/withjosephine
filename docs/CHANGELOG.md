# Josephine Soul Readings — Changelog

Historical ledger of shipped work. Active state, parked work, and durable rules live in `CLAUDE.md` at the project root. Add to this file when a PR merges; do not edit shipped entries.

---

## PR ledger

| PR | What | Status |
|----|------|--------|
| **PR-A** | Schema seed + v6 form migration | ✅ shipped |
| **PR-B** | IntakeForm refactor — paginated render, per-page Zod, PageNav, §4 enforce-3, §3 birth-time toggle, helperPosition, PlaceAutocomplete | ✅ shipped |
| **PR-C** | v6 entry page (vellum-letter folio + drop-cap CTA) | ✅ shipped |
| **PR-D** | localStorage save/resume, reading-swap preservation, SwapToast, SubmitOverlay | ✅ shipped |
| **PR-D-2.0** | Floating labels + soft <18 DOB warning | ✅ shipped |
| **PR-E** | SPEC §13 verbatim email helpers · `emailsFired` audit array · 3 crons (day-2 / day-7 alert / day-7 deliver) · `/listen/[token]` HMAC-gated page | ✅ shipped |
| **PR #34–#41** | Initial deploy infra (Workers + D1 + R2 + Turnstile + Resend wiring) | ✅ shipped |
| **PR #42–#44** | Apex 500 debug + final fix (drop `outputFileTracingExcludes`) | ✅ shipped |
| **PR #45–#47** | Same-day post-fix follow-ons (Turnstile in CI; image preview + draftMode gate; CSP `blob:` for img-src) | ✅ shipped |
| **PR #48** | Logo refresh — high-res Hero + responsive mobile/desktop horizontal | ✅ shipped |
| **PR #49** | D1 client REST → workerd binding refactor + R2 preview-bucket cleanup | ✅ shipped |
| **PR #54** | Forward `NEXT_PUBLIC_UNDER_CONSTRUCTION` to CI build env | ✅ shipped |
| **PR #55** | Middleware-level apex lockdown (closed the `/book/*` + `/api/*` leak) | ✅ shipped |
| **PR #56** | Docs — staging-tier scope + Phase-2 fully-booked toggle | ✅ shipped |
| **PR #57 (PR-F)** | Mixpanel client + 13 SPEC §15 events + geo-conditional consent banner + Sanity-editable banner copy + non-prod opt-in gate + dead BookingForm component purge + privacy policy patch | ✅ shipped 2026-05-02 |
| **PR #58–#65 (PR-S series)** | Dev/staging/prod environment separation: D1 migration runner, Sanity staging seed, wrangler env split, staging Custom Domain, RESEND_DRY_RUN gate, `/api/sanity-sync` auto-mirror | ✅ shipped 2026-05-06 |
| **PR #66** | Sanity `priceDisplay`↔`price` validation rule + prebuild bake of reading prices to `src/data/readings.generated.ts` | ✅ shipped 2026-05-06 |
| **PR #67 (PR-F2)** | Server-side Mixpanel events (payment_success, payment_expired, email_sent ×6 sub-types, delivery_listened) via `Sentry.withSentry`-style fetch helper + `submission_id` identity threading | ✅ shipped 2026-05-06 |
| **PR #68** | Weekly `/api/cron/check-price-drift` (prod-only schedule) firing `pricing_drift_detected` to Mixpanel + CF analytics token CI plumbing | ✅ shipped 2026-05-06 |
| **PR #69** | Backlog: drop Mixpanel-scheduled-report follow-up (free tier paywalls subscriptions) | ✅ shipped 2026-05-06 |
| **PR #70** | Rip unused CF Web Analytics; add `@sentry/cloudflare` server-side error capture via OpenNext customWorker pattern + PII-scrubbing `beforeSend` | ✅ shipped 2026-05-06 |
| **PR #71** | `@sentry/browser` client-side error capture (consent-gated via `<AnalyticsBootstrap>`) + sentry-cli client-bundle sourcemap upload (`productionBrowserSourceMaps: true` + `scripts/upload-sourcemaps.mjs` with finally-block public-output strip) + `deriveEnvironmentFromHost` shared util | ✅ shipped 2026-05-06 |
| **PR #72** | Hotfix: `@sentry/cli` named-import shape (`{ SentryCli }`, not default) — fixes `SentryCli is not a constructor` on staging deploy. End-to-end verified: 43 `.map` files stripped, sourcemaps uploaded to Sentry, no public sourcemap leak | ✅ shipped 2026-05-06 |
| **PR #73 (Item #4)** | `@react-email/components` migration of all 6 transactional emails. TDD-first. `<Tailwind config={emailTailwindConfig}>` brand-token provider | ✅ shipped 2026-05-07 |
| **PR #74 (Sub-PR #4a)** | Sanity file-upload UI for Day-7 delivery. `voiceNote` + `readingPdf` as `file` fields + cross-field validation. New `isDeliverable()` predicate + GROQ helpers. Day-7-deliver cron sources from Sanity → mirrors to D1 → sends (asset existence is the readiness flag — no TOCTOU). Day-7 alert cron queries Sanity for `!defined(deliveredAt)` to avoid race | ✅ shipped 2026-05-07 (commit `2d183f4`) |
| **PR #75** | Integration branch `feat/operational-completeness` → main. Carried Item #1 (OpenNext `scheduled` handler dispatch in `custom-worker.ts`; wrangler crons map `event.cron` → `/api/cron/*` via `src/lib/cron-routes.ts` with `cf-cron: 1`), Item #2 (`/api/cron/reconcile-mirror` D1 → Sanity diff cron, walks last 7 days, uses pure `diffSubmission` helper), PR #73 (react-email migration), PR #74 (Sub-PR #4a) | ✅ shipped 2026-05-07 (commit `e3331dd`) |
| **PR #76 (Bundle 1)** | F-11 constant-time cron-auth via `timingSafeStringEqual`; submission orphan-field cleanup (`clientReferenceId`, `abandonmentRecoveryFiredAt`) including D1 migration `0003_drop_orphan_columns.sql`; CI-gated build-time Turnstile bypass assertion; TrustLine deletion; `letter/page.tsx` IIFE simplification | ✅ shipped 2026-05-07 |
| **PR #77 (Bundle 2)** | `trackThrottled(event, props, intervalMs)` analytics helper; `intake_save_auto` 30s rate-limit; `<SavedIndicator>` extracted from IntakeForm; `consentEffectRanRef` ref-guard in AnalyticsBootstrap | ✅ shipped 2026-05-07 |
| **PR #78 (Bundle 3)** | `experimental_taintObjectReference` markers via `src/lib/taint.ts` on Sanity write client / Stripe / R2 / D1 SQL client; `@next/bundle-analyzer` + `pnpm analyze` script; inferred-return-type sweep on 6 named functions (with `deriveEnvironmentFromHost` narrowing from `string` to a 4-literal union) | ✅ shipped 2026-05-07 |
| **PR #79 (Bundle 4)** | Broader inferred-return-type sweep across `src/lib/**` (~20 more function signatures). Promise-returning async exports kept for IDE-hover docs. Reverted attempted `useMemo` hoist of `process.env.NEXT_PUBLIC_*` reads after simplify pass — Next's DefinePlugin already inlines these as string literals, so inline reads are optimal | ✅ shipped 2026-05-07 |
| **PR #81** | Clear form button (inline morph, idle ⇄ confirming, focus mgmt, Esc handler — replaces ad-hoc `window.confirm()` after Designer + a11y council debate) + 72h idle TTL flip + `valuesUntouched` save-gate (fixes ghost empty-defaults autosave on mount) + BookingFlowHeader wordmark→home. Two `/simplify` passes + durable rule `feedback_no_native_browser_dialogs.md` | ✅ shipped 2026-05-07 |
| **PR #82 (bundle)** | Items 5+6 from the quality sweep. **Item 4 dropped** (Mixpanel CWV duplicates Clarity's native LCP/INP/CLS widget). **Item 5** — `<DelegatedTracking>` document-level listener reading `data-mp-event` + `data-mp-*` snake_case props → fires new `trackUntyped()` escape hatch. **Item 6** — Microsoft Clarity wired (external `<Script src>` form for CSP compliance, mounted from `<AnalyticsBootstrap>` post-consent, gated via shared `shouldEnableClientObservability` helper, CSP `*.clarity.ms` allowlist). Privacy policy patch script staged (`scripts/migrate-privacy-clarity.ts`, idempotent) | ✅ shipped 2026-05-07 |
| **PR #83** | Clarity EU-traffic hardening (closes 4 gaps surfaced by deeper research after PR #82 merged). Consent API v2 wiring (mandatory since 2025-10-31 for EEA/UK/CH per Microsoft) — `clarityConsent(true)` called at each grant site; CSP allowlist extended with `https://c.bing.com` (Microsoft beacon endpoint Clarity routes telemetry through); `<ClarityRouteTracking>` for App Router soft-nav so the multi-step intake doesn't read as one page in replays; `data-clarity-mask="True"` on the intake form + photo-preview container as belt-and-suspenders alongside Strict masking. Shared `src/lib/clarity.ts` types + `CLARITY_MASK_PROPS` constant prevent capital-T typos. Privacy patch script updated to name Microsoft Ireland Operations Limited as EU controller. Durable rule saved: `feedback_csp_check_before_script_tag.md` | ✅ shipped 2026-05-07 |
| **PR #84** | Migrate Clarity Consent API v1 → v2 surfaced by verify-against-docs research. PR #83 used `clarity("consent", true)` (v1, legacy); Microsoft now recommends `clarity("consentv2", { ad_Storage, analytics_Storage })` (v2, Google-Consent-Mode shape). Clean migration with no legacy v1 overload retained — Clarity wasn't yet live in prod when v2 landed (project ID provisioned same day, still in initial-install ingestion window). `ad_Storage: "denied"` hardcoded (site doesn't run ads); `analytics_Storage` reflects the consent state. Helper signature `clarityConsent(granted: boolean)` preserved; only the internal API call shape changed. Durable rule saved: `feedback_verify_vendor_claims_against_docs.md` | ✅ shipped 2026-05-07 |
| **PR #85** | Quality sweep — projection cleanup + copy carry-over + return-type sweep bundled into one branch. **Schema deletions** (9 PROJECTED-BUT-UNUSED fields with zero consumers): `bookingPage.{emailLabel, emailDisclaimer, securityNote, closingMessage}`, `bookingForm.{title, intro, description, confirmationMessage}`, `thankYouPage.steps`. **Wire-up**: `bookingPage.paymentButtonText` → IntakeForm `submitLabel` → PageNav. **6 new editable knobs**: `bookingForm.{nextButtonText, saveAndContinueLaterText, pageIndicatorTagline}` + `landingPage.contactSection.{successHeading, successBody, sendAnotherButtonText}`. **Audit corrections**: 4 fields the audit had marked "ambiguous" verified CONSUMED (`bookingForm.entryPageContent.*`, `pagination.overrides`, `loadingStateCopy`, `nonRefundableNotice` — schema description fixed + `validation: required`). **Inferred-return-type sweep on components/app**: Explore-agent enumeration found 1 actual gap (`StarField.tsx round`); Bundle 4 + earlier sweeps had already covered the rest. **Seed script** `scripts/seed-quality-sweep-fields.mts` (manual run by Max against prod + staging). 799/799 tests green | ✅ shipped 2026-05-07 |
| **PR #86** | Staging-smoke follow-ups to PR #85 surfaced during Max's staging verification: (1) **Contact form 500 fix** — route was treating `sendContactMessage`'s `null` resendId as a config failure even under `RESEND_DRY_RUN=1` (staging's intentional setting). Route now checks `isFlagEnabled("RESEND_DRY_RUN")` and treats null-id-under-dry-run as 200 success. New test covers the dry-run success path. (2) **Seed script paymentButtonText force-set** — `setIfMissing` couldn't update the pre-PR-#85 default (`Continue to Payment`, capital P, no arrow); switched to fetch-then-set so the canonical `Continue to payment →` form lands. Idempotent. (3) **New `scripts/cleanup-orphan-field-values.mts`** — unsets the 14 orphan field VALUES on bookingForm / bookingPage / thankYouPage docs that triggered Studio "Unknown fields found" warnings after the schema deletions in PR #80 + PR #85. (4) **Staging runbook hardening** — § 3 R2 bucket step now has explicit token-bucket-scope expansion + full CORS JSON example + write-probe verification, so the next env doesn't repeat the staging upload diagnostic that ate hours on 2026-05-07. (5) `/simplify` follow-ups: TODO comment at the route's dry-run check pointing at the deferred `EmailSendResult` discriminated-union backlog item; explicit `vi.stubEnv("RESEND_DRY_RUN", "")` on the existing 500 test for env-pollution hygiene; `ORPHANS as const satisfies Record<string, readonly string[]>` for typo-catch. Three new backlog items captured: defaults-merge convention drift, `EmailSendResult` discriminated union, `scripts/_lib/sanity-write-client.mts` helper extraction. Plus pre-checkout review-step backlog item queued for next session. 800/800 tests green | ✅ shipped 2026-05-08 |
| **PR #87** | Sanity Studio multi-workspace config (Production + Staging). Single-workspace Studio was binding the dataset at deploy time via `SANITY_STUDIO_DATASET`, so editors couldn't tell which dataset they were editing. Now `defineConfig([{...production}, {...staging}])` — sidebar shows a workspace switcher labeled Production / Staging with distinct preview URLs (`withjosephine.com` / `staging.withjosephine.com`) per workspace. URL changed: `withjosephine.sanity.studio/` → `…/production` and `…/staging` (root now shows a workspace picker). Pre-existing `studio/schemas/submission.ts` file-validation type errors remain — Studio's deploy script doesn't run typecheck so they don't block | ✅ shipped 2026-05-08 |
| **PR #88** | Pre-checkout review step on intake form + DOB/TOB autoformat. **ReviewSummary** card stack on the final intake page above the consent block — per-section cards with the user's filled answers and an Edit link that snaps back to the matching page (state preserved by the existing localStorage draft). Skips consent + companion fields (`_unknown`, `_geonameid`). multiSelect renders as a list, file uploads as an 80×80 thumbnail (R2 public origin), dates as Locale long form without timezone shift. **DatePicker** auto-inserts slashes as digits are typed; displays DD/MM/YYYY consistently; calendar overlay tracks the typed value via controlled month state. **TimePicker** auto-inserts the colon as digits are typed; non-digits stripped. **PageNav** submit + next buttons get `whitespace-nowrap` so the "Continue to payment →" arrow doesn't wrap. New `COMPANION_SUFFIX_UNKNOWN` / `COMPANION_SUFFIX_GEONAMEID` and shared `FieldValue` / `FieldValues` types extracted | ✅ shipped 2026-05-09 (commit `12b4bca`) |
| **PR #89** | Thank-you page Sanity wiring + GDPR preview toggle + Clarity img-src CSP fix. **Thank-you page**: 5 new Sanity fields on thankYouPage (readingLabel, confirmationBody, timelineBody, deliveryDaysPhrase, contactBody) + small `renderWithSlots` helper to substitute `{deliveryDays}` and `{email}` inline. Mailto now reads `siteSettings.contactEmail` with the existing `CONTACT_EMAIL` constant as fallback. **GDPR preview toggle**: `siteSettings.consentBanner.hideInPreview` boolean — when ticked, the banner is suppressed inside Studio Presentation iframes so editors can edit pages underneath. Real GDPR/CCPA visitors are unaffected. **CSP fix**: `img-src` extended with `https://*.clarity.ms` so the c.gif heartbeat pixel stops being blocked (the downstream "a[c] is not a function" TypeError observed in staging logs was a symptom of this same block — Clarity's tag throws when the prerequisite request fails). New scripts: `seed-content-wiring-sweep.mts` (idempotent setIfMissing for canonical defaults), `promote-staging-to-production.mts` (one-time staging→prod copy via createOrReplace, with explicit type allowlist that REFUSES to touch the `submission` type — customer PII protection) | ✅ shipped 2026-05-09 (commit `7941744`) |

PR-E intentional omissions (not bugs): Stripe sessionId server-verify on `/thank-you` (Stripe redirects only on success — URL is the proof), abandonment-recovery (would touch users who never reached consent step — Mixpanel funnel covers visibility need), Resend template IDs (bodies inlined; defer).

---

## Pre-launch punch list — DONE

| # | Task | Status |
|---|------|--------|
| 1 | Contact form fix (web3forms → Resend) | ✅ |
| 2 | Manual e2e smoke test (320/375/768/1024 px) | ✅ |
| 3 | Code review pass + must-fix sweep | ✅ |
| 4 | Security review pass + fixes (listenToken expiry, R2 ContentLength signing, Turnstile gate on upload-url) | ✅ |
| 5 | Push branch to origin + merge + deploy | ✅ (PR #34 → #41) |
| 6 | R2 bucket CORS in CF dashboard | ✅ |
| 7 | Sanity content fill (Soul Blueprint price = $129 per Josephine, not $179 spec) | ✅ |
| 8 | Persistence resilience review (D1 source of truth + Sanity one-way mirror) | ✅ |

---

## Session-shipped narratives

### PRs #66–#70 (2026-05-06)

- **PR #66** — Sanity `priceDisplay`↔`price` validation rule + prebuild bake of Sanity prices into `src/data/readings.generated.ts`. Closes the static-fallback drift class. Data reconcile (canonical price per reading + Stripe Payment Link sync) is Max+Josephine.
- **PR #67** — PR-F2 server-side Mixpanel events: `payment_success`, `payment_expired`, `email_sent` (6 sub-types), `delivery_listened`. `serverTrack` helper at `src/lib/analytics/server.ts`. Threads identity via `submission_id` (not Stripe metadata — Payment Links don't support it).
- **PR #68** — Weekly `/api/cron/check-price-drift` cron firing `pricing_drift_detected` to Mixpanel for any drifty reading. Production-only schedule (Mon 12:00 UTC). Plus CF analytics token CI plumbing (later ripped in PR #70).
- **PR #69** — Backlog cleanup: dropped Mixpanel scheduled-report follow-up (free tier paywalls subscriptions; cron is operational telemetry, Studio yellow warning is the user signal).
- **PR #70** — Ripped unused CF Web Analytics integration. Re-added server-side error tracking via `@sentry/cloudflare` 10.51 in `custom-worker.ts` wrapping OpenNext's worker fetch. PII scrubbing in `beforeSend` (security review caught `/listen/[token]` HMAC + `cf-cron` bearer secret would otherwise leak to issue tracker). DSN as kill switch.

### PR #71–#72 — Sentry browser + sourcemap upload (2026-05-06)

- **PR #71** — Closed the two open Sentry follow-ups from PR #70. `@sentry/browser` for client-side React error capture from `error.tsx` / `global-error.tsx`, gated on the same consent banner as Mixpanel via `<AnalyticsBootstrap>`. Same DSN-kill-switch + PII scrubbing posture as the server SDK; init wrapped in try/catch so a Sentry init throw can never break the React error path. Plus client-bundle sourcemap upload to Sentry: `productionBrowserSourceMaps: true` + `scripts/upload-sourcemaps.mjs` (lazy-import, finally-block deletePublicMaps so `.map` files NEVER reach the public asset output regardless of upload status). `cf:build` chain extended; CI deploy jobs gain `SENTRY_ORG` + `SENTRY_PROJECT` env. Hoisted `deriveEnvironmentFromHost` to shared `src/lib/constants.ts`. Worker-bundle sourcemap upload to Sentry is scoped out — blocked upstream on sentry-javascript#19213.
- **PR #72** — Hotfix for #71's `deploy-staging` failure: `@sentry/cli`'s CJS shape under ESM consumption needed `import { SentryCli }` (named) not `import SentryCli` (default). Skip path didn't reveal it because the constructor was never reached. The `deletePublicMaps()` finally block ran before the throw — no sourcemap leak occurred. End-to-end verified after merge: staging deploy uploaded sourcemaps to Sentry (`[sentry-sourcemaps] upload complete.`), stripped 43 `.map` files, wrangler bundled 88 assets (vs 133 with maps), bundle gzip 4095 KiB unchanged.

### Integration branch PR #75 + Bundles 1–4 (2026-05-07)

`feat/operational-completeness` shipped to main as PR #75 (commit `e3331dd`). Carried 4 sub-PRs as one squash:
- **Item #1** (commit `6e042c4`) — OpenNext `scheduled` handler dispatch in `custom-worker.ts`. Wrangler crons map `event.cron` → `/api/cron/*` via `src/lib/cron-routes.ts` with `cf-cron: 1`.
- **Item #2** (commit `ff0b47c`) — `/api/cron/reconcile-mirror` D1 → Sanity diff cron, walks last 7 days, uses pure `diffSubmission` helper. "Create missing doc" intentionally not implemented (no consent snapshot in D1).
- **Item #4** (PR #73) — `@react-email/components` migration of all 6 transactional emails. TDD-first. `<Tailwind config={emailTailwindConfig}>` brand-token provider.
- **Sub-PR #4a** (PR #74, commit `2d183f4`) — Sanity file-upload UI for Day-7 delivery. New `isDeliverable()` predicate + GROQ helpers. Now in 1-week bake against Becky's first real reading on main directly.

Same-day backlog cleanup PRs landed: PR #76 (Bundle 1), PR #77 (Bundle 2), PR #78 (Bundle 3), PR #79 (Bundle 4). See PR table above for per-bundle detail.

### Quality sweep PRs #82–#87 (2026-05-07–08)

Clarity bundle (#82–#84) → projection + copy + return-type sweep (#85) → staging-smoke fix-ups (#86: contact route dry-run handling, paymentButtonText force-set, orphan-VALUE cleanup script, runbook hardening) → multi-workspace Studio config (#87). Quality-sweep item 4 (CWV→Mixpanel) dropped — Clarity already captures LCP/INP/CLS natively. Manual Max-ops landed alongside the merges: `seed-quality-sweep-fields.mts` + `cleanup-orphan-field-values.mts` ran against staging + production; `pnpm studio:deploy` re-deployed Studio with multi-workspace config. Audit findings docs at `www/docs/audits/orphan-schema-fields.md` + `www/docs/audits/hardcoded-copy.md`.

### Polish shipped beyond the 6-PR plan

- Booking flow split into entry → letter → intake routes (Max overrode v6 single-page after seeing it)
- BookingFlowHeader extracted, BOOKING_ROUTES constants
- NavigationButton + LinkContent (next/link `useLinkStatus`) for click-feedback loaders that swap label with spinner without width shift
- Outlined Button variant on Hero CTA + Nav CTA (matches intake Next button)
- About Josephine link → `/#about` (no separate `/about` page); html `scroll-behavior: smooth` for cross-page hash nav
- Entry page restack: tag/name/price/desc on left, illustration on right, What's Included on left-bottom, Book CTA on right-bottom (centered, top-aligned in cell)
- Thank-you page redo: `sessionId` validation guard, copy reflects email + 7-day timeline, dynamic route
- Field rename: `legal_full_name` → first_name + middle_name (optional) + last_name with letters-only Unicode pattern. Marginalia "Page 1" → "Your name". Migration `scripts/fix-applies-to-refs.mts` + `migrate-name-fields.mts` already applied to live Sanity.
- Cormorant Garamond actually loading now — was silently broken because of a `--font-display` CSS variable name collision between next/font and `@theme inline`. Fixed via abstract `--font-display-source` intermediate so Sanity theme font swaps still work.
- Calendar popover (react-day-picker) restyled to match brand
- Time popover with hour/minute selects (replaced native `<input type="time">`)
- "Anything" repetition cut in §5 (4 → 2 uses)

### Closed in the 2026-04-30 post-apex-fix day

- PR #45 — Turnstile site key forwarded in CI, `?? "bypass"` fallback removed, intake form helper text lifted out of the button column.
- PR #46 — image upload preview thumbnail; `<SanityLive />` gated behind `draftMode()`.
- PR #47 — CSP `img-src` accepts `blob:` (so the new preview actually renders); `cursor-pointer` on file picker + Remove button.
- PR #48 — High-res logos (1536² source for Hero) + responsive Nav (mobile horizontal w/ illustration vs desktop text-only) + optimizer width caps doubled to 2× retina + booking-letter mark + Sanity siteSettings fallback all pointed at `logo-main.webp`. 4 orphan logo files deleted.
- PR #49 — D1 client refactored REST → workerd binding. `createD1HttpClient` (61 LoC, 3 worker secrets, per-request HTTPS) replaced with `createD1BindingClient` using `getCloudflareContext({ async: true })` + `prepare(sql).bind(...).all()/.run()`. `initOpenNextCloudflareForDev()` wired so the binding works under `next dev`. Dead `preview_bucket_name` dropped from `wrangler.jsonc`. Local end-to-end smoke verified before merge.
- Worker secret `D1_DATABASE_ID` corrected to the actual UUID earlier in the day — that was the root cause of the post-deploy submission 500s, fixed without a code change. PR #49 makes the whole secret-misconfig class unreachable.

---

## Deploy infrastructure shipped (initial Workers/D1/R2 setup)

- D1 database `withjosephine-bookings` provisioned, schema migration applied to remote.
- Worker secrets set: `D1_ACCOUNT_ID`, `D1_DATABASE_ID`, `D1_API_TOKEN`, `LISTEN_TOKEN_SECRET`.
- Worker plain var: `BOOKING_DB_DRIVER=d1`.
- Apex `withjosephine.com` added as Custom Domain on the Worker (replaced parked Hostinger A record).
- `preview.withjosephine.com` gated by CF Zero Trust Access.
- R2 CORS configured to allow `https://withjosephine.com` and `http://localhost:3000`.
- Bundle size battle won via: `better-sqlite3` moved out of src tree to test-only, AWS SDK swapped for `aws4fetch`, `@sentry/nextjs` removed (re-enable as `@sentry/cloudflare` in backlog), `@vercel/og` references stripped post-build, NFT excludes for capsize-font-metrics + edge-runtime + react-dom legacy variants. Final compressed worker fits the 3 MiB free-tier limit.
