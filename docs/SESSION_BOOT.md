# Session Boot — Active State

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- `www/docs/BACKLOG.md` — deferred items with explicit triggers (the queue)
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to BACKLOG; keep only in-flight + load-bearing-current here.**

---

## Current sprint — v1.2.x launch-readiness e2e epic (release/v1.2.0)

**Active branch:** `release/v1.2.0` — cut from `release/v1.1.0@882752d` on 2026-05-20. CI workflow updated (`ci.yml` push branches + deploy-staging trigger) to reference `release/v1.2.0`.
**Most-recent merge:** PR #152 (`86549e9`) — re-enabled sandbox specs (listen+stripe+gift roundtrip) with Turnstile stub + staging cleanup helper. 4/4 sandbox specs pass against staging in 1.8 min.
**Open PRs:** none on `release/v1.2.0`.
**Main:** `d607ada` (unchanged).

**v1.1.x is fully shipped on `release/v1.1.0` at `882752d`** (PRs #142 / #143 / #144 / #145 / #146 / #147 / #148 / #149 / #150 / #151 merged 2026-05-19 → 2026-05-20). Phase 3 scheduling rebuild complete. The v1.1.0 → main merge is hold-gate item #4; v1.2.0 lands on top.

**v1.2.x epic queue (PRD: `MEMORY/WORK/20260520-070000_launch-readiness-e2e-epic/PRD.md`)** — 24 ISC across 3 sub-PRs:

| Sub-PR | Scope | Status |
|---|---|---|
| (kicked off this session) #152 | Turnstile stub + staging cleanup helper + sandbox specs re-enabled + ci.yml release-branch rename | ✅ shipped 2026-05-20 to `release/v1.2.0` (squash `86549e9`); CI run 26147183329 ✅ 3m6s |
| Sub-PR A | Orchestration infra: sandbox-in-CI workflow + prod-smoke job (read-only per D-5) + globalSetup hard-fail + test-route gate allow-list + cleanup-helper generalization | 📋 queued, ~7h |
| Sub-PR B | P0 spec coverage: cross-purchaser leak + gift cancel-auto-send/regenerate/replay + photo upload | 📋 queued, ~5.5h |
| Sub-PR C | Cleanup tail: drop MSW dead weight + draft-restore poll + multi-widget Turnstile match + wrangler whoami preflight + et al | 📋 queued, ~2h |

**Locked decisions** (epic PRD `## Decisions`):
- **D-1**: Sandbox-in-CI YES (weekday 12:00 UTC + `release/*` PR trigger), prod-smoke YES, test-route gates YES + one-line CI assertion.
- **D-2 DO-NOT**: No dedicated dev environment. Staging is the right target.
- **D-3 deferred**: Privacy export Art. 20 e2e — not P0 per Max. Trigger: regulator inquiry OR first user export.
- **D-4**: Sub-PR sequencing A → B → C (each one session).
- **D-5 (Max-flagged 2026-05-20)**: prod-smoke v1 is READ-ONLY — stop before Stripe redirect; assert paymentUrl shape only. Reason: prod Sanity carries LIVE buy.stripe.com URLs after apex-unpark; test card 4242 fails on live; live charge from CI = catastrophic. Full webhook + delivery loop stays on the nightly sandbox tier against staging.

**Next-session resume:** start Sub-PR A. Read `MEMORY/WORK/20260520-054500_e2e-orchestration-review/ARCHITECT_AUDIT.md` for full YAML/TS sketches. Full Phase 3 (v1.1.x) sub-PR ledger lives in `docs/CHANGELOG.md`.

## Hold-gate (apex unpark + Stripe live-mode)

Apex unpark + Stripe live-mode flip is blocked on:

1. F-10 Resend domain DKIM/SPF/DMARC verified
2. Reading-price reconcile (Max + Josephine — pick canonical price per reading; sync Sanity `price` + `priceDisplay` + Stripe Payment Links)
3. Sub-PR #4a bake — **substitute via sandbox specs** (shipped PR #152). Run before main-merge: `E2E_SANDBOX=1 source .env.staging && pnpm exec playwright test`. 4 sandbox specs (listen + stripe + gift roundtrip) pass against staging in 1.8 min. Will become CI-scheduled (weekday 12:00 UTC) once Sub-PR A of the v1.2.x epic ships. Becky's first real reading remains the human-UX bake but is no longer the only signal.
4. **release/v1.2.0 merged to main** — `release/v1.2.0` was cut from `release/v1.1.0@882752d` on 2026-05-20 and carries everything v1.1.x shipped plus PR #152 (sandbox specs re-enabled). Future v1.2.x sub-PR stack (epic) lands on this branch first. Ready for merge to main once items 1-3 + 5-7 + 8 are clear AND the launch-readiness epic items judged blocking are shipped (per epic PRD).
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. Stage B + C smoke tests pass (booking E2E + magic-link + Art. 20 export + cascade + Stripe round-trip)
7. **Production D1 migrations 0004 → 0012 applied** — staging is at 0012, production stuck at 0003. Will crash on first gift-aware code path otherwise. **Apply at main-merge time, in order.** Migration 0012 (Phase 3 PR-C-i) adds 5 columns + UNIQUE partial idx; widens the gap from 0003 → 0012 by 9 migrations. Filed 2026-05-18, updated 2026-05-19.
8. **Sanity copy seed for D-11 cancel-scheduled** — run `scripts/migrate-my-gifts-cancel-scheduled-copy-2026-05-19.ts` against **staging first**, then **production** dataset. Adds 4 copy fields (`cancelScheduledCtaLabel` / `cancelScheduledConfirmCtaLabel` / `cancelScheduledSendingLabel` / `cancelScheduledSessionExpiredError`). Idempotent (setIfMissing). Filed 2026-05-19 post-#148 merge.
9. **Launch-readiness e2e epic** — multi-reviewer audit 2026-05-20 (QA + Automation + Architect) identified P0 gaps: sandbox specs not in CI (silent rot), no prod-smoke after `deploy-production`, soft-skip antipattern in sandbox specs, plus 5 missing P0 specs. PRD at `MEMORY/WORK/20260520-070000_launch-readiness-e2e-epic/PRD.md`; full architect findings at `MEMORY/WORK/20260520-054500_e2e-orchestration-review/ARCHITECT_AUDIT.md`. Three sub-PRs (~14h total): **Sub-PR A** orchestration infra (sandbox-in-CI workflow + prod-smoke job + globalSetup hard-fail + test-route gate allow-list + cleanup-helper generalization) — blocks apex unpark; **Sub-PR B** P0 spec coverage (cross-purchaser leak, gift cancel-auto-send / regenerate / claim-replay, photo upload); **Sub-PR C** cleanup tail (drop MSW dead weight, draft-restore poll, multi-widget Turnstile match, wrangler whoami preflight, et al). Privacy export Art. 20 e2e deferred per Max decision. Dedicated dev environment explicitly ruled out (Architect DO-NOT).

## Paused workstream — Phase 7 PR-A1 (email Sanity CMS)

Branch `feat/phase-7-email-sanity-cms` exists locally with WIP commit `f6568e9` on top of main `d607ada` (27 files, +972/-23). Code complete, quality gates clean (lint, typecheck, vitest 1472, build). NOT done: seed migration never run, Pentester audit not run, Studio iframe not smoke-tested, never pushed, no PR opened. Pause is fully reversible (`git branch -D feat/phase-7-email-sanity-cms`). Resume instructions live in `www/MEMORY/WORK/20260517-220000_phase-7-email-sanity-cms/PRD.md` § Resume Instructions.

## Outstanding Max-actions (operational, no code)

1. **Reading-price reconcile** — pick canonical price per reading; update Sanity (`price` cents + `priceDisplay`) and each Stripe Payment Link via dashboard. Stripe Prices are immutable: create-new-Price → new-Payment-Link → swap URL on the reading doc → archive old.
2. **F-10 Verify Resend domain** — DKIM/SPF/DMARC published in CF DNS; test send via Resend dashboard before opening the form to traffic. Blocks Brevo Phase 3.
3. **Brevo Phase 1 newsletter — parallel-safe**, deferred post-launch per Brevo (vetting ticket #5354963 with Frosina). Site launches first; reply to ticket with live URL + sample newsletter; Brevo completes Section E (astrology) review; ship newsletter. If drags >2 weeks or rejects, swap to Beehiiv (~30 min code). Not launch-blocking.
4. **Apex unpark + Stripe live-mode flip** — see `www/docs/BACKLOG.md` → "Apex unpark — Stripe live-mode flip target". Blocked on #1 + #2 + smoke walk-through + Phase 7 + the D1 migration apply.
5. **Pre-prod data cleanup** — main-merge blocker. Per-table SQL + R2 CLI + Studio delete steps in `www/docs/BACKLOG.md`.
6. **Manual Stripe round-trip** — sandbox checkout → `/thank-you/[id]` → webhook marks paid. Required before driving real traffic.
7. **AI-bot accessibility policy** — DECISION LOCKED 2026-05-20: allow citation-bots (OAI-SearchBot / PerplexityBot / Claude-SearchBot / Claude-User), block training-bots (GPTBot / ClaudeBot / Google-Extended / CCBot). Code change pending in `chore/robots-and-housekeeping` (new `src/app/robots.ts`).
8. **Outstanding Clarity Max-actions** — provision tracking ID, set masking to Strict, hide Smart Events, add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH Variables. Checklist in BACKLOG.
9. **Rotate `DO_DISPATCH_SECRET` on staging** — exposed mid-diagnostic 2026-05-18. Command: `openssl rand -hex 32 | pnpm exec wrangler secret put DO_DISPATCH_SECRET --env staging`. After rotation, do not re-paste in chat.
10. **Apply migration 0012 to production D1** — staging is at 0012 (applied + verified 2026-05-19); production still at 0003. Standalone apply is safe when 0004 → 0012 batch runs at main-merge time per the hold-gate workflow. Command: `pnpm migrate:apply:prod`. Verify with `pnpm migrate:list:prod`.

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
