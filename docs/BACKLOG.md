# Backlog (archived — superseded by dex)

> **2026-05-23 — Task queue migrated to dex.** Source-of-truth for active + queued work now lives in `www/.dex/tasks.jsonl`. Use `dex list` (pending) / `dex list --ready` / `dex show <id>` / `dex create "…" --description "…" [--parent <id>]`.
>
> This file is preserved as **historical reference** for the prose ("why deferred / trigger conditions / vendor context") that didn't fit cleanly into dex descriptions. When promoting an item from prose-only context to active work, copy the relevant trigger/vendor block from here into the dex task description, then strike the prose entry here.
>
> New deferrals go straight into dex (`dex create "…" --priority 3`) — do not append to this file.

---

> Below is the pre-migration content kept for reference. The launch-blocking + actively-queued slice is now tracked in dex; long-tail deferrals (Phase 4b polish, S3-B*, A-*, EFF-*, etc.) remain prose-only here until they get promoted.

---

## Deferred from 2026-05-24 Sub-PR A ship

### Magic-link email subject + body are reading-centric across ALL destinations

The Sanity-driven `emailMagicLink` template at `studio/schemas/emailMagicLink.ts:12,19,33-37` defaults subject + preview + body to "Open your reading" + voice-note/PDF language. The route at `src/app/api/auth/magic-link/route.ts:42-43` fires the SAME template regardless of the `next` destination — `/listen/[id]` / `/my-readings` / `/my-gifts` / `/my-readings/[id]` all get the reading-centric copy. UX flagged 2026-05-24: a purchaser hitting `/my-gifts` → "Send link" gets an "open your reading" email which is wrong context entirely.

**Trigger:** UX session before apex unpark, OR Becky requests differentiated copy per surface. Fix options (pick one):
- **A — neutral copy.** Edit Sanity defaults to "Your Josephine sign-in link" + body that doesn't assume a destination. Cheapest, loses warmth.
- **B — context-aware.** Thread `next` (or a destination enum) into `sendMagicLink`, branch copy by context. New args on sendMagicLink + maybe new Sanity fields.
- **C — per-destination templates.** Split into `emailMagicLinkListen` / `emailMagicLinkGiftAccess` / `emailMagicLinkReadings`. Most flexibility, most schema churn.

### Intake form: "I don't know my birth time" checkbox z-index covers the time + calendar picker

The "don't know what time" checkbox on the intake birth-details page sits on top of the time picker / calendar picker inputs — picker is z-index under it, so clicking through to change time/date is blocked or visually obscured. Surfaced 2026-05-24 during a gift-claim repro on staging.

**Trigger:** next intake-UX session OR Becky reports it. Likely fix surface: the wrapper around the conditional checkbox at the birth-details step (search for the `time_unknown` field key in `src/components/IntakeForm/`).

### Extract SANDBOX_EMAIL_PREFIXES into a shared module to close drift risk

`src/lib/resend.tsx:108` defines the sandbox-prefix list as the source of truth for the dry-run guard. Spec files (`tests/e2e/specs/{gift,listen,stripe,v120-smoke,gift-recipient-listen}-roundtrip.spec.ts`) each hardcode the matching prefix as a raw string. A spec rename OR a new spec that follows a slightly different prefix convention silently re-opens the Resend quota leak with zero test failure.

**Trigger:** any time a new sandbox spec lands, OR a routine refactor pass on the e2e helpers. Fix: move `SANDBOX_EMAIL_PREFIXES` + `SANDBOX_DOMAIN` to a new module `src/lib/booking/sandboxEmails.ts` (worker-safe, no test deps). Import from both `src/lib/resend.tsx` and the spec files; build email addresses as `${SANDBOX_EMAIL_PREFIXES.giftRoundtripPurchaser}${randomUUID()}${SANDBOX_DOMAIN}`. Then a typo / rename at any callsite breaks at TypeScript compile.

### Un-gate UA_AUDIT_HASH_DEPLOYED in sandbox CI

`tests/e2e/specs/listen-roundtrip.spec.ts` has a `test.skip(process.env.UA_AUDIT_HASH_DEPLOYED !== "true", ...)` guard on the `link_issued audit row carries user_agent_hash` assertion. Gate was added because staging precedes per-PR worker deploys — without it, sandbox specs would have asserted the new column on the old worker and failed. Now that `release/v1.2.0` carries Sub-PR A (`364ea77`) and staging is on the new code, the gate can come off.

**Trigger:** any follow-up sub-PR on `release/v1.2.0` that touches the e2e helpers OR a dedicated bookkeeping pass. Either (a) set `UA_AUDIT_HASH_DEPLOYED=true` in `.github/workflows/e2e-sandbox.yml` env, OR (b) remove the `test.skip` line + helper env-var reference entirely.

---

## Deferred from 2026-05-21 smoke-walk fix arc

Items the 2026-05-20 staging smoke walk surfaced that didn't ship in the β / δ / α / γ Sub-PR sequence. Five of the surfaced bugs landed; the rest are queued here with explicit triggers. Full source: `www/MEMORY/WORK/20260521-smoke-walk/HANDOFF.md`.

### C3-b — `/my-gifts` empty listing (purchaser_user_id race at create time)

**Why deferred:** the C3 agent's investigation showed the "missing auth wall" was a misread (pages use intentional three-state pattern). The "empty list" half of C3 has two scenarios. Sub-PR α (#162) closed one (recipient_user_id clobber); the other — `purchaser_user_id` being null on some gift rows — needs live staging D1 inspection to confirm. The gift-create route at `src/app/api/booking/gift/route.ts:239` calls `getOrCreateUser({email, name}).catch(() => null)` — a transient user-resolve failure silently produces `purchaser_user_id = NULL` and that row never surfaces in `/my-gifts`.

**Trigger:** (a) real customer reports empty `/my-gifts` after a successful purchase, OR (b) routine D1 audit finds `purchaser_user_id IS NULL AND is_gift = 1 AND status = 'paid'` rows.

**Investigation steps:** Query staging first: `SELECT id, email, purchaser_user_id, recipient_user_id FROM submissions WHERE is_gift = 1 AND status = 'paid' ORDER BY created_at DESC LIMIT 50`. If any null `purchaser_user_id`, tighten the `getOrCreateUser` retry/backfill in `api/booking/gift/route.ts:239`.

### C4-b — J3 claim/intake heading + listen-page greeting need Sanity schema plumbing

