# Session Boot — Active State

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- `www/docs/BACKLOG.md` — deferred items with explicit triggers (the queue)
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to BACKLOG; keep only in-flight + load-bearing-current here.**

---

## Current sprint — v1.1.x hot-fix line (release/v1.1.0)

**Active branch:** `fix/v1.1.1-followup-3a-quick-wins` (against `release/v1.1.0`).
**Open PR:** [#140](https://github.com/maxgertzen/withjosephine/pulls/140) — extended with the alarm-scheduling root-cause fix (commit `217313d`).
**Main:** `d607ada` (unchanged this sprint cycle).
**Release branch:** `release/v1.1.0` at `93ca63d` after PRs #137/#138/#139 merged.

**PR #140 contents (extended 2026-05-18):**
- I-13 — /my-gifts shows recipient name + email
- I-14 — Edit-recipient drawer self-send indicator
- I-15 — Readable scheduled date+time in purchase confirmation email + /my-gifts label
- Silent-failure repair — `scheduleGiftAlarm` failure now 502s (was silent OK)
- **Real alarm fix** — `giftClaimSchedulerClient.ts` uses `getCloudflareContext({ async: true })` (was reading from `globalThis`, undefined in OpenNext route runtime). Three test files migrated to mock the correct binding source. Reproducer test added.

## Scheduling-flow next steps (in this session's PRD)

PRD: `www/MEMORY/WORK/20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md`

After PR #140 lands + deploys to staging:
1. Max does a fresh flip-to-scheduled with sendAt = now+6min from a `+suffix` recipient. With the real fix deployed, the alarm should fire and dispatch hit at the right time.
2. Phase 2 — UX design Council on: per-status pill (I-16), date+time picker swap (I-17), send-now affordance (new), cancel-scheduled (I-18), recipient-email-prefill-and-allow-change (new bug #20).
3. Phase 3 — implementation in a fresh branch off updated `release/v1.1.0` (send-now route + audit column + UI + cancel-scheduled + status pill refactor + datepicker swap + tests + new e2e specs).

## Hold-gate (apex unpark + Stripe live-mode)

Apex unpark + Stripe live-mode flip is blocked on:

1. F-10 Resend domain DKIM/SPF/DMARC verified
2. Reading-price reconcile (Max + Josephine — pick canonical price per reading; sync Sanity `price` + `priceDisplay` + Stripe Payment Links)
3. Sub-PR #4a 1-week bake completes (Becky's first real reading delivered)
4. **release/v1.1.0 merged to main** — ships everything from intake-architecture-repair Phases 0–4, Phase 5 Gifting, master plan Phases 1–4
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. Stage B + C smoke tests pass (booking E2E + magic-link + Art. 20 export + cascade + Stripe round-trip)
7. **Production D1 migrations 0004 → 0011 applied** — staging is at 0011, production stuck at 0003. Will crash on first gift-aware code path otherwise. **Apply at main-merge time, in order.** Filed 2026-05-18.

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

- `20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md` — **THIS SESSION** (in progress)
- `20260518-handoff-session-end/HANDOFF.md` — prior session handoff (this session resumes from it)
- `20260518-112650_v1.1.1-implementation/PRD.md` — v1.1.1 implementation (complete except Max-action migrations)
- `20260515-200000_intake-architecture-repair/PRD.md` — Phases 0–4 shipped; Phase 5 absorbed into v1.1.0/v1.1.1 cycle
- `20260517-220000_phase-7-email-sanity-cms/PRD.md` — PAUSED mid-EXECUTE
- `20260509-181221_emailcrm-stack-rediscussion/PRD.md` — Brevo decision rationale (complete)
