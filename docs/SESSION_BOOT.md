# Session Boot — Active State

## ✅ 2026-05-28 — PR #217 shipped: three follow-up fixes bundled on `release/v1.4.0`

Squash-merged at `9931964`. All three fixes from the locked plan landed in one PR (per Max's "should have been one combined PR" feedback after I initially set up three stacked draft PRs).

- **Fix #1 — purchaser tz on scheduled-gift OC email (dex `c1u7yn8g`, closed):** new D1 column `submissions.purchaser_time_zone` (migration `0017_purchaser_time_zone.sql`), `formatSendAt(iso, tz?)` accepts optional IANA zone, default UTC for legacy. Both gift POST + flip-to-scheduled validate via canonical `isIanaTimeZone`. Webhook reads tz from D1 row (mid-PR architecture pivot from the locked Stripe-metadata round-trip; D1 column matches Calendly/Eventbrite/Airbnb pattern).
- **Fix #2 — `(authed)` route group + brand top-bar (dex `gj1s46yv`, closed):** first Next.js route group in the codebase. `my-readings` (+ welcome), `listen/[id]`, `gift/intake`, `gift/claim/[token]`, `thank-you/[readingId]` moved underneath. New `src/app/(authed)/layout.tsx` adds sticky brand top-bar (✦ Josephine wordmark + Home link, `aria-label="Site"`, `border-j-border-subtle`). URLs unchanged so middleware path-based auth gating still works.
- **Fix #3 — brand DateTimePicker (dex `ahfwbcot`, closed):** new `src/components/Form/DateTimePicker/` replacing native `<input type="datetime-local">` in edit-recipient drawer + FlipToScheduledControl. After multiple rewrites, final shape is ONE text input → ONE popover with calendar on left + two scroll-snap HH/MM columns (60 minutes) on right. ARIA-APG roving-tabindex listbox on time columns (arrows move active option, Enter/Space commits). Done button + Escape close via `closeAndReturnFocus` (with `justClosedRef` guard against the `onFocus` reopen race). Partial state renders `dd/MM/yyyy` or `HH:mm` so selections feel responsive.
- **Bonus a11y polish on intake DatePicker + TimePicker:** `role="combobox"` + `aria-expanded`, today indicator as ring not gold-on-cream (was 2.6:1 → WCAG fail), 40×40 day buttons, calendar/dropdown SR labels, backspace-clears-onChange, partial-draft-preserved-on-blur, future-date-no-age-warning. TimePicker `aria-live` for "I don't know my birth time" toggle.
- **Shared `src/components/Form/DayPickerShared/dayPickerShared.ts`** — extracted duplicated `DAY_PICKER_LABELS` + `DAY_PICKER_BASE_CLASSES` (~55 LoC dedup).
- **New Storybook story** at `Form/DateTimePicker` (Empty / WithInitialValue / WithMinNow / WithError).
- **15 functionality tests** on DateTimePicker covering click + Enter + Escape + Done + Tab navigation + partial-state. CI green at 16m23s. 2067/2067 vitest.

**🚨 Outstanding Max-actions:**

1. ✅ **Apply D1 migration 0017 to staging** — done 2026-05-28 by Max. `purchaser_time_zone TEXT` column now exists on staging `submissions`.
2. **Apply D1 migration 0017 to production:** at `release/v1.4.0 → main` merge time via `pnpm migrate:apply:prod`.
3. **Real-browser smoke against staging** (per `feedback_real_browser_smoke_before_ship_claim`): walk through a scheduled-gift purchase to verify the OC email subject + body render the send-at in the purchaser's tz. Walk through `/my-readings` (and any of the moved routes) to verify the brand top-bar shows up. Open the edit-recipient drawer on `/my-readings/gifts` and verify the new DateTimePicker behaves correctly on real mobile (the iOS scroll-snap behavior inside Radix Portal is a known a11y-review flag worth verifying on device).
4. **Carry-over from PR #214** — still open: run Sanity migration against production (`scripts/migrate-my-gifts-remove-cancel-scheduled-2026-05-28.ts`) + re-deploy Studio (`pnpm run deploy` from `studio/`).

**NOT touched, flagged for explicit approval before any next session:**
- Removing `onFocus={() => setOpen(true)}` on DatePicker/TimePicker (changes intake form UX on `/book/intake` — TikTok-mobile primary traffic).
- iOS native `<select>` wheel risk inside Radix Popover in TimePicker (audit-flagged, needs real-device smoke).
- Replacing TimePicker's native `<select>` dropdowns with the same scroll-snap UX as DateTimePicker.

## ⚠️ Open Max-actions from PR #214 (2026-05-28)

- **Run Sanity migration against production**: `set -a && source .env.local && set +a && pnpm tsx scripts/migrate-my-gifts-remove-cancel-scheduled-2026-05-28.ts` — unsets 4 removed fields + applies new flip label only if old default present (preserves any Becky edits). Idempotent. Staging already run + verified (4 fields unset, label flipped) during the session.
- **Re-deploy Studio**: `pnpm run deploy` from `studio/` so Becky sees the updated `flipToSelfSendCtaLabel` field title + description.

## 📌 Resend leak post-mortem (2026-05-28)

For ~2 days (since Phase 1 deploy 2026-05-26), Stripe-webhook order-confirmation emails sent to test-spec recipient addresses (`library-one-tap+...@withjosephine.com`, `listen-one-tap+...@withjosephine.com`, `prod-smoke+...@withjosephine.com`) leaked into Max's real inbox via Cloudflare Email Routing. Root cause: hardcoded `SANDBOX_EMAIL_PREFIXES` list in `src/lib/resend.tsx` went stale when Phase 1/2/3 specs introduced new prefixes without registering them. The prefix guard is load-bearing for cron / DO alarm / webhook paths that have no request context for the `X-E2E-Resend-DryRun` header to reach.

Plugged in PR #214 commit `a5cfad1`: added missing prefixes + new vitest scanner `src/lib/resend.sandboxPrefixes.test.ts` walks all e2e specs and asserts every `*@withjosephine.com` prefix is registered. Drift now fails pre-push.

**Layer-3 defense filed as dex `5f0bqd2d` (p1, under mktrrouq)**: env-gated allowlist — in staging/sandbox, reject ALL Resend sends to recipients NOT in a tiny production allowlist (Max, Becky, `hello@`, `NOTIFICATION_EMAIL`). Layers 1 (prefix list) + 2 (scanner test) catch ~all known drift; layer 3 makes it structurally impossible. Not blocking, but should land before another set of Phase-class specs introduces a new prefix.

New durable memories:
- [feedback_no_emails_in_testing_period](../MEMORY/...) — three-layer email-defense rule.
- [feedback_run_tests_locally_before_push](../MEMORY/...) — don't burn sandbox CI cycles iterating on test fixes; vitest + Playwright mock mode locally first.
- Updated [feedback_resend_dry_run_paths] with the prefix-drift failure mode call-out.

## ✅ 2026-05-28 — RESOLVED `lc9w5xd1` (intake picker "stacking" bug) — actually a data-corruption bug

Three PRs to reach the real fix; the picker was never losing the z-order battle.

- **PR #213 (squash `906894c`, the actual fix)** — Staging Sanity stored `blush`, `ivory`, `rose` as recursively-nested color objects 4 layers deep (`{hex: {hex: {hex: {hex: "#…"}}}}`), most likely from a re-save loop in the Studio colorInput plugin. Build-time `${color.hex}` template literal stringified the top object as `"[object Object]"`, landed `--j-blush: [object Object]` in tokens CSS, made `bg-j-ivory` resolve to invalid color, **popover background went transparent**, and form FloatingLabels + the unknownToggle checkbox showed through the picker exactly like a z-index inversion. Fix: `extractHex` helper that walks `.hex` until it finds a `#…` string. Applied to semantic-color loop, RGB-channel writers, and email-tokens emitter. Regression test asserts a 4-deep shape resolves cleanly. Verified end-to-end: deployed CSS has 0 `[object Object]` (was 3); Max confirmed staging is clean.
- **PRs #210 / #211 / #212** — all attacked the wrong layer (z-index, then hand-rolled createPortal, then Radix Popover). Code from #212 stays (Radix migration is a genuine quality improvement — proper a11y, ESC, focus, no hand-rolled stacking logic — even if it wasn't the bug fix). The wrapper-z-30 and the manual portal hook from #210/#211 are gone.
- **Follow-up:** dex `axfyutyx` (clean the Sanity content — re-set blush/ivory/rose in Studio so the document shape is flat). Defensive code makes the build safe regardless; the data is still misshapen.
- **New durable memory:** `feedback_check_data_when_ui_fix_keeps_failing` — when a UI bug recurs through 2+ fix attempts at the same layer (component, z-index, portal), the cause is somewhere else (data, generated CSS, build pipeline). Open the deployed bundle, follow the var chain to the resolved value, audit the build pipeline. Companion to `feedback_settle_counts_with_grep_not_agents` and `feedback_stop_the_fix_spiral`.

## ✅ 2026-05-27 — v1.4.0 real-browser smoke on staging (Phase 1/2/3)

Ran the v1.4.0 smoke against `staging.withjosephine.com` with a live `wrangler tail` monitor (guide: `docs/SMOKE_v1.4.0.md`). Day-7 force-send done via `cloudflared access` JWT + `.env.staging` CRON_SECRET (raw curl 302s on CF Access; `.env.local` CRON_SECRET differs and would 401 — staging value is the right one).

- **J-A one-tap day-7 delivery — PASS with a finding.** Email (single button) → `/my-readings/welcome` → `/listen/[id]?welcome=1`, audio plays, PDF downloads. BUT first load fired ~20 parallel `/api/listen/[id]/audio` GETs all OOM-killed at once (42× `Worker exceeded memory limit`, runtime-terminated as `Canceled`) and tripped `LISTEN_ASSET_LIMITER` → user-visible "too many requests" 429 before it recovered. Upstream `cdn.sanity.io` honors Range (206 verified) but the proxy logged 200 every time. 4.27MB file. Filed dex **`pknswojr`** under epic 23ctexvw — real defect on the core delivery surface, especially risky on mobile/TikTok 375px. Root-cause deferred to next (client parallel-burst + 200-vs-206 forwarding).
- **J-B unified library + redirects — PARTIAL.** `/my-readings` two-tab strip, Gifts tab → `/my-readings/gifts`, deep-link, legacy `/my-gifts` 308 all work. BUT for gift-only accounts (0 readings) the **Readings tab is unreachable** — clicking it is a no-op. `LibraryView.tsx:104` derives `activeTab` from `defaultTab` (which is `gifts` when readings empty) and `handleChange` only navigates on path change, so selecting Readings at `/my-readings` (already the path) does nothing. Masked for users with ≥1 reading. Filed dex **`7v1vx0wm`**.
- **J-C step-up OTP — PASS (incl. elevation reuse).** Confirmed in tail on gift `b82267d4` (purchaser maxgertzen@gmail.com): `edit-recipient` 200(elevationRequired) → `step-up/request` 200 → `step-up/verify` 200 → `edit-recipient` 200. Step-6 elevation reuse verified by force-setting `elevated_at=now` on the active sessions: a subsequent `edit-recipient` succeeded (19:50:52) with NO preceding `step-up/request` → within the 10-min window a second mutation skips the OTP. The earlier apparent re-prompt was a two-active-sessions artifact (a newer un-elevated session `03c7236e` spawned alongside the elevated `898fc34a`), not a reuse bug — though worth noting that a fresh session spawned mid-flow.

These close the outstanding "real-browser smoke against staging" Max-actions for Phase 1/2/3 below (audio caveat tracked in `pknswojr`).

**✅ SHIPPED 2026-05-27 — dex `0bjxc38w` (PR #208, squash `0132fa7`):** `/my-readings` redesigned as a single scrollable page with stacked "Mine" + "For others" sections; tab strip + `/my-readings/gifts` route + `Tabs`/`TabPanel` deleted. Both section headings always render → closed the gift-only unreachable-tab bug `7v1vx0wm` at the root (both `0bjxc38w` + `7v1vx0wm` dex-completed). Verified: 2046/2046 vitest + build + real-Chromium smoke at 375px (4 scenarios, zero errors). Follow-ups filed: dex `5fqrgvia` (stale `MyReadingsView` Studio-preview twin) + `laj8x38r` (reconcile `defaults.ts` with Becky's prod Sanity edits). **Max-action:** Studio re-deploy so Becky sees the renamed section-heading fields (`readingsTabLabel`/`giftsTabLabel` values now "Mine"/"For others", keys unchanged).

**✅ RESOLVED 2026-05-27 — `pknswojr` (PR #209, squash `8357c32`):** audio first-load OOM/429 storm fixed with a one-attribute change `preload="metadata"` → `preload="none"` on the `/listen` voice-note element. The `metadata` value probed the media on page load (server component, not React) → no-Range full-file 200 streams → ~20 concurrent × 4.27MB hit the 128MB workerd cap → stall/retry cascade tripped `LISTEN_ASSET_LIMITER` → 429. `preload="none"` fires zero load-time requests; play issues sequential Range requests. Proxy/route/rate-limit untouched. Verified in real Chromium. dex `pknswojr` closed.

**▶ Ready items:** dex `5fqrgvia` (stale `MyReadingsView` Studio-preview twin), `laj8x38r` (reconcile `defaults.ts` with Becky's prod Sanity edits), Phase 4 `zgd1sjpu` (replace destructive cancel-scheduled with claim-for-yourself).

**Smoke residue to clean on staging:** forced day-7 on submission `4b3b2bdb`; gift `b82267d4` recipient was edited during J-C.

## 🆕 ACTIVE 2026-05-26 — `release/v1.4.0` carries Phase 1 + Phase 2 + Phase 3 of epic 23ctexvw

**Phase 3 (dex `khb6hor6`, closed):** PR #207 squash-merged (`9238f82`). Sandbox CI revealed Phase 2's merge commit `da006dd` never triggered ci.yml, so staging was stale at Phase 1 code. PR #207 merge re-fired ci.yml → deploy-staging deployed Phase 2 + Phase 3 together (ci.yml run `26457695131`). Migration 0016 applied to staging D1 (added migrations 0014, 0015 too — they hadn't been applied either). `AUTH_TOKEN_SECRET` rotated atomically on staging worker + `STAGING_AUTH_TOKEN_SECRET` in GH env (both match). `STAGING_LISTEN_TOKEN_SECRET` is now redundant (legacy fallback only; can be removed in next session). Workflow `e2e-sandbox.yml` updated to map `STAGING_AUTH_TOKEN_SECRET → AUTH_TOKEN_SECRET` for in-spec token minting.

Surface: D1 migration 0016 (elevated_at column on listen_session + step_up_otp ledger), HKDF stepup.v1 subkey, OTP primitive (15-min code TTL, 10-min elevation TTL, 5-attempt poison, 30s gap + 3/30min throttle), POST /api/auth/step-up/{request,verify}, requireElevation guard wired into edit-recipient + send-now (other 3 gift mutations untouched per Council 2), Sanity emailStepUpOtp singleton + StepUpOtp.tsx (brand-lite, no GoldHero), StepUpOtpModal with full a11y (role=dialog, focus trap, ESC, backdrop close, aria-modal, inputmode=numeric, autocomplete=one-time-code), useMutationAction extended additively with elevationRequired + retry. 76/76 ISC, 2054/2054 vitest tests (+99 baseline). PRD complete at `MEMORY/WORK/20260526-115511_phase3-stepup-otp-auth/PRD.md`.

Filed during the merge sweep: dex `dsk9z62m` — backfill `/my-gifts` URL redirect into legacy e2e specs (gift-send-now, gift-flip-to-scheduled-tz, my-gifts-local, gift-local) where `signInViaMagicLink({next: "/my-gifts"})` waits on a URL that 308-redirects to `/my-readings/gifts`.

Phase 3 outstanding (post-deploy):
1. Real-browser smoke against staging per `feedback_real_browser_smoke_before_ship_claim`: open `/my-readings/gifts`, attempt edit-recipient mutation, expect modal, fetch OTP from staging inbox, verify round trip, verify ESC + backdrop close + ARIA via DevTools.

## ✅ Earlier 2026-05-26 — `release/v1.4.0` carries Phase 1 + Phase 2 of epic 23ctexvw

**`release/v1.4.0`** cut from `release/v1.3.0@2ee6f20`. Phase 1 PR #205 squash-merged (`c792ed5`) + lint hotfix `89768f4`. **Phase 2 PR #206 squash-merged (`da006dd`) 2026-05-26.** Phase 1 is live on `staging.withjosephine.com`; Phase 2 ships next deploy.

**Phase 2 (dex `vwfcb5jr`, closed):** Unified `/my-readings` library with gifts tab; `/my-readings/gifts` deep-link; legacy `/my-gifts` 308-redirects. New HMAC library-token primitive (`src/lib/auth/libraryToken.ts`) + single-use D1 ledger (migration `0015`) + POST-confirm interstitial at `/my-readings/welcome` + redeem route at `/api/library/redeem`. Hand-rolled semantic ARIA Tabs component (first in codebase). 4 purchaser-facing email templates carry a tokenized library button (OC + both Gift Purchase Confirmation variants use primary variant; Day-7 uses secondary). Recipient-bearer emails do NOT carry the library button. Stripe webhook gift branches resolve purchaser via `getOrCreateUser` and persist `purchaserUserId`. **Auth-secret consolidation:** single master `AUTH_TOKEN_SECRET` with HKDF-SHA256 per-purpose subkey derivation in `src/lib/auth/tokenSubkey.ts`. Drops both `LISTEN_TOKEN_SECRET` and `LIBRARY_TOKEN_SECRET`. Three in-session review passes (Designer, reuse/quality/efficiency, security) surfaced 1 P1 security blocker + 4 important fixes; all must-fix items landed in the same PR before merge. +68 tests (1896 → 1964).

**🚨 Outstanding Max-actions for Phase 2 verification:**

1. ✅ **Provisioned `AUTH_TOKEN_SECRET` on staging worker** — confirmed by Max 2026-05-26. Staging worker + GH staging env (`STAGING_AUTH_TOKEN_SECRET`) both carry the secret. `STAGING_LISTEN_TOKEN_SECRET` is redundant and can be removed.
2. **Apply D1 migration 0015 to staging post-deploy:** `pnpm migrate:apply:staging` adds the `library_token_redemptions` table.
3. **Re-deploy Studio:** Phase 2 added new fields to `myReadingsPage` Sanity singleton (`readingsTabLabel`, `giftsTabLabel`, `welcomeHeading`, `welcomeSubhead`, `welcomeButtonLabel`). `pnpm run deploy` from `studio/` so Becky sees the new fields. All have hardcoded fallbacks so missing edits are non-blocking.
4. **Real-browser smoke against staging:** verify the tab strip, deep-link `/my-readings/gifts`, legacy `/my-gifts` 308 redirect, and a one-tap library-link round-trip via a forced day-7 send. Per `feedback_real_browser_smoke_before_ship_claim`.
5. **Phase 1 follow-up still open:** `STAGING_LISTEN_TOKEN_SECRET` is now superseded by `STAGING_AUTH_TOKEN_SECRET` (Max-action #1 above). Real-browser smoke of the Phase 1 one-tap day-7 path still pending; can be folded into Phase 2's smoke walk.

**Phase 2 deferrals captured in dex `e737za2a`** (under parent epic 23ctexvw, NOT release-blocking): welcome page bfcache hardening, redactSearchParams fragment defense, user-exists check at redeem, requestAudit HKDF migration, middleware isMyGifts cleanup, verifyTokenEnvelope dedupe between listen + library, mint-source enum centralization, replay-rejection UX for legitimate double-clicks (Phase 1 listen-redeem has the same flaw).

**Next phase: dex `khb6hor6` (Phase 3 step-up OTP auth) — IMPLEMENTATION COMPLETE on `feat/phase3-stepup-otp-auth` 2026-05-26, awaiting PR-open.** Branch sits 4 commits ahead of `release/v1.4.0`: Agent A foundation (`ac18412`) + Agent B email/Sanity (`4eedc4c`) + Agent C UI modal (`e4c8329`) + stub→canonical sender fixup (`5e1c3c0`). All gates green: typecheck, lint, test (2054/2054, +99 net), build. 76/76 ISC complete. PRD at `MEMORY/WORK/20260526-115511_phase3-stepup-otp-auth/PRD.md`. Outstanding Max-actions: (1) real-browser smoke against staging post-deploy, (2) `pnpm migrate:apply:staging` for D1 0016, (3) PR-open via `sentry-skills:pr-writer`, (4) `dex complete khb6hor6` after squash-merge. Pentester sweep skipped (inherits Phase 1 listen-token verdict on same primitive shape); simplify + code-review deferred to release/v1.4.0 → main merge per `feedback_simplify_scale_to_change_size`.

## Earlier — Phase 1 shipped 2026-05-26

PR #205 squash-merged (`c792ed5`) + lint hotfix `89768f4`. All 7 CI jobs green on `89768f4`: lint+typecheck, security-audit, storybook, test, **deploy-staging ✅**, sanity-validate-staging ✅. Phase 1 is live on `staging.withjosephine.com`.

**Phase 1 (dex `rbl5u2st`, closed via dex complete on merge):** HMAC-SHA-256 listen-token primitive + D1 single-use ledger (migration 0014) + POST-confirm interstitial + admin manual-resend bug fix (was passing raw R2 URL as listen URL) + `Referrer-Policy: no-referrer` on `/listen/*` + Sentry `beforeSend` redaction. Auto-probe pattern in `tests/e2e/specs/listen-one-tap-roundtrip.spec.ts` self-activates when the redeem route is deployed (no env-var flip required). Red-team passes closed all 5 Pentester P1 blockers; 3 simplify reviews + 1 security review surfaced 6 fix-ups, landed in one commit pre-PR. +60 tests (1836 → 1896).

**Phase 1 PRD:** `MEMORY/WORK/20260526-060559_implement-epic-23ctexvw-phase-1/PRD.md` (phase: complete, 91/93). Two ISC PENDING (real-browser smoke + dex flip) both completed post-merge.

**🚨 Outstanding Max-actions for full Phase 1 verification:**

1. **`STAGING_LISTEN_TOKEN_SECRET` GH secret NOT YET SET** (verified missing via `gh secret list --env staging` 2026-05-26). Without it, the 8 e2e roundtrip scenarios B/C/G/H fail because in-spec `mintListenToken` produces sigs staging rejects as `bad_signature`. Two options:
   - **Use existing staging worker value:** retrieve from 1Password or wherever the value was saved at first provisioning, then `gh secret set STAGING_LISTEN_TOKEN_SECRET --env staging --body "<value>"`. No rotation, no side effects.
   - **Rotate** (only on staging — production is fine): `NEW=$(openssl rand -hex 32) && echo "$NEW" | pnpm exec wrangler secret put LISTEN_TOKEN_SECRET --env staging && gh secret set STAGING_LISTEN_TOKEN_SECRET --env staging --body "$NEW"`. Side effect: any in-flight staging gift-claim cookies (shared secret) fail to verify, recipients re-claim cleanly.
   - **Skip entirely** by waiting for dex `qz94q5g2` (test-mint endpoint refactor) which eliminates this coupling.

2. **Real-browser smoke against staging** (per `feedback_real_browser_smoke_before_ship_claim`, binding): force a day-7 send for a delivered staging submission via `curl -X POST -H "Authorization: Bearer $STAGING_CRON_SECRET" "https://staging.withjosephine.com/api/cron/email-day-7-deliver?force=<submissionId>"` → check inbox (or wrangler-tail) → tap email button → expect Welcome interstitial → tap Continue → expect `/listen/[id]?welcome=1` with audio + PDF visible. Verify Sentry breadcrumbs don't leak `?t=` by injecting a controlled error.

3. **Phase 2 starts** when ready: dex `vwfcb5jr` (unified `/my-readings` library with gifts tab). Branch off `release/v1.4.0`, apply the canonical-helpers-Explore pattern (per `feedback_canonical_helpers_before_agent_dispatch`) before Wave 1 dispatch.

4. **release/v1.4.0 → main PR** is later, after all 6 phases (or 5 if Phase 6 stays deferred) land on the release branch. Independently, `release/v1.3.0 → main` apex-unpark hold-gate is still open from before this epic started.

**Phase 6 deferrals documented in PRD** (do not re-litigate in Phase 1 PR review): HKDF subkey, `kid` rotation, AEAD-encrypted payload, customer-education page (DMARC `p=reject` audit + sender-domain footer + how-to-verify-a-real-email page), revoke-all-links affordance, GET-side response-shape oracle (drop GET verify, render interstitial unconditionally), `formString` triplication across magic-link + redeem routes, audit-row copy-paste in `listenSession`.

## ✅ STILL ACTIVE — Architectural epic `23ctexvw`: phases 2-6 remaining

MAX-APPROVED 2026-05-26 implementation arc, supersedes the day-7 copy fix from the audit epic. **Before touching any email / auth / listen-page / /my-readings / /my-gifts / gift-cancellation code, read `dex show 23ctexvw` and the relevant phase child.** Source artifacts at `www/MEMORY/WORK/20260525-230307_copy-audit-emails-and-pages/`: AUDIT.md (30-surface audit), RESEARCH.md (Bucket A vs Bucket B industry pattern), COUNCIL-1-chain-length.md (UX 4-persona), COUNCIL-2-library-auth.md (with Devi code-verification). Durable memory: `project_one_tap_architecture.md`.

**Six phase children (sequenced for safe shipping):**
- Phase 1 `rbl5u2st`: tokenized listen-link primitive + one-tap day-7 + admin-resend alignment
- Phase 2 `vwfcb5jr`: unified `/my-readings` library with gifts tab (URL stable)
- Phase 3 `khb6hor6`: step-up OTP (`elevatedAt`, 10-min TTL) on edit-recipient + send-now + claim-for-yourself
- Phase 4 `zgd1sjpu`: replace destructive cancel-scheduled with claim-for-yourself; UI cancel gone (Max 2026-05-26); server-side stage gate `giftClaimedAt || responses != null`
- Phase 5 `l0xynlxs`: stacked-vertical button hierarchy in emails + day-7 copy rewrite (drop em-dashes) + post-redemption new-device notice
- Phase 6 `09z53mtu`: OPTIONAL watermark + geo-reverify (defer unless incident)

Audit-epic `2wlp1oys` children `558hhza8`, `m259wtc9`, `j4y4yv0n` marked superseded; close on Phase 1 ship.

## ✅ ACTIVE 2026-05-25 — `release/v1.3.0` — U3-U8 EPIC SHIPPED, apex unpark remaining

Promoted UX epic `wz9t979j` (U3-U8) COMPLETE. 4 PRs shipped against `release/v1.3.0` in one session:
- ✅ `wwqgjtjo` — U3 download filenames (PR #200 `00bae05`)
- ✅ `k9x59wwp` — U5 gift-purchase prefill purchaser email (PR #201 `4b7c4b6`)
- ✅ `dtq86ycp` — U4 hover affordance audit (PR #202 `53bfa40`)
- ✅ `em3o7rz6` — U7 + U8 Studio bundle (PR #203 `75daeac`). U7 audit found booking + thank-you already wired via Sanity Presentation Tool (PR #198 + `studio/presentation.ts`). U8 decision LOCKED: compute claimed-vs-paid from `giftClaimedAt` presence — no enum, no migration. Status label + 7-day countdown derived in `studio/schemas/submissionPreview.ts` via pure helpers. 25 new tests, 1816/1816 passing.

**Post-U3-U8 work shipped on `release/v1.3.0`:**
- `d7df7d2` — Simplifier ref: collapse statusLabel double-parse + dead Claimed fallback
- `96a5703` — Empty-body bug fix: `scripts/backfill-empty-email-bodies-2026-05-25.mts` + seed-script update for `emailSharedShell`; backfilled 4 prod email singletons (OrderConfirmation, Day-7 Delivery, RecipientIntakeReceived, PrivacyExport) where the v1.2.1 body migration never reached production
- `2ee6f20` (PR #204) — Address ALL code-review findings: H1 header-injection defense in `buildContentDisposition`, M1 slug coverage tests, M2 CSS `:not([readonly])` carve-out, M3 `useSyncExternalStore` GiftForm prefill refactor (no eslint-disable), M4 cross-flow draft guard, L1 plural grammar, L2 dev-only future-clamp warn, L3 `webm` dead-branch removal. Final test suite: 1836/1836.
- Studio deployed to `withjosephine.sanity.studio` (both workspaces): `pnpm run deploy` from `studio/` after CI green on `2ee6f20`. Includes the new submissionPreview status label + countdown widget.

**Active branch:** `release/v1.3.0`
**Most-recent commit:** `2ee6f20`
**Open PRs on release/v1.3.0:** none
**Main:** `ec8a8f1` (v1.2.1 + bookkeeping)
**Tags:** `v1.1.0` at `882752d`, `v1.2.0` at `94e9d5d`, `v1.2.1` at `ec9c181`

**Follow-ups filed during the arc:**
- `ym2efbwn` — Hero.tsx motion.div a11y gap (onClick without role=button + keyboard handler; CSS rule can't bridge). NOTE: originally claimed-filed as `zhyes1s7` in commit `e92c7cc` but that create was a silent no-op (the pattern from `feedback_dex_create_verify_with_show`); re-filed correctly 2026-05-25.
- `vw4zmbp5` — Studio workspace auth config divergence (warning at deploy time). Consolidate production + staging auth blocks to one shared config.

**Remaining apex-unpark hold-gate (dex epic `wdpz1ux4`, 6 open subtasks):**
- `wc4rzud9` — Pre-prod data cleanup (D1 + R2 + Sanity)
- `cdw3mnpg` — Stripe test-mode webhook split
- `ttys8qku` — Re-run smoke walkthrough on prod
- `lc9w5xd1` — Birth-time picker z-index (customer-facing intake bug, promoted 2026-05-26)
- `td3f86z6` — Seed `notFoundPage` + `underConstructionPage` singletons (customer-facing 404/under-construction fallback, promoted 2026-05-26)
- `ym2efbwn` — Hero.tsx motion.div a11y (keyboard-accessibility on landing, promoted 2026-05-26)
- (operator) Production-side `recipient-user-id` repair behind `--i-understand-this-is-production`

**Pending categorization** (Max is filing magic-link-flow tasks 2026-05-26; revisit after that):
- `ipicaebk` C5: `/api/booking/gift-redeem` intermittent 400
- `njrrqb0f` C3-b: `/my-gifts` empty listing race
- `yf5ciq64` C4-b: J3 heading + listen-page greeting copy
- `a042z5dj` magic-link email copy neutralization
- `zs255zyi` rotate `DO_DISPATCH_SECRET`

**Next steps:** when apex unpark hold-gate items above are operationally cleared, open `release/v1.3.0` → `main` PR (cumulative simplify + code-review pass via `sentry-skills:code-simplifier` + `sentry-skills:code-review` before opening, per `feedback_simplify_scale_to_change_size`).

## ✅ RESOLVED 2026-05-25 — `release/v1.2.1` MERGED to main via PR #199 (merge `5aa49bc`)

v1.2.1 is shipped + deployed to production. Tag `v1.2.1` at `ec9c181`. All CI green on main (`5aa49bc`) including `deploy-production` + `smoke-production`. dex `f7yhvvc3` + `cpwaqf4d` + `x2lhyv0j` + `o1hejeb1` closed. The v1.2.1 epic `d8pvexdm` remains open only because `k6ao10b8` carries `2un31amb` (PR-Email-2 cleanup pending Becky verification on prod Sanity) and `kf1nixad` carries `h1zu9nkr` (image-rendering polish follow-up).

## Earlier in session — v1.2.1 workerd PT render + Sanity-mirror dataset misrouting

Two production-class regressions root-caused and shipped today on `release/v1.2.1`. Staging is healthy; gift flow is fully working end-to-end.

**PR #189** (squash `fea50ce`) — Workerd PT renderer + canonical vendor types audit. Replaced `<PortableText>` from `@portabletext/react` (uses `useMemo`; null React dispatcher in workerd `react-dom/server.edge`) with a hand-rolled hook-free renderer in `src/lib/emails/PortableTextBody.tsx`. Was throwing `TypeError: Cannot read properties of null (reading 'useMemo')` on every gift email send — surfaced only on gift paths because `notifyPaid.ts` `.catch()` silently swallows the same throw for OC / Day7 / magic-link / privacy-export. Audit collapses `EmailRichText` fuzzy union → `PortableTextBlock[]`, migrates 29 defaults via `stringToPortableTextBlocks`, aliases `SanityPortableTextBlock` to `@portabletext/types`, swaps `D1Database` + R2 leaf types to `@cloudflare/workers-types`. Bonus fix: `SanityEmailMagicLink.body` was hand-typed `string[]` despite block-array schema.

**PR #190** (squash `29413e1`) — Sanity mirror dataset-resolution hotfix. `getSanityWriteClient()` now async, resolves `NEXT_PUBLIC_SANITY_DATASET` at call time from `getCloudflareContext().env`, not from the Next-DefinePlugin-baked string literal. Root cause: a manual `wrangler deploy --env staging` from a local checkout whose `.env.local` carried `NEXT_PUBLIC_SANITY_DATASET=production` baked `dataset:"production"` into the staging worker bundle; the wrangler runtime override was ignored because the read had been replaced before execution. Result: every D1-mirrored submission from 2026-05-25T04:39Z onward landed in `e8jsb14m/production` instead of `e8jsb14m/staging`. ~10 orphan rows stranded in production — backfill tracked in dex `gai69xwr`.

**Outstanding for v1.2.1 → main merge (in execution order):**
- ✅ `gai69xwr` — Closed 2026-05-25. orphan-Sanity backfill applied + post-check returns 0.
- ✅ `n1ef2zvo` (U2/U6 Sub-PR D) — Closed 2026-05-25. Recipient-user-id repair script + migration 0013 shipped. Staging apply: 5 rows repaired including the canonical `bb5fe157`. Production apply remains hold-gate per source PRD Phase G.
- ✅ `3tg8bjp4` — Closed 2026-05-25 audit-only (codebase already swept by PR #189 + #190).
- ✅ `6eeo28cm` — Closed 2026-05-25 via PR #192. Day-7 Delivery email gained brand shell (Container + brand header + gold hero + reading card + signoff + footer).
- ✅ `9t7143kz` — Closed 2026-05-25 via PR #193. Shared `emailSharedShell` Sanity singleton extracted; 7 templates accept optional `shell` prop with `EMAIL_SHARED_SHELL_DEFAULTS` fallback; legacy per-email brand fields hidden+readOnly; senders fetch shell in parallel.
- ✅ `pkr6rszw` + `glj8qkob` — Closed 2026-05-25 as part of 9t7143kz scope expansion. MagicLink (3 variants) + PrivacyExport now render the full brand shell. `heroLine` + `buttonLabel` fields added + seeded on staging. Day-7 button overflow fix landed in the same arc (className-padding pattern was overflowing the container; replaced with inline-style padding matching `GiftClaimEmail`). Day-7 reading-price dropped from card (gift recipients receive the email and never paid).
- ✅ `6qayweun` — Closed 2026-05-25 via PR #194 (squash `f5e2ebb`). 3-persona council (Reni / Brook / Theo) landed Pattern B with arrow ("Action → Recipient") across all 11 customer-facing email schemas. Three title surfaces aligned: schema `title:`, `deskStructure.ts` desk-list titles, and `preview.prepare()` titles (third surface discovered mid-implementation when the editor-pane H1 still showed the old name). Studio description affordance built as `studio/components/EmailDescriptionBanner.tsx` — a `form.components.input` that detects email-schema document roots and renders the description in a tone=default Card above the form fields. Visually differentiated from the tone=primary tokens callout. TTL claims in each description match verified code constants (24h magic links, 7d sign-in, 90d reading access, +7/+14/+21d gift reminders, 7d privacy export download).
- ✅ `jy9fwtf4` — Closed 2026-05-25 via PR #195 (squash `d51e1cb`). Added a 13px muted "Or copy this link: <URL>" line directly below the magic-link button. URL now renders as both the button href AND visible body text so recipients on hostile clients (Outlook Word renderer, dark-mode masking the styled bg, anti-spam button rewriters) can still copy and paste. Covers all three magic-link variants via the shared `MagicLink` component. Closes the code-review MEDIUM finding from PR #193 review.
- ✅ `cxt2ez79` — Closed 2026-05-25 via PR #196 (squash `38507fb`). Extracted `BrandHeader` + `GoldHero` + `EmailFooter` JSX components from 9 customer-facing email templates. Net diff +150 / -587 = -437 LoC (more than 2× the dex task's ~200 LoC win estimate). `GoldHero` accepts an optional `nowrap` prop (5 of 9 templates pin the hero on one line); `EmailFooter` accepts optional `signoffPaddingTop` (PrivacyExport's 20px outlier). Byte-equality snapshot suite (`src/lib/emails/email-shells.snapshot.test.tsx`) captures the rendered HTML of all 11 templates at the pre-refactor baseline — the refactor left every snapshot identical, validating that react-email's inliner produced byte-equivalent output across the nested-custom-components risk the dex task explicitly warned about. JSX-side complement to PR #193's data-side shared-shell singleton extraction.
- ✅ `o1hejeb1` — Closed 2026-05-25 as decision (no commit). Day7OverdueAlert stays BARE — admin-facing operational alert sent to Josephine, brand shell would add noise without value. Current `SerifHeading + LabelValueRow + Text` renderer preserved.
- 🟡 `kf1nixad` (PR-1 of 2 shipped) — Closed PR #197 (squash `3b34657`). Behavior-preserving refactor extracted `R2_PUBLIC_ORIGIN` to `src/lib/r2/publicOrigin.ts` and `SubmissionRecord` + companion types (`SubmissionStatus`, `EmailFiredType`, `EmailFiredEntry`, `GiftDeliveryMethod`) to a pure-type module `src/lib/page-previews/types.ts`. `submissions.ts` re-exports types for back-compat; only the 3 gated-page views + `GiftCardActions` updated to import directly from the new module.
- ✅ `x2lhyv0j` — Closed 2026-05-25 via PR #198 (squash `d9281a8`). Studio-bundled gated-page preview across 6 surfaces / 22 fixture states. Tailwind compile pipeline (55KB CSS), next/navigation + next/image stubs at `studio/preview-stubs/`, iframe `key` remount on each render. Pre-push gates green (lint, typecheck, 1771/1771 tests, both builds). Net +1122/-581 LoC. Follow-up `h1zu9nkr` (CORP-same-origin image rendering) tracked separately — not release-blocking.
- ✅ `o1hejeb1` — Closed 2026-05-25 as KEEP-BARE decision. Day7OverdueAlert is admin-facing operational alert; brand shell would add noise.
- ✅ `cpwaqf4d` — Closed 2026-05-25 via commit `345e6fa` + hotfix `fcb9067` (CI token-empty-string fix: `??` → `||`). `scripts/sanity-validate.mts` + contract module + CI `sanity-validate-staging` job. Three severity tiers: DRIFT (fails CI), MISSING (warning), WARNING (zombie consent probe). Final staging run: drift=0 missing=2 warnings=0. Follow-up `td3f86z6` files the 2 missing singletons (notFoundPage + underConstructionPage) for separate seeding.
- ✅ `f7yhvvc3` — Closed 2026-05-25 via 3 commits. Simplifier: `58d3877` (canonical PortableText vendor types, -18 LoC) + `ba6d0da` (single-use helpers + shared studio workspace config, -19 LoC). Code-review surfaced 3 HIGH on `scripts/repair-recipient-user-id.mts` (no write-path test coverage); closed via DI refactor + 4 tests in `bce8b5c`. 10 MED/LOW follow-ups filed (w7iz3o2t, thdesb5b, 5imv4l0e, 35txg0an, vf1seylg, d5y8qzl5, 3syvah89, dn17560j, dsyeraob, qhd4j1xk).
- ✅ `bce8b5c` — DI refactor of `applyRepair` (Deps interface threaded through; production CLI wires real impl unchanged) + `assertNotInTestMode()` env-guard inside real `execD1` + `mirrorToSanity` (fail-closed against the wrangler cached-OAuth foot-gun discovered mid-session — see `feedback_wrangler_oauth_test_footgun.md`). 4 atomic tests against better-sqlite3-backed fake D1: happy path, ON CONFLICT existing-user, Sanity-mirror-failure cascade, unexpected-action zero-write. 1782 tests pass. Follow-up `7e3rd74y` files the main()-level dry-run integration test.
- 🟡 Post-deploy real-browser QA of email preview iframes against deployed Studio (after `pnpm studio:deploy`).
- 🟡 Open `release/v1.2.1` → `main` PR with `sentry-skills:pr-writer` (final step before apex unpark planning).
- 🟡 `kf1nixad` — parent epic remains open until `h1zu9nkr` (image rendering polish) closes; not gating release.
- 🟡 `td3f86z6` — Seed notFoundPage + underConstructionPage in both datasets. Not release-blocking (consumers fall back silently).
- 🟡 `7e3rd74y` — main()-level dry-run integration test (substituted assertion in bce8b5c covered the equivalent zero-write path).

**Open PRs on release/v1.2.1:** none.

**Memories captured 2026-05-25 (binding for next sessions):**
- `feedback_canonical_vendor_types` — Use canonical vendor types over hand-rolled fuzzy unions. No `any`/`unknown`/permissive-union workarounds to pass typecheck. The `EmailRichText` collapse + `SanityEmailMagicLink.body` fix close the loop on this rule's first surface.
- `feedback_never_local_deploy_cross_env` — NEVER `wrangler deploy --env <target>` from a local checkout whose `.env.local` doesn't match. Next DefinePlugin bakes `NEXT_PUBLIC_*` as string literals at build, overriding wrangler runtime vars. Use CI deploy via git push. If you must local-deploy, run the 4-step pre-flight (inspect .env.local, set to target values, grep bundled output, restore after).
- `reference_staging_cf_access` — `staging.withjosephine.com` HTTP is behind CF Access; `wrangler tail` + d1 admin + Sanity API all bypass cleanly. Diagnostic-by-tool matrix in the memory.
- `feedback_brief_agents_on_staging_cf_access` — Include the CF Access constraint up front in any agent prompt that touches "diagnose staging" so they don't burn 20min on tail-via-curl loops. Trust negative results from subagents that contradict the orchestrator's hypothesis — reframe, don't bias.
- `feedback_dex_create_verify_with_show` — After every `dex create`, immediately `dex show <id>` to confirm persistence. `Updated:` without `Created:` means silent no-op.
- `feedback_chromium_iframe_srcdoc_no_renavigate` (carry-over) — Sandboxed iframes need React `key` to force remount when srcdoc toggles empty→populated.
- `feedback_real_browser_smoke_before_ship_claim` (carry-over) — REQUIRED for UI-touching PRs. vitest jsdom is not sufficient. **PR #188's workerd bug was a textbook recurrence** — jsdom passed, workerd 500'd; this rule didn't get applied to PR #188 and cost ~3hrs of session time today.

## 🚨 TOP OF MIND — 2026-05-24 release/v1.2.0 → main shipped

**`release/v1.2.0` merged to `main` via PR #178 (merge commit `82755fd`).** Hold-gate item #4 closed. Production now carries the full v1.1.x + v1.2.x payload. Apex stays parked; Stripe stays test mode (deferred per Max).

**Operational changes applied to production this session (2026-05-24):**
- D1 migrations 0004→0012 applied (`pnpm migrate:apply:prod`). Pre-state: 0001-0003 applied. Post-state: zero pending. `submissions` row count 0→0. Hold-gate item #7 closed.
- 27 Sanity migrations re-run idempotently against prod dataset: 8 mutated (additive `setIfMissing` closing staging→prod drift), 19 noop, 0 failed. Log at `docs/prod-migration-run-2026-05-24.log`.
- 10 customer email/page singletons seeded to prod dataset via `seed-customer-emails-and-pages.mts production` (`createIfNotExists`; GROQ-verified 10/10): `listenPage`, `myReadingsPage`, `myGiftsPage`, `magicLinkVerifyPage`, `emailOrderConfirmation`, `emailDay7Delivery`, `emailMagicLink`, `emailGiftPurchaseConfirmation`, `emailRecipientIntakeReceived`, `emailPrivacyExport`.
- Sanity Studio deployed to https://withjosephine.sanity.studio/ via `pnpm run deploy` from `studio/`. 2/2 schemas deployed. Picks up PR #174 customer-email schemas, PR #175 desk restructure, PR #176 Day 2 removal, PR #177 token catalog.

**Mid-session discovery (hotfix PR #179, `1c9f5d3`):** `e2e.yml` triggers only on PRs to `main`, so sub-PRs landing on `release/v1.2.0` never exercised the booking-photo-upload spec (added in #154). PR #178 fired it for the first time and the route 500'd on missing `R2_*` env vars. Surgical fix: 4 dummy `e2e-dummy-*` envs added to the Playwright job env block (matches the existing Stripe / Sanity dummy pattern). Failure pattern matches `feedback_validate_active_branches.md` from memory exactly. After #179 squash-merged to release/v1.2.0, PR #178's e2e re-fired green (Playwright 4m4s).

**⚠️ Security flag:** ran `sanity debug --secrets` from `studio/` during pre-flight; the Sanity user auth token was printed in stdout (now in session transcript). **Rotate the Sanity personal token** via https://www.sanity.io/manage → Account → Tokens at convenience.

**U2/U6 investigation is largely closed. Sub-PR D (data repair) is the only piece left.** Full re-framing in `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md` § Investigation update (iteration 2).

**What's changed since 2026-05-23 open:**
- Sub-PR A (forensic UA-hash audit) shipped — PR #169 `364ea77` + qs CVE hotfix `17da7b9`.
- Sub-PR C (lock + 422 gate + NFKC) — turned out to be already shipped via PR #144 `636216b` on release/v1.1.0 (2026-05-19). Originally-scoped work was a no-op. Re-scoped to diagnostic logging in PR #170 `fe51819`.
- Resend hardening cluster shipped today (separate Resend quota leak discovered mid-investigation): PR #171 `bf446ad` (fail-closed on header+missing-secret), PR #172 `3b27bee` (sandbox-prefix dry-run guard for cron/DO/webhook paths), PR #173 `adc6c01` (`/simplify` cleanup pass after Max flagged binding-rule violation).
- Variant A/C/D field walks on staging confirmed: **auth flow healthy, no magic-link loop, lock works against autofill AND DevTools-strip attacks**. React controlled-input state holds prefilled value even when DOM is mutated. CF Workers Logs export confirmed `submittedEmailHash === storedRecipientEmailHash` even after DevTools removed `readonly`.
- `bb5fe157` data corruption vector remains **unexplained** — the current lock + 422 gate + React behavior cover every attack vector we could construct. PR #170 instrumentation now logs every gate decision in production-shape so the next occurrence self-identifies.

**Sub-PR D status:** decision deferred. Scope is `scripts/repair-recipient-user-id.mts` per PRD Phase F — dry-run CSV → `--apply` repairs `bb5fe157` (and any other historical corrupted rows) by re-pointing `recipient_user_id` from `5a72100c` (purchaser) → `1a87c68d` (recipient mgertzen2), mirrors to Sanity, writes audit row.

**Sub-PR B (CheckEmailCard polish):** not surfacing in field testing. Deferred — see BACKLOG.

**Re-walk smoke after Sub-PR D apply** is the verification step that closes hold-gate items #10 (U2) and #14 (U6, merged into the same PRD).

**Other launch-blocking items still open** (original hold-gate list):
- Reading-price reconcile (Max+Josephine, operational)
- Pre-prod data cleanup (D1+R2+Sanity)
- Production D1 migrations 0004→0012 (at main-merge time)
- Re-run smoke walkthrough (after Sub-PR D ships)
- Stripe test-mode webhook split (BACKLOG mirror-drift)
- U3 (download filenames), U4 (hover sweep), U5 (gift email prefill), U7 (Studio preview), U8 (Studio claimed-at + countdown) — promoted 2026-05-23

**New BACKLOG items surfaced 2026-05-24:**
- Magic-link email subject + body are reading-centric across ALL destinations (sent from `/my-gifts` gets "Open your reading" copy)
- "I don't know my birth time" intake checkbox z-index covers the time + calendar picker
- Un-gate `UA_AUDIT_HASH_DEPLOYED` in sandbox CI now that release/v1.2.0 has the worker code
- Extract `SANDBOX_EMAIL_PREFIXES` to a shared module to close spec-prefix drift risk

---

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- **`dex list`** (from `www/`) — operational task queue (10 epics, ~50 tasks as of 2026-05-23). Use `dex list --ready` for unblocked work, `dex show <id>` for full context, `dex create "…" --description "…" [--parent <id>]` to file a new deferral. Storage: `www/.dex/tasks.jsonl` (git-tracked).
- `www/docs/BACKLOG.md` — historical reference (pre-2026-05-23 deferral prose for long-tail items). New deferrals go to dex.
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to dex; keep only in-flight + load-bearing-current here.**

---

## Current sprint — v1.2.x launch-readiness e2e epic (release/v1.2.0)

**Active branch:** `release/v1.2.0` — cut from `release/v1.1.0@882752d` on 2026-05-20. CI workflow updated (`ci.yml` push branches + deploy-staging trigger) to reference `release/v1.2.0`.
**Most-recent merge:** PR #168 (`f2fb367`) — X-E2E-Resend-DryRun helper wiring. **8 PRs + 1 bookkeeping commit on 2026-05-21** closing the smoke walk + the resulting Resend-quota crisis: #160 (β schema drift), #161 (δ recipientNameFor fallback), #162 (α notifyPaid guard), #164 (hotfix δ regression), #163 (γ silent-400 instrumentation), #165 (ε gift-recipient-listen e2e), `e45d4fc` (narration-comment sweep + cleaned v120 spec; PR #166 closed as superseded), #167 (Resend dry-run worker scaffold), #168 (Resend dry-run helper wiring + GH Actions secret). Staging deployed and verified at every step. **Hold-gate item #6 (smoke walkthrough) closed via fix arc.** **Resend quota is no longer an e2e bottleneck** — sandbox runs now cost zero Resend with `X-E2E-Resend-DryRun: $RESEND_E2E_DRY_RUN_SECRET` carried by every spec request and honored by the worker. Source PRD: `MEMORY/WORK/20260520-181127_smoke-walk-tdd-fix-and-ship/PRD.md`. Source handoff: `MEMORY/WORK/20260521-smoke-walk/HANDOFF.md`.
**Open PRs:** none on `release/v1.2.0`.
**Main:** `d607ada` (unchanged — release/v1.2.0 → main merge is hold-gate item #4).
**Tags:** `v1.1.0` at `882752d` (release/v1.1.0 HEAD), `v1.2.0` at `94e9d5d` (release/v1.2.0 HEAD).

**v1.1.x is fully shipped on `release/v1.1.0` at `882752d`** (PRs #142 / #143 / #144 / #145 / #146 / #147 / #148 / #149 / #150 / #151 merged 2026-05-19 → 2026-05-20). Phase 3 scheduling rebuild complete. The v1.1.0 → main merge is hold-gate item #4; v1.2.0 lands on top.

**v1.2.x epic queue (PRD: `MEMORY/WORK/20260520-070000_launch-readiness-e2e-epic/PRD.md`)** — 24 ISC across 3 sub-PRs:

| Sub-PR | Scope | Status |
|---|---|---|
| #152 | Turnstile stub + staging cleanup helper + sandbox specs re-enabled + ci.yml release-branch rename | ✅ shipped 2026-05-20 to `release/v1.2.0` (squash `86549e9`); CI run 26147183329 ✅ 3m6s |
| Sub-PR A #153 | Orchestration infra: sandbox-in-CI workflow + prod-smoke job (read-only per D-5) + globalSetup hard-fail + test-route gate allow-list + cleanup-helper generalization + composite action DRY | ✅ shipped 2026-05-20 to `release/v1.2.0` (squash `54d6958`); CI run 26155214119 ✅ 2m54s; 4/4 sandbox specs green against staging |
| Sub-PR B #154 | P0 spec coverage: cross-purchaser leak + cancel-auto-send + regenerate-claim-link + claim-replay + photo-upload (5 specs, +537 LoC) + dry-run resend `html` capture | ✅ shipped 2026-05-20 to `release/v1.2.0` (squash `b6225db`); mock e2e 56/56 in 1.7m |
| Sub-PR C #155 | Cleanup tail: drop MSW + waitForDraftRestore poll + turnstileStub strict id + wrangler whoami preflight + localize x-e2e-reset-token + escape `next` regex + centralize constants + whsec_ guard + CLAUDE.md spec-naming rule + drop vX SSE leftover + rename maxClicks (11 ISCs, +177/-101) | ✅ shipped 2026-05-20 to `release/v1.2.0` (squash `94e9d5d`); mock e2e 56/56 in 1.9m |

**Locked decisions** (epic PRD `## Decisions`):
- **D-1**: Sandbox-in-CI YES (weekday 12:00 UTC + `release/*` PR trigger), prod-smoke YES, test-route gates YES + one-line CI assertion.
- **D-2 DO-NOT**: No dedicated dev environment. Staging is the right target.
- **D-3 deferred**: Privacy export Art. 20 e2e — not P0 per Max. Trigger: regulator inquiry OR first user export.
- **D-4**: Sub-PR sequencing A → B → C (each one session).
- **D-5 (Max-flagged 2026-05-20)**: prod-smoke v1 is READ-ONLY — stop before Stripe redirect; assert paymentUrl shape only. Reason: prod Sanity carries LIVE buy.stripe.com URLs after apex-unpark; test card 4242 fails on live; live charge from CI = catastrophic. Full webhook + delivery loop stays on the nightly sandbox tier against staging.

**Next-session resume:** smoke-walk fix arc shipped + hold-gate item #6 closed. **Hold-gate widened 2026-05-23: Max promoted U2-U8 (7 UX items) from BACKLOG to launch-blocking** — see items #10-16 above. Remaining before apex unpark: (a) reading-price reconcile with Josephine — needs her input; (b) **pre-prod data cleanup** — wipe staging test residue from D1 + R2 + Sanity per `docs/BACKLOG.md`; (c) **prod D1 migrations 0004→0012** — `pnpm migrate:apply:prod`; (d) **re-run smoke walkthrough** to confirm the 5 fixes hold on staging (especially J4d auth round + J3+J4 thank-you names); (e) merge `release/v1.2.0` → `main`; **(f) ship U2 (loop bug, P0) → U3/U5 quick-wins → U6 decision+apply → U4 sweep → U7+U8 Studio bundle.** PR-then-squash convention from `feedback_sub_pr_via_feature_branch.md` is the durable workflow for any new sub-PR on the release branch.

**Process learning captured 2026-05-21** (`feedback_check_release_branch_ci_after_every_merge.md`): the PR-level Playwright sandbox check is NOT the full CI gate. `pnpm test` (vitest in CI) + `deploy-staging` only fire on the post-merge `release/v1.2.0` push. Sub-PRs δ + α both shipped with green PR-sandbox + green local vitest but failed CI on `test`, blocking deploy-staging for ~9 hours until Max called it out and hotfix #164 landed. Watch `gh run list --branch release/v1.2.0 --commit <sha>` after every squash-merge.

## Hold-gate (apex unpark + Stripe live-mode)

Apex unpark + Stripe live-mode flip is blocked on:

1. ✅ F-10 Resend domain DKIM/SPF/DMARC — verified 2026-05-20 via `dig` (SPF on `send.`, DKIM `resend._domainkey`, MX `send.→feedback-smtp.us-east-1.amazonses.com`, DMARC via Cloudflare DMARC Management). us-east-1 region noted as non-issue since CLAUDE.md plan has customer-facing emails migrating to Brevo (EU); Resend stays for admin templates only.
2. Reading-price reconcile (Max + Josephine — pick canonical price per reading; sync Sanity `price` + `priceDisplay` + Stripe Payment Links)
3. Sub-PR #4a bake — **substitute via sandbox specs now CI-scheduled** (PR #152 enabled the specs, PR #153 put them in CI). Nightly cron weekdays 12:00 UTC against `staging.withjosephine.com` + on every `release/*` PR touching round-trip-adjacent paths. 4 sandbox specs (listen + stripe + gift roundtrip) green in 2.9 min. Becky's first real reading remains the human-UX bake but is no longer the only signal.
4. ✅ **release/v1.2.0 merged to main** — closed 2026-05-24 via PR #178 (merge commit `82755fd`). 81 commits / 274 files. Hotfix PR #179 (`1c9f5d3`) added dummy R2_* envs to e2e.yml to unblock booking-photo-upload spec on first PR-CI exposure.
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. **Smoke walkthrough using `docs/MANUAL_SMOKE_TEST.md`** — comprehensive rewrite shipped 2026-05-20 in PR #159. Covers J1 self-purchase (incl. Becky delivery + listen), J2 gift self-send, J3 gift recipient (incl. Becky delivery + listen), J4 scheduled gift, J5 /my-gifts (incl. send-now + cancel-scheduled + Studio editability proof), J7 privacy export, J8 contact, J9 Sanity Live, J10 mobile, J11 admin email checklist.
7. ✅ **Production D1 migrations 0004 → 0012 applied** — closed 2026-05-24. `pnpm migrate:apply:prod` against remote D1 `176fe9a9-efcc-41e0-a409-20db90d09ea7`. All 9 migrations applied successfully; `submissions` count unchanged (0→0). dex `3ly4soj5` closed.
8. ✅ Sanity copy seed for D-11 cancel-scheduled — closed 2026-05-20 via PR #158 (seed script extension) + PR #157 (migration runner). 4 cancel-scheduled copy fields applied to production myGiftsPage singleton. Also surfaced + fixed: 9 customer singletons were missing entirely on production (now seeded). All 27 historical Sanity migrations now confirmed applied on production. Studio deployed.
9. **Launch-readiness e2e epic — COMPLETE.** 24 of 24 ISC shipped (Sub-PR A #153 + Sub-PR B #154 + Sub-PR C #155). Tagged `v1.2.0` at `94e9d5d`. PRD `MEMORY/WORK/20260520-070000_launch-readiness-e2e-epic/PRD.md` phase: complete. Privacy export Art. 20 e2e deliberately deferred. No remaining e2e blockers for apex unpark.
10. **U2 + U6 — listen-page auth loop + recipient-email lock policy** (root-caused + PRD'd 2026-05-23). Originally filed as two separate items; investigation showed they share a single root cause. The listen-page loop is data-integrity downstream of U6: `gift-redeem/route.ts:260` writes `recipient_user_id` from `getOrCreateUser({email: submittedEmail})` with no integrity check that `submittedEmail` matches `submission.recipient_email`. On the unlocked gift-claim variant (Birth Chart self-send), Gmail autofill of `maxgertzen+...` aliases populated the purchaser's email at intake, so `recipient_user_id` got bound to the purchaser. Cross-user gate at `src/app/listen/[id]/page.tsx:69` then rejects every real-recipient login. Evidence: D1 submission `bb5fe157` shows 5 link_issued + 4 link_redeemed + 4 active sessions, zero successful DeliveredSurface renders. Fix in PRD `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md` — 4 sub-PRs (lock+422 gate, forensic UA-hash, CheckEmailCard resend fix, data-repair script). Backlog refs L37-41 (U2) + L61-65 (U6).
11. **U3 — listen-page download filenames** (promoted 2026-05-23). Voice-note + PDF arrive with Sanity asset hashes; need readable filenames via `Content-Disposition` or asset-name pass-through. Backlog ref L43-47.
12. **U4 — hover affordance audit** (promoted 2026-05-23). Buttons missing `cursor: pointer`; design-system sweep across Button + anchor-styled-as-button + form-control wrappers. Backlog ref L49-53.
13. **U5 — gift purchase: prefill purchaser email** (promoted 2026-05-23). Self-purchase entry prefills, gift entry doesn't. Parity fix. Backlog ref L55-59.
14. **U6 — MERGED INTO #10.** Investigation 2026-05-23 showed U2 and U6 share a single root cause; bundled in `MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md`. Per locked decision D-2 in that PRD: lock policy is `recipient_email` read-only on gift-claim intake, value-bound to `submission.recipient_email`, with the `RecipientEmailEscapeHatch → /contact` callout pattern from PR #144.
15. **U7 — Studio preview of customer-facing pages** (promoted 2026-05-23). Becky can't preview booking / thank-you / listen / `/my-gifts` from inside Studio. Presentation-tool extension OR Studio plugin. Backlog ref L67-71.
16. **U8 — Studio: claimed-at + delivery countdown + claimed-vs-paid status** (promoted 2026-05-23). `giftClaimedAt` is in schema but not in deskStructure list/preview. Possibly adds a new submission status enum. Backlog ref L73-77.

## Paused workstream — Phase 7 PR-A1 (email Sanity CMS)

Branch `feat/phase-7-email-sanity-cms` exists locally with WIP commit `f6568e9` on top of main `d607ada` (27 files, +972/-23). Code complete, quality gates clean (lint, typecheck, vitest 1472, build). NOT done: seed migration never run, Pentester audit not run, Studio iframe not smoke-tested, never pushed, no PR opened. Pause is fully reversible (`git branch -D feat/phase-7-email-sanity-cms`). Resume instructions live in `www/MEMORY/WORK/20260517-220000_phase-7-email-sanity-cms/PRD.md` § Resume Instructions.

## Outstanding Max-actions (operational, no code)

1. **Reading-price reconcile** — pick canonical price per reading; update Sanity (`price` cents + `priceDisplay`) and each Stripe Payment Link via dashboard. Stripe Prices are immutable: create-new-Price → new-Payment-Link → swap URL on the reading doc → archive old.
2. ✅ **F-10 Verify Resend domain** — closed 2026-05-20. SPF + DKIM + MX + DMARC verified via `dig`.
3. **Brevo Phase 1 newsletter — parallel-safe**, deferred post-launch per Brevo (vetting ticket #5354963 with Frosina). Site launches first; reply to ticket with live URL + sample newsletter; Brevo completes Section E (astrology) review; ship newsletter. If drags >2 weeks or rejects, swap to Beehiiv (~30 min code). Not launch-blocking.
4. **Apex unpark + Stripe live-mode flip** — see `www/docs/BACKLOG.md` → "Apex unpark — Stripe live-mode flip target". Blocked on #1 + smoke walk-through + D1 migration apply + Phase 7 (paused).
5. **Pre-prod data cleanup** — main-merge blocker. Per-table SQL + R2 CLI + Studio delete steps in `www/docs/BACKLOG.md`.
6. ✅ **Manual Stripe round-trip** — closed 2026-05-20 via prior-session evidence (multiple round-trips on staging documented in inbox + audit-trail).
7. ✅ **AI-bot accessibility policy** — shipped 2026-05-20 via PR #156, deployed via release/v1.2.0 sync.
8. **Outstanding Clarity Max-actions** — provision tracking ID, set masking to Strict, hide Smart Events, add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH Variables. Checklist in BACKLOG.
9. **Rotate `DO_DISPATCH_SECRET` on staging** — exposed mid-diagnostic 2026-05-18. Command: `openssl rand -hex 32 | pnpm exec wrangler secret put DO_DISPATCH_SECRET --env staging`. After rotation, do not re-paste in chat.
10. ✅ **Apply migration 0012 to production D1** — closed 2026-05-24 (batch 0004 → 0012 applied at PR #178 merge time).
11. **Run the smoke walkthrough** — use the rewritten `docs/MANUAL_SMOKE_TEST.md` (PR #159). 11 journeys, ~60–90 min to run end-to-end. Send pass/fail per journey + screenshots for any ❌ + the time window so the maintainer can scope the cleanup script.
12. **Set `RESEND_E2E_DRY_RUN_SECRET` on the staging worker** (optional but recommended for hygiene — the sandbox-prefix guard from PR #172 already plugs the leak, so this is no longer load-bearing). Run: `openssl rand -hex 32 | pnpm exec wrangler secret put RESEND_E2E_DRY_RUN_SECRET --env staging`, then paste the same value into Settings → Secrets and variables → Actions → Environments → staging → `STAGING_RESEND_E2E_DRY_RUN_SECRET`. Both must be identical.
13. **Cleanup staging test rows** — submission `67b20b5e-5d91-4dd9-9530-f902f7b3d827` was used for Variant A/D walks today (recipient mgertzen2@gmail.com, purchaser maxgertzen+variantA-purchaser). D1 was patched with bb5fe157's voice/pdf URLs for DeliveredSurface verification. Sweep with the prefix-based one-liner I shared earlier (PREFIX="maxgertzen+variant"). Same for any `+variantC-` rows.

## Parallel-safe non-blockers (ship anytime)

- **Node 22 → 24 upgrade** — pinned in `.github/actions/setup/action.yml:13` + `.github/workflows/e2e.yml:80` + wrangler compat_date. Target before 2026-10-21 (Node 22 maintenance).
- **Brevo Phase 1 newsletter** (above).
- **Three /simplify-deferred refactors from PR #86** — defaults-merge convention across Hero/HowItWorks/Footer/Navigation; Resend `EmailSendResult` discriminated union; `scripts/_lib/sanity-write-client.mts` helper extraction.
- **Brevo Phases 2–4 — transactional migration** (lowest-stakes first). After F-10 + Phase 1 has runtime.
- **Worker-bundle sourcemap upload to Sentry** — blocked upstream on sentry-javascript#19213.
- **Re-evaluate `@sentry/nextjs`** when sentry-javascript#18842 resolves.
- **Bundle-size narrowing of `outputFileTracingExcludes`** — deferred from PR #44.

## After-backlog action — in-depth retrospective

Locked 2026-05-06. Once `www/docs/BACKLOG.md` is empty (shipped or closed-as-won't-do), the next session's work is a revised in-depth retrospective covering PRs #29 → last-shipped. Target file: `docs/PROJECT_RETROSPECTIVE_v2.md`. Themes already seeded in `MEMORY/project_post_backlog_retrospective.md`. Do NOT start the retro until backlog is empty.

## PRD index — active or recent

- `20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md` — **active** (phase: plan). U2 + U6 root-caused as one bug. 4 sub-PRs (lock+422 gate, UA-hash forensic, CheckEmailCard resend fix, data-repair). Blocks apex unpark.
- `20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md` — Phase 3 scheduling rebuild. PR-A + PR-B + PR-C-i shipped 2026-05-19 (38/104 ISC complete; D-10/D-11/P-6 + remaining tests deferred to PR-C-ii / PR-D / PR-E)
- `20260518-handoff-session-end/HANDOFF.md` — handoff from the previous session that kicked Phase 3 off
- `20260518-112650_v1.1.1-implementation/PRD.md` — v1.1.1 implementation (complete except Max-action migrations)
- `20260515-200000_intake-architecture-repair/PRD.md` — Phases 0–4 shipped; Phase 5 absorbed into v1.1.0/v1.1.1 cycle
- `20260517-220000_phase-7-email-sanity-cms/PRD.md` — PAUSED mid-EXECUTE
- `20260509-181221_emailcrm-stack-rediscussion/PRD.md` — Brevo decision rationale (complete)
