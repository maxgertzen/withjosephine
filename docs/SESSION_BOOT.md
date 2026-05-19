# Session Boot — Active State

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- `www/docs/BACKLOG.md` — deferred items with explicit triggers (the queue)
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to BACKLOG; keep only in-flight + load-bearing-current here.**

---

## Current sprint — v1.1.x Phase 3 scheduling rebuild (release/v1.1.0)

**Active branch:** none — bundle PR #148 merged 2026-05-19.
**Open PRs:** none.
**Main:** `d607ada` (unchanged this sprint cycle).
**Release branch:** `release/v1.1.0` at `4bff524` after PRs #142 / #143 / #144 / #145 / #146 / #147 / #148 merged 2026-05-19.

**Phase 3 sub-PR stack — PR-Lift + D-11 shipped; scope 3 polish remains:**

| Sub-PR | Scope | Status |
|---|---|---|
| PR-A (#142 + #143 hotfix) | D-8 status pill + D-9 datepicker TZ hardening | ✅ shipped + staging |
| PR-B (#144) | D-12 recipient-email pre-fill + P-4b wholesale-non-refundable refund-policy rewrite | ✅ shipped + staging + Sanity migrations applied to staging AND production datasets |
| PR-C-i (#145) | D1 migration 0012 (5 audit columns + UNIQUE partial idx, prepares schema for D-10 + D-11) | ✅ shipped + staging D1 applied + schema verified |
| PR-C-ii (#147) | D-10 send-now route + `SendNowControl` + idempotency-key + dispatcher defense + unit tests + e2e | ✅ shipped 2026-05-19 + staging (CI 26108537934 green) |
| PR-Bundle (#148) | PR-Lift helpers (signInViaMagicLink + interceptStripeCheckout) + D-11 cancel-scheduled route+UI+e2e + /simplify ×2 + Playwright TZ pin | ✅ shipped 2026-05-19 to `release/v1.1.0` (squash `4bff524`); CI + e2e both green via workflow_dispatch |
| **Scope 3 (next)** | P-6 reduced-motion + ConfirmArmedButton extraction + 7-spec interceptStripeCheckout sweep + flip-tz narration strip + giftMutationGate helper + refund-mentions audit + /simplify #3 + ISC tally close-out | **next session — branch off `release/v1.1.0@4bff524`** |

### Next-session agenda — Phase 3 Scope 3 (off `release/v1.1.0@4bff524`)

Branch off updated `release/v1.1.0` after `4bff524` (PR #148 squash). Resume from `MEMORY/WORK/20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md` iteration 5 — `progress: 78/124` at hand-off, all of scope 1 + scope 2 + 2 /simplify passes complete.

**Work surface (all carried from deferred-ISC ledger in the PRD):**

- **P-6 `prefers-reduced-motion` (WCAG 2.2.1 Timing Adjustable).** When the user prefers reduced motion, extend `ARM_RESET_MS` from 5000 → 15000. Lands as a `useReducedMotion` hook reading `window.matchMedia("(prefers-reduced-motion: reduce)")` via `useSyncExternalStore`; consume in each control to pick `ARM_RESET_MS` vs `ARM_RESET_MS_REDUCED_MOTION`. After ConfirmArmedButton extraction lands first, this becomes a one-place change instead of three.
- **`ConfirmArmedButton` extraction (deferred from /simplify #2).** `FlipToSelfSendControl` + `SendNowControl` + `CancelScheduledControl` in `src/app/my-gifts/GiftCardActions.tsx` triplicate the same arm-state + ARM_RESET_MS effect + onConfirm-with-router-refresh skeleton. Extract a `ConfirmArmedButton({ endpoint, labels, errorOverrides, variant? })` that collapses ~120 lines to ~40 and makes the destructive-variant decision an explicit prop. Do this FIRST in the branch so P-6's hook lands in one place.
- **`giftMutationGate(submission, allow)` helper (deferred from /simplify #2).** All 4 gift-mutation routes (`send-now` / `cancel-scheduled` / `cancel-auto-send` / `flip-to-scheduled`) replicate the same preflight-409 ladder in slightly different orders. Extract to `_lib/` returning `null | NextResponse` and apply to all four. Atomic UPDATE remains the real guard; this is for nicer error copy + audit clarity.
- **7-spec migration to `interceptStripeCheckout` (deferred from /simplify #1).** Targets: `tests/e2e/specs/gift-redeem-self-send-local.spec.ts`, `gift-redeem-consent-shape-local.spec.ts`, `gift-redeem-local.spec.ts`, `gift-local.spec.ts` (3 occurrences inside this file), `stripe-local.spec.ts`, `intake-page.spec.ts` (uses `gift: false` path — the only existing non-gift caller). Skip `gift-flow.spec.ts:47` (different shape, judgment call).
- **Strip leftover narration comments in `gift-flip-to-scheduled-tz.spec.ts` (deferred from /simplify #1).** Per `feedback_comments_over_logged.md`. Concrete targets in the PRD verification block.
- **Refund-mentions audit pass #2.** Sweep customer-facing copy for any "refund" language that drifted in during Phase 3. P-4b shipped most of this in PR-B; this is the cleanup tail. Particularly verify: error messages, email templates that didn't change in PR-B, any new copy added in #148.
- **/simplify pass #3** — full Phase 3 diff (everything from PR-A through #148 + this scope 3 branch). Apply findings; defer scope-creep refactors with explicit rationale.
- **ISC tally close-out** — tick remaining ISC in `MEMORY/WORK/20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md` and set `phase: complete` once 124/124 ticked.
- **Optional in same PR:** ISC-18h Playwright iOS/Android device-emulation matrix if it doesn't balloon the diff; otherwise split out.

**Gates before push:** tsc + lint + `pnpm test` (1581+ vitest, modulo the known UTC-timeout flake in `src/app/page.test.ts` / `my-readings/page.test.tsx` / `gift-redeem/route.test.ts` — pass in isolation, flake under full-suite parallelism. Not a regression; pre-existing.) + `pnpm build` + targeted Playwright spec runs.

**Workflow trigger note:** Both `ci.yml` and `e2e.yml` have `pull_request: branches: [main]` — neither auto-fires on PRs targeting `release/v1.1.0`. Use `gh workflow run ci.yml --ref <branch>` and `gh workflow run e2e.yml --ref <branch>` to trigger via `workflow_dispatch` before merging. Confirmed working on #148.

**After scope 3 merges into `release/v1.1.0`, Phase 3 scheduling rebuild is fully shipped.** Hold-gate item 4 (release/v1.1.0 merged to main) is then the gating step to production.

## Hold-gate (apex unpark + Stripe live-mode)

Apex unpark + Stripe live-mode flip is blocked on:

1. F-10 Resend domain DKIM/SPF/DMARC verified
2. Reading-price reconcile (Max + Josephine — pick canonical price per reading; sync Sanity `price` + `priceDisplay` + Stripe Payment Links)
3. Sub-PR #4a 1-week bake completes (Becky's first real reading delivered)
4. **release/v1.1.0 merged to main** — ships everything from intake-architecture-repair Phases 0–4, Phase 5 Gifting, master plan Phases 1–4, Phase 3 scheduling rebuild
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. Stage B + C smoke tests pass (booking E2E + magic-link + Art. 20 export + cascade + Stripe round-trip)
7. **Production D1 migrations 0004 → 0012 applied** — staging is at 0012, production stuck at 0003. Will crash on first gift-aware code path otherwise. **Apply at main-merge time, in order.** Migration 0012 (Phase 3 PR-C-i) adds 5 columns + UNIQUE partial idx; widens the gap from 0003 → 0012 by 9 migrations. Filed 2026-05-18, updated 2026-05-19.
8. **Sanity copy seed for D-11 cancel-scheduled** — run `scripts/migrate-my-gifts-cancel-scheduled-copy-2026-05-19.ts` against **staging first**, then **production** dataset. Adds 4 copy fields (`cancelScheduledCtaLabel` / `cancelScheduledConfirmCtaLabel` / `cancelScheduledSendingLabel` / `cancelScheduledSessionExpiredError`). Idempotent (setIfMissing). Filed 2026-05-19 post-#148 merge.

## Paused workstream — Phase 7 PR-A1 (email Sanity CMS)

Branch `feat/phase-7-email-sanity-cms` exists locally with WIP commit `f6568e9` on top of main `d607ada` (27 files, +972/-23). Code complete, quality gates clean (lint, typecheck, vitest 1472, build). NOT done: seed migration never run, Pentester audit not run, Studio iframe not smoke-tested, never pushed, no PR opened. Pause is fully reversible (`git branch -D feat/phase-7-email-sanity-cms`). Resume instructions live in `www/MEMORY/WORK/20260517-220000_phase-7-email-sanity-cms/PRD.md` § Resume Instructions.

## Outstanding Max-actions (operational, no code)

1. **Reading-price reconcile** — pick canonical price per reading; update Sanity (`price` cents + `priceDisplay`) and each Stripe Payment Link via dashboard. Stripe Prices are immutable: create-new-Price → new-Payment-Link → swap URL on the reading doc → archive old.
2. **F-10 Verify Resend domain** — DKIM/SPF/DMARC published in CF DNS; test send via Resend dashboard before opening the form to traffic. Blocks Brevo Phase 3.
3. **Brevo Phase 1 newsletter — parallel-safe**, deferred post-launch per Brevo (vetting ticket #5354963 with Frosina). Site launches first; reply to ticket with live URL + sample newsletter; Brevo completes Section E (astrology) review; ship newsletter. If drags >2 weeks or rejects, swap to Beehiiv (~30 min code). Not launch-blocking.
4. **Apex unpark + Stripe live-mode flip** — see `www/docs/BACKLOG.md` → "Apex unpark — Stripe live-mode flip target". Blocked on #1 + #2 + smoke walk-through + Phase 7 + the D1 migration apply.
5. **WAF rate-limit rules** on `/api/booking`, `/api/contact`, `/api/booking/upload-url` — CF dashboard → Security → WAF. 10 req/min/IP.
6. **Pre-prod data cleanup** — main-merge blocker. Per-table SQL + R2 CLI + Studio delete steps in `www/docs/BACKLOG.md`.
7. **Manual Stripe round-trip** — sandbox checkout → `/thank-you/[id]` → webhook marks paid. Required before driving real traffic.
8. **AI-bot accessibility policy** — allow Claude-SearchBot / OAI-SearchBot / PerplexityBot? Decision in `www/docs/BACKLOG.md` → Security.
9. **Outstanding Clarity Max-actions** — provision tracking ID, set masking to Strict, hide Smart Events, add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH Variables. Checklist in BACKLOG.
10. **Rotate `DO_DISPATCH_SECRET` on staging** — exposed mid-diagnostic 2026-05-18. Command: `openssl rand -hex 32 | pnpm exec wrangler secret put DO_DISPATCH_SECRET --env staging`. After rotation, do not re-paste in chat.
11. **Apply migration 0012 to production D1** — staging is at 0012 (applied + verified 2026-05-19); production still at 0003. Standalone apply is safe when 0004 → 0012 batch runs at main-merge time per the hold-gate workflow. Command: `pnpm migrate:apply:prod`. Verify with `pnpm migrate:list:prod`.

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

- `20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md` — Phase 3 scheduling rebuild. PR-A + PR-B + PR-C-i shipped 2026-05-19 (38/104 ISC complete; D-10/D-11/P-6 + remaining tests deferred to PR-C-ii / PR-D / PR-E)
- `20260518-handoff-session-end/HANDOFF.md` — handoff from the previous session that kicked Phase 3 off
- `20260518-112650_v1.1.1-implementation/PRD.md` — v1.1.1 implementation (complete except Max-action migrations)
- `20260515-200000_intake-architecture-repair/PRD.md` — Phases 0–4 shipped; Phase 5 absorbed into v1.1.0/v1.1.1 cycle
- `20260517-220000_phase-7-email-sanity-cms/PRD.md` — PAUSED mid-EXECUTE
- `20260509-181221_emailcrm-stack-rediscussion/PRD.md` — Brevo decision rationale (complete)
