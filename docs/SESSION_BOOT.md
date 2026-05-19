# Session Boot — Active State

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- `www/docs/BACKLOG.md` — deferred items with explicit triggers (the queue)
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to BACKLOG; keep only in-flight + load-bearing-current here.**

---

## Current sprint — v1.1.x Phase 3 scheduling rebuild (release/v1.1.0)

**Active branch:** none (last sub-PR merged 2026-05-19).
**Open PRs:** none.
**Main:** `d607ada` (unchanged this sprint cycle).
**Release branch:** `release/v1.1.0` at `9dbdd86` after PRs #142 / #143 / #144 / #145 / #146 / #147 merged 2026-05-19.

**Phase 3 sub-PR stack** (5-stacked-sub-PR strategy locked 2026-05-19 — see prior HANDOFF):

| Sub-PR | Scope | Status |
|---|---|---|
| PR-A (#142 + #143 hotfix) | D-8 status pill + D-9 datepicker TZ hardening | ✅ shipped + staging |
| PR-B (#144) | D-12 recipient-email pre-fill + P-4b wholesale-non-refundable refund-policy rewrite | ✅ shipped + staging + Sanity migrations applied to staging AND production datasets |
| PR-C-i (#145) | D1 migration 0012 (5 audit columns + UNIQUE partial idx, prepares schema for D-10 + D-11) | ✅ shipped + staging D1 applied + schema verified |
| PR-C-ii (#147) | D-10 send-now route + `SendNowControl` + idempotency-key + dispatcher defense + unit tests + e2e | ✅ shipped 2026-05-19 + staging (CI 26108537934 green) |
| **PR-D** | D-11 cancel-scheduled route + UI | **next** |
| PR-E | P-6 motion preference + final tests + `/simplify` | not started |

**PR-D scope** (resume from PRD § D-11 + § P-4 in `MEMORY/WORK/20260518-153700_scheduling-scrutiny-and-claudemd-reorg/PRD.md`): new POST `/api/gifts/[id]/cancel-scheduled` — auth → preflight 409s → cancelGiftAlarm FIRST (cheap, idempotent) → WHERE-guarded UPDATE setting `gift_cancelled_at` / `gift_cancelled_by` / `gift_cancelled_reason='purchaser-request'` with guard `gift_cancelled_at IS NULL AND gift_claim_email_fired_at IS NULL`; rowcount 0 → 409 with copy "Too late — your gift has already been sent. Contact hello@withjosephine.com." New `CancelScheduledControl` reusing 5s confirm-armed pattern; j-rose (#BF9B8B) armed-state tint (Quiet Archivist forbids alarm-red). Copy locked under wholesale-no-refunds policy: "Cancel this gift" → armed "Tap again to confirm — your reading will not be sent. This purchase is non-refundable." After cancel, card renders muted with `cancelled` pill (D-8 — already shipped). **Un-cancel:** terminal on customer surface; ops-side reversal is D1-console-only until a Sanity-webhook→Worker→D1 path exists (not built). **Audit columns already exist:** `gift_cancelled_at` from migration 0007, `gift_cancelled_by` + `gift_cancelled_reason` from migration 0012 (PR-C-i). **Schema in place** — no D1 migration in PR-D. **Refund policy locked NO REFUNDS** wholesale per P-4 (Max directive 2026-05-19) — UI copy must never imply refund. Branch off updated `release/v1.1.0` at `9dbdd86`.

## Hold-gate (apex unpark + Stripe live-mode)

Apex unpark + Stripe live-mode flip is blocked on:

1. F-10 Resend domain DKIM/SPF/DMARC verified
2. Reading-price reconcile (Max + Josephine — pick canonical price per reading; sync Sanity `price` + `priceDisplay` + Stripe Payment Links)
3. Sub-PR #4a 1-week bake completes (Becky's first real reading delivered)
4. **release/v1.1.0 merged to main** — ships everything from intake-architecture-repair Phases 0–4, Phase 5 Gifting, master plan Phases 1–4, Phase 3 scheduling rebuild
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. Stage B + C smoke tests pass (booking E2E + magic-link + Art. 20 export + cascade + Stripe round-trip)
7. **Production D1 migrations 0004 → 0012 applied** — staging is at 0012, production stuck at 0003. Will crash on first gift-aware code path otherwise. **Apply at main-merge time, in order.** Migration 0012 (Phase 3 PR-C-i) adds 5 columns + UNIQUE partial idx; widens the gap from 0003 → 0012 by 9 migrations. Filed 2026-05-18, updated 2026-05-19.

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
