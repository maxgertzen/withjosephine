# Session Boot — Active State

## 🚨 TOP OF MIND — read before anything else (2026-05-23 close-out)

The single most-active thread right now is **U2 + U6 root-cause + remediation PRD** at
`MEMORY/WORK/20260523-210824_u2-u6-recipient-email-lock-and-listen-loop/PRD.md`.

**Don't open this session by giving Max a hold-gate checklist.** Apex unpark has 16 hold-gate items but the load-bearing ones are not the operational ones (D1 migrations, data cleanup, Stripe webhook split). The load-bearing ones are **U2-U8 — 7 UX items promoted from BACKLOG-deferred to launch-blocking on 2026-05-23**. Max explicitly flagged them as "cannot launch without". The previous session opener (this one) buried them; do not repeat that mistake. If asked "where we at?", lead with U2-U8 and the data-integrity finding, then the operational items.

**Confirmed live bugs on staging D1 (not hypothetical):**
- Submission `bb5fe157-a376-435d-ade7-978c4da6af41` has `recipient_user_id` bound to the purchaser, not the recipient. Cascades into:
  - listen-page rejects the actual recipient (SignInCard loop)
  - Day-7 delivery email lands at the purchaser's address, not the recipient's (Max verified 2026-05-23)
  - `/my-readings` listing, GDPR Art. 17 cascade all misroute via the corrupted column
- Root cause: `gift-redeem/route.ts:260` has no integrity check; gift-claim intake on at least one reading variant doesn't lock the recipient_email field.

**4 sub-PRs queued in the PRD** (sequencing fixed in PRD Phase ordering):
1. ~~Sub-PR A (forensic, 1-line): UA-hash on `link_issued` audit~~ ✅ shipped 2026-05-24 to `release/v1.2.0` (PR #169, squash `364ea77`; plus qs CVE hotfix `17da7b9`)
2. Sub-PR B (UX): CheckEmailCard "Send another" preserves typed email + cooldown
3. Sub-PR C (MAIN FIX): readOnly recipient_email + server 422 gate + NFC normalize
4. Sub-PR D (data repair): `scripts/repair-recipient-user-id.mts` for staging + prod

**One honesty note in the PRD** (Cascade symptoms section): if Max signed in *as the purchaser* on a corrupted row, the gate at `page.tsx:69` should have matched. The data corruption explains the misrouted email cleanly; it doesn't fully explain the SignInCard loop on its own. The repair is necessary regardless. If ISC-G2 (recipient sees DeliveredSurface after repair) fails, narrow U2 re-opens.

**Other launch-blocking items still open** (the original hold-gate list, items 1-9 + 11 + 12 + 13 + 15 + 16):
- Reading-price reconcile (Max+Josephine, operational)
- Pre-prod data cleanup (D1+R2+Sanity, hard precondition for backups cron)
- Production D1 migrations 0004→0012 (at main-merge time)
- Re-run smoke walkthrough (after Sub-PR C+D ship)
- Stripe test-mode webhook split (BACKLOG mirror-drift, must ship before any prod traffic)
- U3 (download filenames), U4 (hover sweep), U5 (gift email prefill), U7 (Studio preview), U8 (Studio claimed-at + countdown) — also launch-blocking per 2026-05-23 promotion

**Tasks tracker after 2026-05-23 close-out:** task #7 carries the PRD; #8 (Sub-PR A), #9 (Sub-PR B), #10 (Sub-PR D) are the sibling sub-PRs; #1 (U3), #2 (U4), #3 (U5), #5 (U7), #6 (U8) are the other promoted UX items pending their own PRDs.

---

**This file is the entry-point for any new session touching this codebase.** It holds current-sprint state, in-flight PRs, hold-gate blockers, and outstanding Max-actions. Pair it with:

- `CLAUDE.md` (project root) — durable rules + binding constraints (locked decisions, don't relitigate)
- `www/docs/BACKLOG.md` — deferred items with explicit triggers (the queue)
- `www/docs/CHANGELOG.md` — what shipped when (the history)
- `www/MEMORY/WORK/{slug}/PRD.md` — active session PRDs (frontmatter `phase: complete` once done)

Trim this file as state evolves. **Move shipped state to CHANGELOG; move deferred state to BACKLOG; keep only in-flight + load-bearing-current here.**

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
4. **release/v1.2.0 merged to main** — `release/v1.2.0` was cut from `release/v1.1.0@882752d` on 2026-05-20 and carries everything v1.1.x shipped plus PRs #152–#159. Ready for merge to main once items 2 + 5 + 6 + 7 (D1 migration apply) clear.
5. Pre-prod data cleanup (test smoke residue, D1 + R2 + Sanity)
6. **Smoke walkthrough using `docs/MANUAL_SMOKE_TEST.md`** — comprehensive rewrite shipped 2026-05-20 in PR #159. Covers J1 self-purchase (incl. Becky delivery + listen), J2 gift self-send, J3 gift recipient (incl. Becky delivery + listen), J4 scheduled gift, J5 /my-gifts (incl. send-now + cancel-scheduled + Studio editability proof), J7 privacy export, J8 contact, J9 Sanity Live, J10 mobile, J11 admin email checklist.
7. **Production D1 migrations 0004 → 0012 applied** — staging is at 0012, production stuck at 0003. Will crash on first gift-aware code path otherwise. **Apply at main-merge time, in order.** Migration 0012 (Phase 3 PR-C-i) adds 5 columns + UNIQUE partial idx; widens the gap from 0003 → 0012 by 9 migrations.
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
10. **Apply migration 0012 to production D1** — staging is at 0012 (applied + verified 2026-05-19); production still at 0003. Standalone apply is safe when 0004 → 0012 batch runs at main-merge time per the hold-gate workflow. Command: `pnpm migrate:apply:prod`. Verify with `pnpm migrate:list:prod`.
11. **Run the smoke walkthrough** — use the rewritten `docs/MANUAL_SMOKE_TEST.md` (PR #159). 11 journeys, ~60–90 min to run end-to-end. Send pass/fail per journey + screenshots for any ❌ + the time window so the maintainer can scope the cleanup script.

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
