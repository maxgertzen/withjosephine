# Session Boot — Active State

## ✅ RESOLVED 2026-05-25 — v1.2.1 workerd PT render + Sanity-mirror dataset misrouting

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
- 🟡 `k14jh76o` — Post-deploy QATester smoke of email-preview iframes in deployed Studio.
- 🟡 `o1hejeb1` — Day7OverdueAlert visual review (admin-facing — may stay bare).
- 🟡 `jy9fwtf4` — MagicLink visible-URL fallback below button (auth-recovery edge case for clients that strip button styling).
- 🟡 `cxt2ez79` — Extract `<BrandHeader/>` + `<GoldHero/>` + `<EmailFooter/>` JSX shared components (~200 LoC win across 8 templates). JSX-side complement to 9t7143kz's data-side extraction.
- 🟡 `kf1nixad` — Gated-page preview replan, Studio-bundled. Paused at PLAN-approved before BUILD. PRD at `MEMORY/WORK/20260524-172503_gated-page-preview-replan/PRD.md`. Resumes after the Sanity arc closes.
- ⚪ `cpwaqf4d` — Sanity validation harness (optional).
- 🟡 `f7yhvvc3` — Cumulative `/simplify` on `release/v1.2.1...main` diff. Runs before the merge-to-main PR per `feedback_simplify_scale_to_change_size`.
- 🟡 Open `release/v1.2.1` → `main` PR (final step before apex unpark planning).

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