**Why deferred:** Sub-PR δ (#161) closed the two thank-you surfaces via the `recipientNameFor` fallback chain. The remaining two C4 surfaces need Sanity copy schema additions:
- `studio/schemas/giftIntakePage.ts` `headingWelcome` field has no `{recipientName}` token; default is "Welcome — a few things before we begin." → needs token + slot pass.
- `studio/schemas/listenPage.ts` has no recipient-greeting field; default `welcomeRibbon` is generic. Needs new schema field + prop threading through `ListenView`.

**Trigger:** next session that touches Sanity copy schemas, OR Becky asks to personalise either surface.

### C5 — `/api/booking/gift-redeem` intermittent 400 root cause

**Why deferred:** Sub-PR γ (#163) added structured logging at every silent 400 branch. The next reproduction self-identifies which branch fired. Until then, a fix is speculation.

**Trigger:** next 400 in wrangler tail emits a `[gift-redeem] *_rejected` log line, OR Max reports another mid-flow submit failure.

### U2 — Multi-hop magic-link friction (J1c + J3c)

Listen-page magic-link flow has too many steps: enter email → "send link" email → click link → enter email AGAIN → new link → click → enter email AGAIN → THEN listen. Both customer (J1c) and recipient (J3c) hit it. **Update 2026-05-23 (Max report):** symptom is worse than original framing — Max had to click "send link" 5-6 times in one round before the listen page rendered. Reframes the open question from "is multi-hop intentional?" to "what's broken in the redeem → cookie-set → /listen render chain that re-prompts the form?". Hypotheses: cookie path/domain mismatch, redirect-target form-render preceding cookie visibility, single-use token consumed by a prefetch / OG scraper, Level-1 email-match silently failing.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #10). **ROOT-CAUSED + PRD'd 2026-05-23:** investigation found U2 is data-integrity downstream of U6, not an auth-redirect loop. `recipient_user_id` on submission `bb5fe157` was bound to the purchaser at gift-claim time because the recipient_email field wasn't locked. PRD: `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md`. Ships as 4 sub-PRs (lock+422 gate, forensic UA-hash, CheckEmailCard resend fix, data-repair).

### U3 — Listen-page downloads use opaque/hashed filenames

Voice-note and PDF downloads arrive with Sanity asset hashes as filenames. Should preserve the original Sanity asset filename, OR set a readable default via `Content-Disposition` (e.g. `soul-blueprint-voice-note.mp3`). Likely fix surface: `/api/listen/[id]/audio` + `/api/listen/[id]/pdf` route handlers.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #11). Quick-win sub-PR candidate alongside U5.

### U4 — Hover affordance audit

Not all buttons have `cursor: pointer` on hover (flagged in J2). Needs broader UX sweep.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #12). Mechanical sweep across Button + anchor-styled-as-button + form-control wrappers.

### U5 — Gift-purchase form: purchaser email not prefilled

Gift purchase doesn't prefill the purchaser email for repeat customers. Standard purchase flow does. Lift the email-prefill mechanism from the self-purchase entry page into the gift entry page.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #13). Quick-win sub-PR candidate alongside U3.

### U6 — Recipient-email lock inconsistent across reading types

J2 (Birth Chart self-send) didn't lock the email field; Akashic gift-claim DID. Pick one behavior and apply uniformly: lock = friction but prevents misroute; unlock = flexibility.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking**, **MERGED INTO U2 PRD**. Investigation 2026-05-23 found U2 and U6 share a single root cause (recipient_user_id corruption at gift-claim time, downstream of the unlocked recipient_email field). Decision D-2 in `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md` locks the policy: gift-claim intake renders recipient_email as readOnly, value-bound to `submission.recipient_email`, with `RecipientEmailEscapeHatch → /contact` callout for legitimate change requests. Server-side 422 gate in gift-redeem on NFKC-normalized mismatch as defense-in-depth.

### U7 — Studio preview of customer-facing pages

Becky can't preview customer-facing pages (booking, thank-you, listen, /my-gifts) from inside Studio. Explore: extending Presentation Tool wiring, or a Sanity Studio plugin.

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #15). Bundle with U8 as a Studio-side PR (both touch deskStructure / preview / Presentation wiring).

### U8 — Studio: visible "claimed at" + delivery countdown

Becky has no at-a-glance "claimed" signal. Now that `giftClaimedAt` is in the schema (Sub-PR β #160), surface it in the Submissions list/preview. Also consider a countdown UI ("5 days left to deliver") and a distinct status "claimed, awaiting delivery" (currently conflated with `paid`).

**Trigger:** ⛔ PROMOTED 2026-05-23 — **launch-blocking** (apex-unpark hold-gate item #16). Bundle with U7 as a Studio-side PR; decision needed on whether to add a new submission status enum value or compute claimed-vs-paid from `giftClaimedAt` presence.

### S3 — Studio: `deliveredAt` UX (Becky kept forgetting)

Becky forgot to set `deliveredAt` on both J3 and J4 — uploads landed but field stayed unset → `isDeliverable()` GROQ rejects → Day-7 cron sees `awaitingAssets`. Options (pick 1, possibly all):
1. Auto-set `deliveredAt` on first asset upload.
2. Prominent "Mark as delivered" CTA next to the assets.
3. Rename for clarity ("Ready to send to customer").
4. Validation prompt on Publish if assets present but `deliveredAt` empty.

**Trigger:** Studio UX session, or Becky asks for it.

### S4 — Studio Submissions list default-sort DESC

Surfaces oldest at top; should default-sort `createdAt DESC` for Becky's day-of workflow. Likely fix in `studio/schemas/deskStructure.ts`.

**Trigger:** next Studio-touching session (small ~5min change).

### L2 — Doc note: wrangler `--format json` emits multi-line JSON, not JSONL

Wrangler tail with `--format json` is multi-line pretty-printed (not JSONL). Bit the smoke walk's monitoring loop. Fixed mid-run by piping through `jq -c '.' --unbuffered | tee <log>`. If any operator script in `tests/e2e/helpers/` or `scripts/` depends on `--format json` being JSONL, document the actual shape.

**Trigger:** future operator script consumes wrangler tail output.

---

## Shipped 2026-05-18 — release/v1.1.0 (deploy + run-after)

### #5 + #7 — Transactional emails silently skipped on staging — root cause + fix

**Root cause:** `wrangler.jsonc` line 264 had `"RESEND_DRY_RUN": "1"` in the `env.staging.vars` block. Every `wrangler deploy --env staging` reset the Worker's env to include that flag (per `feedback_wrangler_vars_declarative.md`). The flag is documented in `tests/e2e/README.md:14` as an E2E-spec-only toggle, never meant for the deployed staging Worker. `sendOrSkip` honored the flag and returned `{kind: "dry_run"}` for every transactional email, logging `[resend] RESEND_DRY_RUN — skipping ...` to the staging worker. Webhook signatures verified fine; emails were prepared but never sent.

**Fix in this release:** Removed the line from `wrangler.jsonc`. Next staging deploy clears the variable.

**Verified on 2026-05-18 via `wrangler tail --env staging`:** Resend DNS on apex (SPF, MX, DKIM, DMARC) all verified. Staging worker has `RESEND_API_KEY` + `STRIPE_WEBHOOK_SECRET` + `STRIPE_SECRET_KEY` + `NOTIFICATION_EMAIL` set. The webhook was firing successfully and Stripe signatures were verifying — the dry-run flag was the only failure point.

**Resend recovery for any customer whose pre-fix purchase missed the email:**
Becky now has a Studio document action `Resend customer email…` (on submission docs with status=paid). Picks order_confirmation / day +2 / day +7. Admin-token gated; rate-limited to 3 resends per email-type per submission per 24h. Audit trail in `emailsFired`. Powered by `/api/admin/resend-customer-email` (see `src/lib/booking/resendCustomerEmail.ts`).

For gift-purchase emails (where the claim URL has lifecycle), use the existing `Regenerate gift claim link` action — it re-issues the URL + re-sends.

---

## Main-merge blockers (filed 2026-05-18)

### brace-expansion 5.0.5 ReDoS CVE (GHSA-jxxr-4gwj-5jf2) — coordinated minimatch upgrade

OSV-scan filters this CVE in `osv-scanner.toml` because the direct fix breaks the toolchain.

**The problem:** brace-expansion@5.0.5 has a MEDIUM ReDoS (GHSA-jxxr-4gwj-5jf2, published 2026-05-18). Fixed in 5.0.6. Pinning via `pnpm.overrides` to `^5.0.6` breaks ESLint with `TypeError: expand is not a function` — the failure originates in `minimatch@3.1.5` calling brace-expansion's default export as a function (broken by the 5.0 export-shape change).

**Why it's filtered, not fixed:** brace-expansion is used transitively by build/test tooling (glob/minimatch chains pulled in by ESLint, Storybook, and similar). No application code calls brace-expansion on untrusted input at runtime, so the ReDoS risk in production is zero. Filter is acceptable as an interim posture.

**Promotion path:**
1. Identify which dependency tree pulls in `minimatch@3.1.5`. Likely candidate: `@eslint/config-array` or a vendored old eslint plugin.
2. Pin minimatch via `pnpm.overrides` to a version compatible with brace-expansion 5.0.6 (minimatch 9.x+).
3. Re-add `"brace-expansion@<5.0.6": "^5.0.6"` to `pnpm.overrides`.
4. Verify `pnpm install && pnpm lint && pnpm typecheck && pnpm test && pnpm build` all clean.
5. Remove the GHSA-jxxr-4gwj-5jf2 entry from `osv-scanner.toml`.

**Trigger:** any of: (a) brace-expansion CVE escalates from MEDIUM to HIGH, (b) discovery that brace-expansion IS reachable from user input at runtime (would change the risk profile), (c) routine quarterly toolchain refresh hits this entry.

### Production D1 migration drift — apply 0004 → 0012 at main-merge time

Staging D1 (`withjosephine-bookings-staging`) is at migration **0012** as of 2026-05-19 (`pnpm migrate:apply:staging` run after PR #145 merged; schema verified). Production D1 (`withjosephine-bookings`) is at migration **0003**. The 9 missing migrations (0004 → 0012) introduce every gift-aware column the Phase 5 Gifting + Phase 3 scheduling code reads/writes — `is_gift`, `purchaser_user_id`, `recipient_email`, `gift_delivery_method`, `gift_send_at`, `gift_message`, `gift_claim_token_hash`, `gift_claim_email_fired_at`, `gift_claimed_at`, `gift_cancelled_at`, `gift_resend_lock_until`, plus the 5 new audit columns + UNIQUE partial idx from 0012 (`gift_claim_sent_now_at`, `gift_claim_sent_now_actor`, `gift_claim_prior_alarm_at`, `gift_cancelled_by`, `gift_cancelled_reason`, `idx_gift_sent_now_once`).

**If we merge `release/v1.1.0` to `main` without applying these, the production worker will throw at the first gift-aware code path (purchase, flip, claim, redeem, /my-gifts, stripe webhook gift branch, send-now once PR-C-ii lands, cancel-scheduled once PR-D lands).** This is a hard blocker.

**Action at main-merge time, in order:**
1. Verify staging D1 is at 0012: `pnpm migrate:list:staging`.
2. Apply each missing migration to production D1, in order, with `pnpm migrate:apply:prod`. The CLI applies pending migrations in lexicographic order — 0004 → 0012 in one batch is the expected flow.
3. Verify with `pnpm migrate:list:prod`. Should show all 12 applied.
4. Spot-check schema: `pnpm exec wrangler d1 execute withjosephine_bookings --remote --command "PRAGMA table_info(submissions);"` — confirm gift_* + sent_now_* + cancelled_* columns present.

**Trigger:** this entry promotes to "execute" the moment Max greenlights `release/v1.1.0` → `main` merge. Do NOT auto-apply earlier — staging may need a migration revert if any blocker surfaces, and a partial-applied production confuses the picture. **Standalone apply of 0012 to production** (without the 0004-0011 batch) is also safe whenever Max wants — 0012 is `ALTER TABLE … ADD COLUMN` + `CREATE INDEX IF NOT EXISTS`, all idempotent.

---

## Scheduling-flow scrutiny — Phase 3 remaining sub-PRs (updated 2026-05-19)

Council shipped 2026-05-18 (Phase 2 of the scheduling-scrutiny PRD). Five locked decisions D-8 → D-12 → P-4b live in `www/MEMORY/WORK/20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md § Decisions`. Phase 2.5 RedTeam pass added 8 hardening patches (P-1 → P-7 + X-1 → X-3). Re-decomposition lifted Phase 3 from 20 → 71 atomic ISC.

**Shipped 2026-05-19** (see CHANGELOG for full diff descriptions):
- ✅ I-16 / D-8 — Per-status pill (PR #142 / PR-A). Theme-driven via `--j-status-{kind}-{bg|fg}` semantic CSS tokens keyed verbatim to the new `GIFT_STATUS_KIND` const. WCAG 1.4.11 compliance via `--j-status-pill-border`.
- ✅ I-17 / D-9 — Datepicker TZ hardening (PR #142 / PR-A). Native `<input type="datetime-local">` kept; server-side `bounds.ts` (15-min floor + purchasedAt-anchored 365-day ceiling); client-side `timezone.ts` (`Intl` → `TZDateMini` UTC ISO via `@date-fns/tz`); iOS Safari pre-17 fallback dropdown via `TimezoneFallbackPicker`.
- ✅ Bug #20 / D-12 — Recipient-email pre-fill (PR #144 / PR-B). `IntakeForm.prefilledEmail`; field rendered readOnly via `readOnlyFieldKeys` threaded through RenderContext; NULL self-send claims stay editable; `RecipientEmailEscapeHatch` callout above form with `/contact` link; server NFKC-normalizes both sides at the 422 mismatch gate.
- ✅ P-4b — Wholesale-non-refundable refund-policy (PR #144 / PR-B). Page fallback + terms clause + FAQ + email refundLine + Sanity legalPage body all aligned to the locked 2026-05-19 framing; Sanity migrations applied to staging + production.
- ✅ Phase 3 schema — Migration 0012 (PR #145 / PR-C-i). 5 audit columns + UNIQUE partial idx; staging D1 applied + verified; production pending the main-merge batch.
- ✅ D-10 / PR-C-ii — Send-now route + UI + Resend idempotency-key + dispatcher defense-in-depth (PR #147). New POST `/api/gifts/[id]/send-now`; race-safe ordering `Promise.all([issueToken, cancelAlarm])` → WHERE-guarded UPDATE → send with `idempotencyKey: "gift:{id}:claim"` → appendEmailFired; dispatcher `reason: "sent_now"` stop branch; `SendNowControl` with 5s arm + `http_401` → session-expired copy; 10 unit tests + `gift-send-now.spec.ts` e2e.

**Remaining Phase 3 work** (described here, sequenced as sub-PRs):

- **PR-D — D-11 cancel-scheduled.** Per the PRD's locked D-11 decision: new POST `/api/gifts/[id]/cancel-scheduled`; same auth pattern as send-now; ordering is `cancelGiftAlarm()` FIRST → D1 UPDATE WHERE-guard → rowcount=0 → 409; UPDATE sets `gift_cancelled_at`, `gift_cancelled_by`, `gift_cancelled_reason='purchaser-request'`; `CancelScheduledControl` component (5s confirm-armed, `j-rose` tint per Quiet Archivist — no alarm-red); copy explicitly says "non-refundable" per the wholesale-non-refundable policy locked in PR-B; `cancelled` pill (via D-8) renders on the card after success. `docs/OPERATIONS.md` updated with Becky's un-cancel procedure (D1 console only — Sanity-webhook→Worker→D1 path not built). Unit tests: happy path, 409 already-fired, 409 already-cancelled. Audit columns already exist (migration 0007 + 0012 — no D1 migration). **Trigger:** any session after PR-C-ii ships — now unblocked (2026-05-19).

- **PR-E — Polish + final tests.** P-6 motion preference (`prefers-reduced-motion` extends 5s confirm-armed window to 15s for WCAG 2.2.1 Timing Adjustable compliance); audit other refund mentions one more pass; `/simplify` full Phase 3 diff; close out remaining ISC tally. ISC-18h Playwright iOS/Android device-emulation matrix lives here too if it doesn't get its own PR.

**Out of Phase 3 scope but adjacent:**
- **UX design Council on per-status pill + datepicker brand-styled time picker** — already RAN as Phase 2 of the scheduling-scrutiny PRD; consensus was "keep native datetime-local in v1.1.x, defer full brand picker to v2". The DatePicker component (`src/components/Form/DatePicker/DatePicker.tsx`) extension to include time stays deferred to v2.

---

## Deferred from v1.1.0 round-2 (filed 2026-05-18)

### E2E test robustness — flagged 2026-05-18

Three test-infrastructure improvements surfaced while running the Playwright suite at the end of round-2. None are launch-blocking; each carries an explicit promotion trigger.

- **`data-testid` over role/text selectors.** Multiple specs (mine included — `gift-redeem-consent-shape-local`, `gift-redeem-self-send-local`, `gift-claim-session-expired-local`) target elements via `page.getByRole("button", { name: /…/i })` and `page.getByText(/sending your answers/i)`. The recent self-send spec already hit `getByRole("status")` ambiguity colliding with the IntakeForm page indicator — proves the fragility. Add `data-testid` attributes to: SubmitOverlay paragraph, every primary CTA, every form input we assert on, consent checkboxes (the `#field-art6-consent` id pattern is OK but inconsistent). Migrate the existing specs to testid-first selectors. **Trigger:** any time we add a new e2e spec, do it testid-first; bundle a sweep when 3+ specs need cleanup.

- **Copy-change resistance in assertions.** Specs assert literal copy strings ("sending your answers", "rested for a moment", "from your original email again"). The moment Becky edits Sanity copy, e2es break in CI even though product behavior is correct. Strategies to consider: (a) read the asserted string from the same Sanity fetch helper the page uses, so the spec compares Sanity-against-Sanity; (b) assert on testid + visibility only, not text content; (c) snapshot-test the rendered surface and let CI flag intentional copy changes for explicit re-approval. Pick one strategy and apply consistently. **Trigger:** first time a Becky copy edit breaks e2e in CI without product regression.

- **Disable analytics in e2e + staging.** Sentry, Mixpanel, and Clarity should not fire from Playwright runs or staging worker traffic — they pollute production dashboards with synthetic events and skew funnels. Verify per-vendor:
  - Mixpanel: `shouldEnableClientObservability(staging.withjosephine.com)` returns `false` when `NEXT_PUBLIC_TRACK_NON_PROD` is unset/0. **Action:** confirm staging GH env variable is `NEXT_PUBLIC_TRACK_NON_PROD=0` (currently `=1` per `.env.staging:63`) — that's why staging traffic IS in Mixpanel today, by design. Decide: keep staging tracking on (for QA visibility) and add an `e2e-bot` distinct_id filter at the dashboard layer, OR flip staging to 0 and lose that visibility.
  - Clarity: gated by the same function. Same decision applies.
  - Sentry: currently NOT gated by `shouldEnableClientObservability` per `src/lib/observability-gate.ts:11` (intentional — keep non-prod error signal). Confirm e2e runs don't emit Sentry events (they shouldn't because Playwright sets up the test browser, not a real user) but verify by tailing Sentry inbox during a full e2e run.

  **Trigger:** before the apex-unpark Stripe live-mode flip — final pre-launch posture should have Mixpanel/Clarity clean of staging+e2e noise.

### v1.1.x polish bundle — flagged 2026-05-18 mid-round-2 smoke

Items still pending after v1.1.1 shipped the first three. Trigger to promote: bundle as v1.1.2 (if soon) or its own PR (if dark-mode runs longer).

- **Full content-pass with a copywriter.** Sweep every customer-facing surface (booking flow, gift flow, thank-you, listen, my-gifts, my-readings, emails) and run a Copywriter persona over the copy. Tighten where verbose, warm where transactional, brand-align where flat. Discuss scope first — could be its own dedicated PR or bundled with the C-1 button redesign.
- **Dark / light mode.** Theme switch with brand-coherent dark palette (Midnight + Deep + Gold accents) and persistent preference. Likely a bigger lift — design system tokens already use CSS vars so the technical foundation is there, but every surface needs a dark-mode pass and Max may want a design conversation first.
- **Loader tail-strip design decision.** v1.1.1 bumped SubmitOverlay to `size="lg"` (`I-4`) as the immediate quick win. The rotating star's box-shadow / blur "tail" still reads as a comet at larger sizes — design loop with Max to decide whether to strip it entirely, parametrize by size, or keep as-is.

### C-1 — Intake "Continue / Send my answers" button UX redesign

Council (UX expert + Conversion expert) unanimously voted **Option C** for the disabled-state behavior. Spec lives in `www/MEMORY/WORK/20260518-v1.1.0-round-2-smoke-followup/PRD.md` § Decisions § "C-1 — UX + Conversion council recommendation."

**Why deferred:** half-day of focused implementation work; bigger than every other v1.1.0 round-2 fix combined. Splitting preserves round-2 hot-fix scope so the C-4b self_send blocker reaches staging faster. C-1 is feature-quality work (council estimates 8-15% page-completion lift), not a regression.

**Concrete spec for round-3 PR:**
1. Switch Continue/Submit button from `aria-disabled` to real HTML `disabled` (click does nothing).
2. Add muted-gold (`#C4A46B`) static asterisks on required-field labels from page load — no pulse, no animation (Quiet Archivist).
3. Red borders + inline error text appear on **blur** of touched-invalid fields (NN/g inline validation).
4. Helper line above button ("A few fields still need answers to continue") appears on first blur of any field on the page OR after ~5s dwell with required empty.
5. Helper line is the rescue affordance — click/tap scrolls to first invalid field.
6. Mixpanel telemetry: `intake_continue_blocked`, `intake_field_first_error`, `intake_helper_text_shown`, `intake_page_completed`.

**Trigger to promote:** once v1.1.0 round-2 PR merges to `release/v1.1.0` and staging is green.

---

## Security

### Phase 5 audit — LOW findings (Pentester, filed 2026-05-17)

- **L-2 — Tighten `cf-cron` header trust.** `isCronRequestAuthorized` short-circuits auth on `request.headers.get("cf-cron")` without source-IP validation. Cloudflare strips `cf-*` from public client traffic, but the boundary depends on no upstream proxy ever passing it through. **Trigger to promote to MED:** any 200 response in Workers analytics for a `/api/cron/*` route invoked with the `cf-cron` header from a non-CF source IP.

- **L-3 — Drop or HMAC-sign the `?purchaserFirstName=` URL override on `/thank-you/[id]`.** Renders attacker-supplied text into greeting. React auto-escapes; `robots: noindex`; real risk is social-share phishing. **Trigger to promote:** any Mixpanel/Sentry event shows the param arriving from an inbound link that wasn't generated by our own redirect chain.

- **L-1 regression watch:** if a future PR removes the `vars.NEXT_PUBLIC_SANITY_DATASET` check from `assert-staging-bindings.mts` (added in PR #129 M-1), promote back to MED.

### Mirror-drift root cause (filed 2026-05-17 — Max-action)

Phase 5 Bundle A cleanup wiped 59 production Sanity submission docs while production D1 only had 6 rows. The 51 excess docs were created 2026-05-15 and 2026-05-16 by e2e round-trip specs run against `staging.withjosephine.com`. Pentester traced the root cause: **the Stripe test-mode webhook endpoint registered on the prod Stripe account points at `https://withjosephine.com/api/stripe/webhook`**. Round-trip specs trigger real Stripe Checkout sessions whose `checkout.session.completed` webhooks land on the production worker, which writes to production Sanity. The staging worker's Sanity dataset binding is correct (verified — `NEXT_PUBLIC_SANITY_DATASET=staging` on the staging GH env).

- **Fix shape (Max-action via Stripe dashboard):**
  1. Register a separate test-mode webhook endpoint pointing at `https://staging.withjosephine.com/api/stripe/webhook` (live-mode endpoint stays as-is at `https://withjosephine.com/api/stripe/webhook`).
  2. Generate its own webhook signing secret (`whsec_test_…`); `pnpm exec wrangler secret put STRIPE_WEBHOOK_SECRET --env staging` with the new value.
  3. Confirm via staging round-trip: webhook lands on staging worker only; staging Sanity dataset receives the submission, production Sanity does not.
- **Fold into:** the Stage-B smoke test plan + the Apex unpark / Stripe live-mode flip Max-actions in CLAUDE.md.
- **Trigger:** before opening real traffic. Test-mode webhook target should be split BEFORE Becky's first real reading.

### Phase 5 audit — Efficiency LOWs (filed 2026-05-17)

Five low-impact efficiency wins flagged by the cross-phase /simplify audit. Each has an explicit promotion trigger.

- **EFF-7 (resend.tsx dynamic-import sequence):** `await import("@/data/defaults")` + `await import("@/lib/sanity/fetch")` are sequential in 6 email functions. Worker isolates pre-resolve same-chunk modules so penalty is near-zero in production. **Trigger:** if P50 latency of any cron-triggered email send is investigated and dynamic-import resolution shows up in a flame graph → parallelize the imports.

- **EFF-8 (regenerateGiftClaim.ts:113-118 sequential dbExec):** `markGiftClaimSent` + `appendEmailFired` are sequential D1 writes. Could be a single `dbBatch`. **Trigger:** if gift resends become a high-volume path (>100/day) where the extra D1 round-trip shows up in worker CPU budget.

- **EFF-9 (cascadeDeleteUser.ts:273-287 sequential per-submission):** R2+D1 → Sanity-fetch → doc-delete → asset-deletes per submission. Sequential by design for deterministic failure ordering + Sanity rate limits. **Trigger:** if GDPR Art. 17 throughput becomes a real bottleneck (>50 submissions per user); currently bounded by single-digit submissions/user.

- **EFF-10 (privacy/export/route.ts:298 zipSync):** Blocks Worker isolate on potentially-100 MiB bundles. Cold path. **Trigger:** if users with 10+ submissions report export timeouts, or Worker `cpu_time_exceeded` errors land in Sentry on `/api/privacy/export`.

- **EFF-11 (cron/email-day-2/route.ts:32-40 sequential candidates):** `await processOne()` per candidate (Resend API call + D1 append). **Trigger:** when daily volume >50/day and cron wall-clock approaches Worker CPU budget.

- **EFF-12 (useAutosave.ts:66-69 per-keystroke JSON.stringify):** `valuesUntouched` flag rebuilds JSON.stringify on every keystroke. Cost is ~50µs × ~60 keystrokes/session = ~3ms total. Cross-hook ref refactor to track touched-state in `setValue` would solve it but adds coordination risk that exceeds the win at today's scale. **Trigger:** if Lighthouse "main-thread blocking" flags input-lag on intake forms, or any Sentry performance trace shows useAutosave deps in a slow render path.

### DEV-1. `GiftClaimScheduler` Durable Object class missing from `next dev` bundle

- **Symptom:** Every `pnpm dev` boot (incl. Playwright CI runs) emits `workerd/server/server.c++:1966: warning: A DurableObjectNamespace in the config referenced the class "GiftClaimScheduler", but no such Durable Object class is exported from the worker.` Workerd notes this may become a startup-time error in a future version.
- **Cause:** `wrangler.jsonc:132` declares the DO binding pointing at class `GiftClaimScheduler`. The class is re-exported from `custom-worker.ts:83`, which `cf:build` bundles via OpenNext for production. But `pnpm dev` runs Next's Node dev server, NOT `custom-worker.ts`. The CF dev integration (`initOpenNextCloudflareForDev()` in `next.config.ts`) reads `wrangler.jsonc` and spins up workerd-emulated bindings, so it sees the DO declaration without finding the class implementation → warning. Today `giftClaimSchedulerClient.ts:20` returns `null` when the binding is missing and every caller handles it gracefully (gift-scheduling no-ops in dev), so the warning has no functional consequence — but it's accumulating tech debt and may break when workerd hardens the check.
- **Fix paths:**
  - **(a) Stub registration in dev:** ship a tiny `wrangler.dev-stubs.ts` that exports a no-op `GiftClaimScheduler` class extending `DurableObject`, and reference it via a wrangler `--script` or env-conditional `main` so the dev runtime can resolve the symbol.
  - **(b) Migrate to `cf:dev` / `wrangler dev`:** swap Playwright + local dev from `pnpm dev` (Next dev server) to `pnpm cf:dev` (OpenNext-built worker via wrangler). Bundles `custom-worker.ts` correctly. Bigger change; affects dev DX (slower reload).
  - **(c) Lift the DO class to a file the Next runtime already loads:** re-export from a module that `next dev` picks up before any binding consumer call.
- **Recommendation:** Path (a) — smallest blast radius, fixes the warning, doesn't touch the dev DX. Estimated 15–30 min.
- **Trigger:** Before the next major Cloudflare/OpenNext upgrade, OR when workerd surfaces a startup-time error on this config.

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

### R2 API token scoping for backup buckets (follow-up to Phase 3 provisioning, 2026-05-13)

- **Source:** Provisioning walkthrough 2026-05-13. The original Phase 3 backlog entry (below in Infrastructure) assumed R2 Bucket Locks gave S3-Object-Lock-Compliance semantics ("a compromised API token can't shorten retention"). They do not.
- **What the docs actually say** (read directly 2026-05-13):
  - [R2 bucket-locks](https://developers.cloudflare.com/r2/buckets/bucket-locks/) — lock rules CAN be removed via Dashboard / Wrangler / API. No "Compliance vs Governance" mode toggle; one immutability tier, removable by an admin token.
  - [R2 S3 API compatibility](https://developers.cloudflare.com/r2/api/s3/api/) — `PutObjectLockConfiguration` and `GetObjectLockConfiguration` are listed under *Unimplemented bucket-level operations*. `x-amz-object-lock-mode` / `x-amz-object-lock-retain-until-date` are unimplemented on `PutObject` and `CreateMultipartUpload`. R2 does not implement S3 Object Lock.
- **Implication:** The threat model "a compromised API token can't shorten retention" is not satisfied by bucket locks alone in R2. The mitigation has to come from token scope.
- **Action items:**
  1. Create a dedicated R2 API token whose *only* permission is `Workers R2 Storage Write` on `josephine-backups` + `josephine-backups-staging` (no `Edit` / no admin / no lock-remove on any bucket).
  2. Bind that token to the backup worker paths separately from the prod photo-upload token.
  3. Audit existing CF account-level R2 tokens — anything with global `Edit` should be rotated or scoped down. CF Dashboard → R2 → Manage R2 API Tokens.
  4. Document the token-permissions matrix alongside the Phase 3 runbook ([`SANITY_BACKUP_RUNBOOK.md`](./runbooks/SANITY_BACKUP_RUNBOOK.md)) once token scoping lands.
- **Trigger:** Standalone CF-dashboard token hygiene work. Not launch-blocking; the backups still work as configured, the gap is purely the retention-shortening threat model. (S-3 WAF rate-limit Max-action that previously pair-anchored this entry shipped 2026-05-20 — see CHANGELOG.)

---

## Infrastructure


### E2E coverage: localhost-mockable mode — follow-up gaps (filed 2026-05-17)
- **Status:** Core landed on `feat/e2e-local-mock-mode` (PR pending). Three sibling specs (`stripe-local`, `gift-local`, `listen-local`) wired into the existing `.github/workflows/e2e.yml` job via env-flag gating. Mock infrastructure: fixture sidecar accepts Sanity mutate + asset upload + capture introspection; Resend dry-run path POSTs payloads to the sidecar; test-only `/api/e2e-reset` route with defense-in-depth gating; `Stripe.webhooks.generateTestHeaderString`-based signed webhook helper; `page.route("buy.stripe.com/**")` browser interception.
- **Deferred to follow-up PRs (file before Phase 6 ships):**
  1. **Full gift recipient-redeem happy path.** Current `gift-local` covers the purchaser leg + Stripe webhook + Sanity mutation capture, plus 2 unhappy paths (gift-redeem 401 without cookie, gift purchase 400 missing consent). Full recipient leg needs `gift_claim_token` state in D1 produced by the async Durable Object dispatch — requires extending `/api/e2e-reset` with a seed endpoint OR exposing the gift-token internals via the existing `/api/internal/gift-claim-regenerate` route in a test-friendly mode.
  2. **Gift unhappy paths requiring D1 seed**: `token already claimed` (409), `token expired`, `recipient already redeemed`, `anti-abuse cap hit` (`MAX_ACTIVE_GIFTS_PER_RECIPIENT`). All need pre-seeded gift submissions in D1.
  3. **Listen full delivered-surface happy path.** Current `listen-local` covers the auth + gating seams (cold-visit sign-in card, magic-link request, garbage-token verify, internal issue-magic-link 404 paths). Full happy path (paid → delivered → audio play → listenedAt mirror) needs Sanity asset upload + force-mirror equivalent for the local sidecar — see ISC-27..ISC-33 in the original PRD.
  4. **Booking unhappy paths**: card declined, Stripe webhook timeout, Sanity write failure (requires forced sidecar failure mode).
- **Why deferred:** these all need either D1 seed infrastructure beyond the truncate-only reset endpoint, OR sidecar failure-injection modes. Better to ship the working surface first and add these as targeted PRs.

### E2E helper extraction — `signInViaMagicLink` + Stripe checkout intercept (filed 2026-05-19, **promoted to next-session sprint 2026-05-19**)
- **Status:** Promoted out of backlog into the Phase 3 next-session ladder as **PR-Lift** (first of three). See `docs/SESSION_BOOT.md` § Next-session agenda for the full scope brief. Locked sequencing: PR-Lift → PR-D → PR-E, all on `release/v1.1.0`.
- **Why first:** PR-D will add a 5th magic-link callsite (`gift-cancel-scheduled.spec.ts`). Extracting now means PR-D writes against the helper from day one — no follow-up cleanup needed.
- **Trigger:** next session, before PR-D.

### Staging Turnstile = Cloudflare test keys (locked 2026-05-16 — hidden invariant; document so it doesn't drift to real keys)
- **Source:** Phase 5 Bundle A.0 spec build. Real Turnstile blocked Playwright's Chromium (anti-bot). Switched staging to Cloudflare's published always-pass test keys so both Becky's manual smoke AND the headed `stripe-roundtrip.spec.ts` automated round-trip can complete without bot challenges.
- **What's set:**
  - **Site key (build-time, public):** `1x00000000000000000000AA` — set as a GitHub environment-scoped variable on the `staging` environment named `NEXT_PUBLIC_TURNSTILE_SITE_KEY`. Overrides the repo-level variable (real key) for the `deploy-staging` job only. Production deploy keeps reading the real repo-level key.
  - **Secret key (runtime, Worker secret):** `1x0000000000000000000000000000000AA` — set via `pnpm exec wrangler secret put TURNSTILE_SECRET_KEY --env staging`.
- **Security note:** Test keys ALWAYS pass, so Turnstile no longer protects staging from bots. This is acceptable because staging is already gated by Cloudflare Zero Trust (CF Access) — only authenticated identities can reach `staging.withjosephine.com` at all. Effective security is unchanged; Turnstile was redundant defense on staging.
- **Hidden-invariant risk:** Anyone who later "rotates Turnstile keys" on staging and accidentally uses the real key will break automated tests AND make Becky's smoke flow trigger a captcha she didn't expect. The override lives in GH dashboard, not the repo — so it's not visible in code review. Read this entry before touching staging Turnstile config.
- **References:** https://developers.cloudflare.com/turnstile/troubleshooting/testing/ (Cloudflare test-key documentation, always-pass site/secret pair).

### R2 backups bucket + Sanity Export token provisioning (Phase 3 prerequisite — Max-action)

- **Source:** Phase 3 backup cron PR (Sanity dataset NDJSON snapshot → R2). Cron + binding shipped behind a `SANITY_BACKUP_ENABLED` deploy flag so the code is ready in advance; provisioning is what flips it on.
- **What's required before flipping `SANITY_BACKUP_ENABLED=1`:**
  1. Create R2 bucket `josephine-backups` (production) and `josephine-backups-staging` (staging) via CF dashboard → R2 → Create bucket. Same account that hosts `withjosephine-booking-photos`.
  2. Attach lifecycle rules per bucket:
     - prefix `backups/weekly/` → expire after 90 days
     - prefix `backups/monthly/` → expire after 1095 days (3 years, matches reading-content retention)
  3. Apply R2 **Bucket Locks** per prefix. Locks must MATCH the lifecycle expirations to remove the easy "extend retention via lifecycle" path:
     - prefix `backups/weekly/` → retention 90 days
     - prefix `backups/monthly/` → retention 1095 days
     - **Honesty note (verified 2026-05-13):** R2 Bucket Locks are NOT the S3-Object-Lock-Compliance equivalent the earlier draft of this entry assumed. Per the [R2 bucket-locks docs](https://developers.cloudflare.com/r2/buckets/bucket-locks/) lock rules can be removed via Dashboard / Wrangler / API; R2 does not implement S3 Object Lock at all (verified via [R2 S3 API compatibility table](https://developers.cloudflare.com/r2/api/s3/api/) — `PutObjectLockConfiguration` is listed as Unimplemented). The real defense against retention-shortening attacks is **API-token scope minimization** — tracked as a separate Security backlog entry ("R2 API token scoping for backups buckets").
  4. **Encryption — no action.** R2 buckets are encrypted at rest with AES-256-GCM under CF-managed keys automatically; per the [R2 data security docs](https://developers.cloudflare.com/r2/reference/data-security/), "encryption and decryption are automatic, do not require user configuration to enable." There is no per-bucket Encryption panel and no BYOK/CMK option — the earlier draft of this entry was wrong about a distinct-KMS step.
  5. Generate a Sanity **Viewer** API token at manage.sanity.io → Project → API → Add API token. Read-only scope, restricted to the production dataset. Repeat for staging.
  6. `pnpm wrangler secret put SANITY_EXPORT_TOKEN` against the production worker (and `--env staging` against staging) with the matching Viewer tokens.
  7. CF Dashboard → Workers → withjosephine (+ withjosephine-staging) → Settings → Variables → add public var `SANITY_BACKUP_ENABLED = 1`.
- **Verification:** manually trigger the cron after provisioning — `curl -H "Authorization: Bearer $CRON_SECRET" https://withjosephine.com/api/cron/backup-sanity-dataset`. Should return 200 JSON with `success: true`, non-zero `ndjsonBytes`, and `assetCount`. Then check R2 dashboard for `backups/weekly/<YYYY-Www>/dataset.ndjson` + assets subtree.
- **Why deferred:** R2 bucket creation, lifecycle, Bucket Locks, KMS, and Sanity token issuance are all CF/Sanity dashboard operations Max owns. Code ships gated; nothing depends on the cron firing until the flag is on.
- **Restore drill:** Annual, documented in Phase 4 PRD's compliance runbook (separate session). Not in scope here.

### Phase 3.5 webhook backup — security follow-ups (Pentester deferrals)

Pentester gate on the Phase 3.5 PR (verdict GO, MEDIUM-1 fixed in-PR). Two items deferred to backlog:

- **LOW-1: `@sanity/webhook` `isValidSignature` uses plain `!==` not constant-time.** Both `/api/sanity-sync` (existing) and `/api/sanity-backup-webhook` (new) inherit this from the upstream library. Real-world exploitability on Workers is very low (cold-start jitter + regional routing + per-request CPU variability dominate any byte-level timing signal), and the cost of forking the library is high. Mirrors the Phase 1 listen-route HIGH-1 timing-oracle precedent. **Trigger to fix:** when upstream `@sanity/webhook` ships a release using `crypto.subtle.timingSafeEqual` or equivalent — bump the dep and re-verify.
- **LOW-2: No per-route rate-limiting on `/api/sanity-backup-webhook`** (or `/api/sanity-sync`). Attacker without HMAC secret can't reach the expensive path (body-size pre-check from MEDIUM-1 also blocks them at the door). Attacker WITH the secret is a confused-deputy — rate-limiting is the wrong control. **Trigger to add:** Workers analytics shows >60 rpm unauthenticated → wire a `WEBHOOK_LIMITER` rate-limit binding scoped to client IP, evaluated before HMAC verification.

### Phase 3 backup cron — security follow-ups (Pentester deferrals)

Pentester gate on the Phase 3 PR (verdict GO, MEDIUM-1 fixed in-PR). Three items deferred to backlog:

- **MED-2: Bound NDJSON line length + per-`uploadPart` timeout.** `extractAssetRefs` accumulates `pending` until a `\n` is found — a single multi-MB JSON line (e.g. future Portable Text body on a submission) would buffer entirely in Worker memory. Mitigation: reject lines > ~5 MiB. Separately, `streamToR2Multipart`'s `uploadPart` has no timeout — a hung upload would burn the 15-min scheduled wall clock. Wrap with a timeout race. Trigger: file once submission docs gain Portable Text bodies, OR after the first cron run that takes >5 min wall-clock.
- **LOW-3: Document last-writer-wins semantics + Bucket-Lock-mode interaction.** Two concurrent backup invocations (manual curl + scheduled trigger) on the same period produce two `createMultipartUpload` flows, both `complete()`ing the same key — last writer overwrites. Once Bucket Locks ship (Max-action), the mode choice (Compliance vs Governance) determines whether the second `complete()` is rejected. Recommendation: Governance mode so "fresh-snapshot-wins" semantics are preserved for retries. Document in the Max-action provisioning entry above.
- **LOW-4: Extend `scrubSensitiveRequestData` in `custom-worker.ts` to scrub `event.extra.ref.key`** on the backup-cron Sentry-capture path. The asset ref includes a sanitized customer-supplied filename which is a marginal PII surface in admin-only Sentry. Same posture as the existing listen-page URL scrub. Two-line change.

### Phase 3 backup cron — `extractAssetRefs` line-splitter O(N²) on long records
- **Source:** /simplify Efficiency reviewer on Phase 3 PR (EFF-6).
- **What:** `src/lib/backup/ndjsonAssets.ts` builds the in-flight string buffer via `pending += decoder.decode(...)` and repeatedly `pending.slice(newlineIdx + 1)` after each line. For a Sanity export where one doc emits a ≥100 KB line (e.g. large Portable Text or embedded images in a future doc-type), the per-line tail-realloc cost is quadratic. At soft-launch (~10 KB total NDJSON) it's irrelevant.
- **Action:** Switch the line walk to an offset-based scan, OR pipe through `TextDecoderStream` + a `TransformStream` that splits on `\n` natively. ~10 lines.
- **Trigger:** filing now so the line is in view; defer execution until either (a) cron `durationMs` for the dataset-NDJSON walk crosses ~1s, or (b) any submission doc lands a multi-KB Portable Text body in Sanity. Neither is true today.

### Phase 3 backup cron — tee Sanity export stream to skip the R2 re-read
- **Source:** /simplify Efficiency reviewer on Phase 3 PR (EFF-1).
- **What:** Today the cron streams Sanity export → R2 multipart, then does a separate `bucket.get(ndjsonKey)` to walk asset refs. Reviewer suggested `body.tee()` to split the source stream into two consumers in parallel. Deferred because tee'd ReadableStreams in the Streams spec queue unbounded for the slower consumer — if R2 upload throughput lags Sanity download (likely at projected scale), the JS-side queue can exceed Workers' 128 MiB request-memory ceiling. The current re-read is memory-bounded; the R2 GET round-trip costs ~$0.0004 per backup (Class B op, negligible).
- **Action:** If R2 GET cost or cron wall-clock duration ever becomes the bottleneck, revisit with bounded backpressure (e.g. a `TransformStream` with a small `highWaterMark` on the slow branch) instead of naive `tee()`.

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

### Phase 5 — Session 6 — Pentester LOW deferrals (post-launch with explicit triggers)

Pentester re-audit on the Session 5+6 combined diff (2026-05-12, HEAD `5f0c96a`) returned **CONDITIONAL GO**. M-1 (admin apex allowlist) + M-2 (regenerate TOCTOU lock) shipped in-PR (commit `5f0c96a`). Two LOW findings deferred:

- **L-1 — No success audit for admin regenerate.** `cascadeDeleteUser` writes its own `performedBy: "studio-admin"` audit; `regenerateGiftClaim` writes only the `gift_claim_regenerate` email_fired entry (no operator-identity capture). **Trigger to revisit:** first post-launch incident where the team needs to reconstruct "who pressed regenerate at <time>". Fix: add `writeAudit({ eventType: "admin_action", success: true, ... })` after the `ok` branch in `regenerateGiftClaim`; include `submissionId` for searchability.
- **L-2 — Analytics double-count on regenerate.** Successful regenerate appends BOTH `gift_claim` (via `sendAndRecord`) AND `gift_claim_regenerate` (explicit append) to `emails_fired_json`. Any cohort walk counting `gift_claim` events sees regenerations as first-sends. **Trigger to revisit:** first analytics dashboard / cohort study that walks `gift_claim` event counts. Fix: either pass a discriminator into `sendAndRecord` so the regenerate path appends ONLY `gift_claim_regenerate`, OR teach the cooldown walk to consider both types.





### Phase 4 — production secrets + R2 lifecycle

Phase 4 code is in production (PR #130 merged 2026-05-17); vendor helpers ship flag-off-by-absence and the cascade reports `vendorNotConfigured` partial-failures until env vars are populated. These are the production-only Max-actions to turn the vendor calls on. Staging secrets are already in place per CLAUDE.md.

Run from `www/` with the production Cloudflare Workers binding (no `--env` flag — `wrangler` defaults to production).

```bash
# 1. Admin API key — gates the Sanity Studio "Delete customer data" doc action
#    via X-Admin-Token header. Without it, the admin endpoint returns 404
#    to all callers and Becky can't cascade-delete.
#    Generate locally: openssl rand -base64 32
#    Save to password manager BEFORE pasting into wrangler.
wrangler secret put ADMIN_API_KEY

# 2. Mixpanel service-account credentials — HTTP Basic auth pair from
#    Mixpanel Project Settings → Service Accounts → "Add Service Account"
#    (role: Admin, US region, expires: Never). The "Add" dialog shows
#    username + secret ONCE — copy both immediately. Without these, the
#    cascade's Mixpanel data-deletions call returns "mixpanel: not configured"
#    partial-failure and Mixpanel event/profile data is NOT deleted.
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_USERNAME
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_SECRET

# 3. Brevo API key — DO NOT SET until Brevo Phase 1 vetting ticket has
#    cleared (see "Brevo Phase 1 — pre-vetting via support ticket" below).
#    Without it, cascade reports "brevo-contact: not configured" +
#    "brevo-smtp-log: not configured" partial-failures. Acceptable until
#    Brevo Phase 1 ships — Brevo isn't carrying any customer data yet.
# wrangler secret put BREVO_API_KEY
```

**R2 lifecycle on `exports/` prefix (production bucket).** GDPR Art. 20 export ZIPs accumulate without an expiry policy. CF Dashboard → R2 → `withjosephine-booking-photos` → Settings → Object lifecycle rules → Add rule:

- Rule name: `exports-7d-expiry`
- Prefix: `exports/`
- Action: `Delete uploaded objects after 7 Days`
- Enabled: ✓

(The pre-signed download URLs already expire after 7 days; this rule garbage-collects the underlying R2 objects so they don't keep counting against storage.)

**Verify after each secret lands:**

```bash
# Confirm the worker sees them (does NOT print the value, only the names):
wrangler secret list | grep -E "ADMIN_API_KEY|MIXPANEL_SERVICE"
```

**End-to-end smoke-test (after ADMIN_API_KEY + Mixpanel pair both set):**

1. Open Sanity Studio at `withjosephine.sanity.studio/production`.
2. Pick a real submission doc (or a test one — cascade is irreversible per Stripe Redaction, so use a test row first).
3. Click "Delete customer data" → type `DELETE` → paste the admin token → click "Run cascade delete".
4. Toast should say "Customer data cascade complete" (success) or list partial-failures (Brevo `not configured` is expected pre-vetting).
5. Query `deletion_log` in production D1 — expect TWO rows for that user_id: `action='started'` with `started_at` populated, then `action='completed'` with `completed_at` populated + `mixpanel_task_id` non-null + `stripe_redaction_job_id` non-null.
6. Confirm in Mixpanel: the data deletion request appears in Project Settings → Data Deletion Requests (state may be `pending` / `processing` for up to 30 days — that's the vendor SLA).
7. Confirm in Stripe Dashboard: the Redaction Job appears under Settings → Privacy → Redaction Jobs with status `validating` → `ready` → (manual `/run` trigger TBD via reconciliation cron in a future phase).
8. Re-trigger the doc action on the same submission → expect Studio toast "no recipient user" (idempotency holds; the row has already been deleted).

If any step fails, the cascade is non-destructive on first failure (each step wraps in try/catch + records the failure into `deletion_log.partial_failures_json` rather than rolling back). Investigate the partial-failure string and re-run after fixing.

### Phase 4b — deferred follow-ups (filed during PR — defer triggers below)

Pentester + /simplify reviews on the Phase 4b GDPR cascade PR surfaced a handful of items that didn't make the in-PR cut. Each has an explicit trigger condition for when to revisit.

- **24h vs 7d export URL expiry (Pentester MED-1).** `/api/privacy/export` emails a 7-day pre-signed R2 GET URL. Email-channel exposure window is long; alternative is to gate downloads behind a Next route that re-checks the `__Host-listen_session` cookie and 302s to a freshly-signed short-lived URL. **Trigger:** any complaint that an export link was exfiltrated, OR more than 10 exports/month sustained (broader attack surface). Cheap fix when triggered: drop `EXPORT_URL_EXPIRY_SECONDS` to 24h.
- **Sanity asset orphan reconcile cron (Pentester MED-2).** Cascade's `deleteSanityAssetsForSubmission` captures partial failures into `deletion_log.partial_failures_json` but doesn't retry. Voice notes / PDFs can orphan if Sanity 503s mid-cascade. **Trigger:** any `deletion_log` row with `sanity-asset-delete` or `sanity-doc-delete` in `partial_failures_json` that hasn't been hand-cleaned within 7 days. Cron writes a daily Mixpanel/Sentry alert; build the auto-retry only after Becky's surfaced this twice.
- **Concurrent cascade invocation guard (Pentester MED-3).** Cascade doesn't check `wasUserDeleted(userId)` before starting — concurrent double-click writes two `started` rows + two Stripe Redaction Jobs (irreversible). **Trigger:** any `deletion_log` query that returns >1 `started` row per `user_id` within the same minute. Fix at trigger time: insert with `INSERT … ON CONFLICT DO NOTHING` on `(user_id, action='started', started_at > now-60s)`.
- **Structured `partialFailures` shape + VendorId union (Quality MED).** Current `partialFailures: string[]` is stringly-typed; parsing by prefix breaks if vendor error formats change. **Trigger:** when the reconcile cron in MED-2 above lands, design its filter against a structured `{vendor, phase, detail}` shape rather than regex on free-text — touch all three vendor helpers + the cascade caller in one focused pass.
- **`formatHttpError(vendor, response)` helper extract (Quality MED).** Pattern repeated 5× across vendor helpers (`text().catch(...).slice(0, 200)`). Fine as-is for three helpers; revisit when a fourth vendor lands (Phase 5 gifting may add Stripe Connect or similar).
- **`PrivacyExport` React Email template + Sanity doc-type (Reuse LOW-MED).** Every other transactional sender uses a React Email template wired through Sanity copy (`sendOrderConfirmation`, `sendDay7Delivery`, `sendMagicLink`, etc.); `sendPrivacyExportEmail` is the only inline-HTML outlier. For brand consistency (EmailShell wrapper, SignOff, SerifHeading) + Becky-editability of the copy, create `src/lib/emails/PrivacyExport.tsx` + `emailPrivacyExport` Sanity doc-type, mirror `sendMagicLink`'s lazy-import + defaults-merge shape. **Trigger:** soft-launch traffic includes ≥3 Art. 20 export requests/month, OR Becky asks to edit the wording.
- **Sanity N+1 in cascade per-submission loop (Efficiency LOW).** Each submission: `client.fetch` asset refs + `client.delete` doc + `client.delete` per asset = N+3 round-trips per submission, serial across submissions. Fine at 1–3 submissions/user. **Trigger:** any cascade against >10 submissions for a single user (gifting power-users in Phase 5). Cleanup pass: pre-fetch all asset refs via `*[_id in $ids]{voiceNote, readingPdf}` + batch deletes via `client.transaction()`.
- **`zipSync` → `AsyncZipDeflate` flip (Efficiency MED).** Current `zipSync` is single-threaded and blocks the isolate. Comment in `export/route.ts` pre-commits to the flip threshold. **Trigger:** any export bundle ≥25 MB observed (log-and-watch), OR Worker CPU duration on `/api/privacy/export` >10s P95.
- **Mixpanel project token in URL query (Pentester MED-4).** `?token=...` ends up in vendor edge logs. Token is `NEXT_PUBLIC_MIXPANEL_TOKEN` (already client-exposed), low-impact. **Trigger:** Mixpanel documents body-token support for `data-deletions/v3.0` — then move it.
- **HMAC email_hash in `deletion_log` (Pentester LOW-4).** Currently unsalted SHA-256 — rainbow-table feasible if a `deletion_log` dump leaks. **Trigger:** any incident-class event involving D1 read access from outside the worker. Cheap fix: HMAC with a server secret.
- **Per-IP rate-limit on `/api/admin/delete-user` (Pentester HIGH-2 follow-on).** In-PR fix added the failed-auth audit row; per-IP throttling against brute-force is the separate concern. The existing zone WAF rule `rl-josephine-api-write-paths` (shipped 2026-05-20, see CHANGELOG) currently covers `/api/booking`, `/api/contact`, `/api/booking/upload-url` only — adding `/api/admin/delete-user` to the OR expression is cheap but bumps the rule's 4th branch. **Trigger:** any brute-force signal in admin audit log; OR when zone upgrades to Business plan (5 rules) and we split per-path.

### Brevo Phase 1 — parallel-safe (NOT launch-blocking — 2026-05-11 re-tier)

**De-blocked 2026-05-11.** Earlier framing called Brevo Phase 1 "LAUNCH-BLOCKING" but the dependency wasn't real on inspection:

- Transactional email continues through Resend (the existing path — Order Confirmation, Day-2, Day-7 delivery emails all work without Brevo).
- No newsletter signup form exists on the site yet. The website can launch with no newsletter and add one 1–2 weeks later.
- The Phase 4 cascade integration is provider-agnostic by design — without `BREVO_API_KEY`, the cascade gracefully returns `brevo-contact: not configured` + `brevo-smtp-log: not configured` partial-failures and the rest of the cascade (R2 / Sanity / D1 / Stripe / Mixpanel) completes normally.
- Switching providers is ~30 min of code work — write `<provider>Delete.ts` mirroring `brevoDelete.ts` shape + swap two import lines in `cascadeDeleteUser.ts`. **Fallback ranked picks per the 2026-05-11 vendor research:** (1) Beehiiv — strongest explicit astrology acceptance, publishes astrology-newsletter promo content; (2) Mailchimp — scrutinise-not-ban for astrology; (3) Resend Broadcasts — no content prohibitions but Schrems-III exposure for EU customers.

**Brevo's 2026-05-11 reply (Frosina, ticket #5354963):**
> *"We have reviewed the information provided… `news.withjosephine.com` has been successfully authenticated… However, since the website `withjosephine.com` is currently still under construction and not yet live, we are unfortunately unable to complete the full account review at this stage. Our compliance team needs to be able to verify the website and its content as part of the standard validation process. Additionally, as Max rightly flagged, your business falls under Section E of our Acceptable Use Policy (clairvoyance, fortune telling and astrology), which requires a dedicated review by our compliance team. We would ask you to reach back out to us once your website is live."*

Net: domain auth ✓, account-level review deferred to post-launch (Brevo-side requirement, not a code dependency), Section E review will happen post-launch as a dedicated compliance pass. Externally confirms the demotion above.

**Post-launch action (after apex unpark):** reply on ticket #5354963 with (a) the live URL `withjosephine.com`, (b) the opt-in form URL (when the newsletter form ships), (c) a sample newsletter (Becky drafts).

**What stays from the original plan:**
- Vetting ticket with Frosina at Brevo (#5354963) — keep open. Reply post-launch.
- Cascade code under `src/lib/compliance/vendors/brevoDelete.ts` — keep as-is. Env-var-gated, no harm to leave in.
- 0.2% complaint / 2% bounce / 1% unsubscribe thresholds — useful operational knowledge if/when Brevo Phase 1 ships.

**Trigger conditions for vendor swap:**
- Brevo's post-launch review drags >2 weeks after the live-site reply OR rejects → switch to Beehiiv.
- Brevo's `SANITY_BACKUP_ENABLED`-style flag in code already exists implicitly via env-var absence — no further code work needed to "turn Brevo off" — just don't set `BREVO_API_KEY`.

Below is the original Phase 1 launch checklist for reference (still useful when Brevo eventually ships, just no longer launch-gating):

### Brevo Phase 1 — pre-vetting via support ticket (operational, parallel-safe)

- **Source:** Direct read of Brevo's Acceptable Use Policy PDF (`Anti-spam policy | Brevo`, 2026-05-11). Section E names "Clairvoyance, fortune telling and astrology" as a regulated/sensitive industry where *"you must pass through a vetting process via our support team before starting to send"*. Akashic Records + birth-chart readings + Soul Blueprint fall under this category. **Not optional — the policy phrasing is contractual ("must"), not advisory.**
- **What:** Email `support@brevo.com` BEFORE the first newsletter send (and BEFORE Phase 3 transactional migration). Describe the business: astrology + Akashic Record readings + birth charts, EU residency required (France/Germany/Belgium DC), audience separation in place (newsletter list ≠ paid-customer list), no email attachments (binaries delivered via magic-link-gated R2/Sanity proxy, not over Brevo), double-opt-in on the newsletter form. Request confirmation that the account is cleared for this content category.
- **Why this matters operationally:** A skip-and-send posture risks opaque account suspension on first complaint signal. The vetting ticket is a one-time ~10-minute action that closes the operational risk for the lifetime of the account.
- **Phase 1 newsletter form opt-in spec (locked by Brevo Section C, verbatim):** *"the Contact has to check a checkbox to subscribe to your newsletter AND the registration checkbox CAN'T be pre-checked, and explicit: the Contact knows which kind of messages they will receive and for what purpose."* Means: checkbox default-unchecked, descriptive label (e.g. "Monthly notes from Josephine on…" not "Subscribe"), proof-of-opt-in retainable per contact (Brevo's contact-create payload supports `attributes.OPT_IN_AT` — store the ack timestamp + label snapshot just like Art. 6/9 consent records).
- **Brevo abuse/complaint thresholds** (verified from `help.brevo.com/.../360017299259`, indexed snippets): complaint rate >0.2%, hard-bounce >2%, unsubscribe >1% → automatic account suspension. Tighter than typical (Mailchimp 0.5% complaint, Resend 0.08% complaint / 4% bounce). Audience separation + double-opt-in is the structural mitigation already in the locked plan.
- **Action sequence (one Max-action, three sub-steps):**
  1. Sign up at brevo.com (free tier).
  2. BEFORE building the audience or sending: email `support@brevo.com` with the vetting-ticket content described above. Wait for clearance reply.
  3. After clearance: provision DKIM/SPF/DMARC for `news.withjosephine.com` subdomain in CF DNS (does NOT touch the existing transactional sender), provision Becky's editor account, build the newsletter audience list as a separate Brevo list from any future paid-customer list.
- **PAI memory captured:** `feedback_verify_vendor_claims_against_docs.md` already exists from PR #82; this case re-validates the rule. Add a one-liner referencing the Brevo astrology / Section E lookup as a confirmed pattern: read the actual policy PDF (not just indexed snippets) when picking ANY vendor for ANY content category beyond plain SaaS.

### Microsoft Clarity (session replay) — provisioning pending

Wiring is in production (Consent v2, CSP, masking) per CHANGELOG. Remaining Max-actions:

1. Sign up at clarity.microsoft.com → create project → get the 10-char tracking ID.
2. Add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH repo Variables. No env-scoped override; same project for prod + staging.
3. Trigger a production deploy so the new build inlines the env var.
4. DevTools-verify `https://www.clarity.ms/tag/<id>` loads without CSP errors.
5. Run `set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-clarity.ts` against both Sanity datasets to add the sub-processor disclosure to the privacy policy. Idempotent.
6. In the Clarity dashboard, verify masking on a few real intake-form sessions — DOB / first_name / last_name / photo render as redacted blocks. All must pass before opening real traffic.






### PR-F1 simplify-pass deferrals (remaining after Bundles 2 + 4)

- **`setState`-in-effect lint suppression in AnalyticsBootstrap.** Cleaner long-term fix is `useSyncExternalStore` for the consent state read. **Trigger:** when the consent flow gains complexity (e.g. per-purpose consent granularity).

- **`window.location.host` re-read in `initAnalytics()`.** Called once due to the `bootstrapped` guard. Eager module-scope read is unsafe (SSR breaks); lazy module-scope cache is identical work to the function-scope cache. **Trigger:** if/when re-init support is added.

- **`migrate-privacy-mixpanel.ts` re-fetches on no-op idempotency check.** The script fetches the entire doc before short-circuiting. **Trigger:** if it becomes a template for other migration scripts (today runs maybe 1–2 times in its lifetime).



## Code quality (nice-to-fix)

- **`legal_full_name` in `SWAP_PRESERVED_KEYS`.** Kept as a fallback for
  pre-migration localStorage drafts. Drafts have a 30-day TTL — drop after
  2026-05-29 with confidence.
- **3× `fetchBookingForm` per `/book` flow.** Each of `/book/[id]`,
  `/letter`, `/intake` calls it independently. `cache()`-wrapped per request,
  so 3 separate Worker invocations = 3 fetches. Acceptable today; if Sanity
  CDN ever throttles, batch the fetch upstream.

### react-hooks/refs — DatePicker setMonth-in-effect

`src/components/Form/DatePicker/DatePicker.tsx` calls `setMonth(selected)` inside an effect (`react-hooks/set-state-in-effect`). Refactor to derived state via `useState` initializer or `useMemo`-driven month. **Trigger:** any related lint rule promotion, or when the next refactor pass crosses this file.

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

### Booking-form consent-UI layout review (Sanity Studio editor view)
- **Source:** Max, 2026-05-15 (Phase 0 closeout). Inspecting `bookingForm` in Studio surfaced that the consent area is confusing in the editor: today only one `type: consent` field exists (`time_of_birth_unknown` — actually a "I don't know my time of birth" checkbox, NOT a GDPR consent), and the editor-side affordance for the legal-acks block is unclear.
- **What's confusing:** the schema's `type: "consent"` enum value reads like "this is GDPR consent stuff" to a Studio editor, but the field is actually used for the time-of-birth-unknown UX checkbox. After Phase 1 ships (D-3: remove `"consent"` from `formField.ts:68` enum), this confusion partially resolves — but the editor view of the final-page legal-acks block is still load-bearing for Becky's mental model of what she can vs can't edit.
- **Action (before `release/v1.0.0` → `main` merge):**
  1. Open `bookingForm` in Sanity Studio and trace what each field surfaces to Becky.
  2. Decide: should the hardcoded art6/art9/cooling-off block be visible in Studio at all (label-edit only, per D-1)? A read-only annotation block? Hidden entirely?
  3. If we keep label-edit-only: a sectioned + clearly-labeled Studio editor group ("Legal acknowledgments (label text only — required + render is hardcoded)") would make the intent unambiguous.
- **Folds into:** Phase 1 if the answer is "ship the label-edit-only block as part of P1.3"; otherwise, separate small studio-schema PR before main-merge.
- **Decision needed from:** Max + Becky together — what feels right in the editor view.

### Pre-prod data cleanup (test smoke residue)
- **Source:** Smoke session 2026-05-01.
- **What:** Test bookings ran end-to-end against prod (CF Workers + real D1 + real Sanity + real R2). The submissions / mirrored Sanity docs / uploaded photos remain. We don't have a dedicated dev environment yet; everything lands in the prod stores.
- **⚠️ Bucket-Lock-driven ordering (added 2026-05-13).** This cleanup is now a **hard precondition** before flipping `SANITY_BACKUP_ENABLED=1` on the production worker. Reason: the Phase 3 weekly cron writes the production Sanity NDJSON snapshot into `backups/weekly/<YYYY-Www>/dataset.ndjson` in the `josephine-backups` R2 bucket, which is under a **90-day immutable Bucket Lock**. If test bookings are still present when the first weekly cron fires, the snapshot includes them and the lock prevents deletion for 90 days minimum. See [`SANITY_BACKUP_RUNBOOK.md`](./runbooks/SANITY_BACKUP_RUNBOOK.md) → "9b. Production-readiness gate — pre-launch data cleanup".
- **Action before opening real traffic AND before flipping `SANITY_BACKUP_ENABLED=1` on prod:**
  1. `pnpm wrangler d1 execute withjosephine-bookings --remote --command "DELETE FROM submissions WHERE email LIKE '%@gmail.com' OR email LIKE '%@example.com' OR email LIKE 'gift-roundtrip-%' OR email LIKE 'stripe-roundtrip-%' OR email LIKE 'listen-roundtrip+%@withjosephine.com'"` — broadened to cover the Phase 5 Bundle A.0/A.1/A.2 staging round-trip specs which seed `gift-roundtrip-purchaser+<runId>@…`, `gift-roundtrip-recipient+<runId>@…`, and `listen-roundtrip+<uuid>@withjosephine.com` per run.
  2. Studio → Submissions → delete each test row that mirrored.
  3. R2 (`withjosephine-booking-photos`): delete the orphaned objects under `submissions/<id>/` for the deleted IDs (or wait for the orphan-reaper cron once it's running).
  4. Verify by sampling: `*[_type == "submission"] | order(_createdAt desc)[0..5]` in production Sanity + `SELECT id, email, created_at FROM bookings ORDER BY created_at DESC LIMIT 10` against production D1. Both should show zero test entries.
  5. **Sanity asset orphans from listen-roundtrip spec runs are LOW priority — do not chase.** The spec uploads two committed dummy fixtures (`dummy-audio.wav` + `dummy-reading.pdf`) per run. Sanity dedupes uploads by SHA-1, so N spec runs share ONE underlying asset doc per fixture. Asset cap is ~100GB; total footprint stays under 10KB regardless of run count. Revisit only if the fixture binaries are ever regenerated with new content (would create a second deduplicated asset doc).
- **Long-term fix:** stand up a real dev environment (separate D1 DB + Sanity dataset + R2 bucket + Stripe test mode wiring on dedicated subdomain like `dev.withjosephine.com`) so the next round of smoke testing doesn't pollute prod.

### Reading prices — data reconcile + Stripe Payment Link sync (Max+Josephine)

Data-only Max-action. Code surfaces (Sanity schema validation, prebuild `sync-readings-from-sanity` generator) already shipped.

- All three reading docs (production + staging) currently fail the price-vs-display validation as of 2026-05-06: `soul-blueprint` price=17900¢/display=$129; `birth-chart` price=9900¢/display=$89; `akashic-record` price=7900¢/display=$89.
- Max + Josephine: pick the canonical price for each reading, update `price` (cents) AND `priceDisplay` together in production Sanity, then update the matching Stripe Payment Link via the dashboard (Stripe prices are immutable — "create new Price + new Payment Link, swap URL on the reading doc, archive the old"). Staging mirror picks it up automatically through `/api/sanity-sync`.
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

## Phase 1 magic-link auth — review deferrals (post-launch, signal-gated)

5-vantage code review on 2026-05-10 surfaced ship-blockers and should-fix items that landed in the same PR as the auth foundation. The items below were deferred to follow-up work. Phase 1 itself is shipped (PR #130); these are polish + edge-case follow-ups.

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

#### B-3. `seedSubmissionForUser` test helper → `repo.createSubmission`
- **Source:** Code review Reuse + Quality + Engineer (3-lens convergence) 2026-05-10.
- **What:** `src/lib/auth/listenSession.test.ts` writes raw SQL to seed test rows, bypassing `createSubmission`. Drift risk: any future column added to `submissions` won't be exercised by these tests.
- **Action:** Lift to `src/test/seeds/submissions.ts` with a richer signature (`{ id, userId, status?, email?, readingSlug? }`). Reuse from Phase 2/5 tests.

#### B-4. `denyAndAudit` helper to collapse 4× duplicated audit writes
- **Source:** Code review Quality [NIT] 2026-05-10.
- **What:** `redeemMagicLink` repeats the same `await writeAudit({...}); return { ok: false, reason }` block at 4–5 error branches. Real divergence already showed up: `link_invalid` branch was missing `userAgentHash` that `link_email_mismatch` included.
- **Action:** Extract `denyAndAudit(reason, eventType, { userId, ipHash, userAgentHash, submissionId, now })`. Enforce consistency by construction.

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

## Phase 1 session 3 — /simplify + Pentester deferrals (post-launch, signal-gated)

Surfaced by the 3-reviewer /simplify pass + Pentester gate on `feat/listen-session3-redesign` 2026-05-11. The session-3 fixes that landed in-PR are recorded in the PRD verification block. Phase 1 session 3 is shipped (PR #130); the items below are follow-up polish.

#### S3-A1. `findSubmissionById` timing-oracle on `/listen/[id]`
- **Source:** Pentester HIGH-1, 2026-05-11.
- **What:** Logged-in attacker probing `/listen/[id]` with a random submissionId triggers a D1 SELECT regardless. Index hit vs miss is timing-distinguishable, so a session-bearing attacker can enumerate "submission exists" without ownership.
- **Why accepted-for-now:** Submission IDs are opaque CUID2 (~2^140 search space). The leak is binary "exists in D1" with no recipient/content info. Any logged-in user can already enumerate their own readings via `/my-readings`; this is a strictly weaker primitive.
- **Action:** Defer to Phase 4 hardening alongside the `crypto.timingSafeEqual` work (A-3). Cheap fix when it lands: speculatively call `findSubmissionRecipientUserId` even on no-session paths and discard, so all 3 signIn-producing branches do the same I/O.

#### S3-B1. Extract `applyTemplateVars(text, { firstName, readingName })` helper
- **Source:** /simplify Reuse R-3, 2026-05-11.
- **What:** Three sites template `{firstName}` / `{readingName}`: `Day7Delivery.tsx#template`, `resend.tsx#sendDay7Delivery` (subject), `ListenView.tsx#fillTemplate` (heading). Each is 2–3 lines of `replaceAll`. Drift class: someone adds `{readingPriceDisplay}` to one site, others silently miss it.
- **Action:** Lift to `src/lib/emails/template.ts` (or `src/lib/templating.ts`) exporting `applyTemplateVars(text, vars: Partial<{ firstName: string; readingName: string }>)`. Reuse from all 3 sites.

#### S3-B2. Typed `ListenOutcome` union shared across listen-page state + redirect routes
- **Source:** /simplify Quality Q-4, 2026-05-11.
- **What:** Three files (`src/app/listen/[id]/page.tsx`, `src/app/api/auth/magic-link/route.ts`, `src/app/api/auth/magic-link/verify/route.ts`) all reference the string literals `"sent"`, `"rested"`, `"throttled"` in URL search params / search-param checks. Drift risk: rename one without renaming the others.
- **Action:** Extract `type ListenOutcome = "sent" | "rested" | "throttled"` to a shared module (e.g. `src/lib/auth/listenOutcomes.ts`) + use across the 3 files.

#### S3-B3. State-forgery UX defense for `?error=rested` / `?sent=1` (Pentester LOW-1)
- **Source:** Pentester LOW-1, 2026-05-11.
- **What:** Attacker who knows a victim's submissionId can craft `https://withjosephine.com/listen/sub_x?error=rested` and trick the victim into clicking "Send me a fresh link". The form posts to `/api/auth/magic-link` which only sends email to the user-typed address — no destructive primitive. Confusion-only.
- **Action:** Accept. Document residual risk in privacy/security notes when launching. No code change.

#### S3-B4. Sanity-editor mailto subject header injection (Pentester LOW-2)
- **Source:** Pentester LOW-2, 2026-05-11.
- **What:** `copy.throttledMailtoSubject` / `copy.assetTroubleMailtoSubject` flow through `encodeURIComponent` then into a `mailto:` URL. Some mail clients still decode `%0D%0A` into header lines (`Cc:`, `Bcc:`). Threat actor must already be a Sanity editor — within their authorized role.
- **Action:** Accept OR add a Studio-side validation rule rejecting CR/LF in those fields. One-liner if it ships.

#### S3-B5. Audit row on magic-link throttle (Pentester LOW-3)
- **Source:** Pentester LOW-3, 2026-05-11.
- **What:** `/api/auth/magic-link` throttle fires before user lookup, so `user_id` is unknown. Currently silent. `writeAudit` accepts `userId: null`; filling this in would distinguish "throttled bursts from one IP" from "no traffic" in the audit table.
- **Action:** Add a `link_send_throttled` event_type + write on the rate-limit branch with `user_id: null`. Cheap addition for forensics.

#### S3-B7. `fetchCopyWithDefaults(loadDefaults, loadFetcher)` helper for Resend send paths
- **Source:** /simplify Reuse review on Phase 2 batch 2, 2026-05-11.
- **What:** Four send functions in `src/lib/resend.tsx` (`sendMagicLink`, `sendDay7Delivery`, `sendOrderConfirmation`, `sendDay2Started`) repeat the identical 4-line shape: lazy `await import(defaults)` + lazy `await import(fetch)` + `fetchX().catch(() => null)` + `{ ...DEFAULTS, ...(sanity ?? {}) }`. A `fetchCopyWithDefaults<T>(loadDefaults, loadFetcher)` helper would collapse 16 lines → 4 and centralize the swallow-error policy.
- **Why deferred:** The lazy-import is the load-bearing part (avoids pulling the Sanity client into the Resend worker bundle when emails are skipped). Abstracting the dynamic-import callbacks makes the bundler analysis harder to read. Land alongside S3-B1's `interpolate()` so the email-send path gets one canonical 2-line pattern in one PR.

#### S3-B8. Thank-you override fallback chain — drop the dead hardcoded literals
- **Source:** /simplify Quality review on Phase 2 batch 2, 2026-05-11.
- **What:** `src/app/thank-you/[readingId]/page.tsx:105-126` has 6 fields using `override?.x ?? thankYouPageContent?.x ?? "hardcoded literal"`. The seed script (`scripts/seed-customer-emails-and-pages.mts` + existing `seed-content-wiring-sweep.mts`) makes the middle term guaranteed-present in any seeded dataset, so the hardcoded literal tail is dead in practice — only live as belt-and-braces if the singleton is ever deleted.
- **Why deferred:** Belt-and-braces value is small but real. Fixing means trusting the seed script to be the sole source of truth, which is a stronger guarantee than the current code accepts. Land when the editorial workflow has 1+ week of stable runtime.

#### S3-B6. Welcome-back ribbon — masked-email reveal in State 4
- **Source:** UX Engineer spec — "Check your email" + masked email + send-another link.
- **What:** The current `CheckEmailCard` doesn't actually render a masked email (no email is known at that point — the user just submitted the form to the listen page route which doesn't echo the submitted email back). The spec is aspirational; needs either (a) a query-param-encoded masked-email pass-through, or (b) "Check the email you just entered" copy that doesn't require the address.
- **Action:** UX Engineer pass to decide between (a) and (b). Pure copy decision if (b); ~10 lines if (a).

---


---

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
