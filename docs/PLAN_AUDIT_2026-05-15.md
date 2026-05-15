# Plan Audit — Josephine Soul Readings — 2026-05-15

## Executive Summary

The new PRD at `www/MEMORY/WORK/20260515-200000_intake-architecture-repair/PRD.md` is structurally sound and follows the project's standing memory rules (vendor-citation frontmatter, completionist phasing, no deferrals across phases, /simplify per phase). Two **HIGH** findings need addressing before Phase 0 opens: a zombie-schema-fields hit (the deprecated Sanity `consent` field type is still listed as a selectable option in `formField.ts:68` after D-3 deprecates it) and a council-evidence-requirement gap (the 3-vantage council ran on opinion not evidence). Three **MEDIUM** findings cover cross-boundary predicate fragmentation, vendor-verification proof gap, and a sub-deferral inside Phase 4 that should be resolved pre-PRD.

Project plan surface is healthy overall — backlog has explicit production-signal triggers, doc inventory is current, PRD cadence sustained without lost work. Two root-level docs (`AGENTS.md`, `CLAUDE_AI_PROJECT_INSTRUCTIONS.md`) are stale >10 days and `JOSEPHINE_MANUAL_ACTIONS.md` is orphaned from any Layer-1 reference; non-blocking but flagged.

**Health verdict: Yellow.** Dominant reason: zombie type definition in Sanity schema that the new PRD doesn't fully close; otherwise green.

**Top 3 actions:**
1. **[HIGH]** Add P1.X to PRD: remove `"consent"` from `studio/schemas/formField.ts:68` enum, OR add Studio validation rule blocking new uses; migrate any existing data.
2. **[HIGH]** PRD section "Open questions" should record the council's evidence gap explicitly OR re-run council with citation discipline before Phase 0 starts.
3. **[MED]** Add a single shared `LegalConsentSnapshot` type + `isFullyConsented()` predicate to be imported by client, server, D1 mirror, and Sanity write — kills cross-boundary fragmentation before it ships.

---

## 0. State Snapshot

(Produced by Explore agent — Layer 1 + Layer 2 sweep, 2026-05-15.)

### 0.1 Architecture
**Stack:** Next.js 16.2.6 + React 19 (App Router), Sanity CMS, Stripe Payment Links, Cloudflare Workers via OpenNext, D1, R2, Resend, Turnstile, Sentry.
**Surface:** Customer site (booking → intake → magic-link reader → gift flow), Sanity Studio multi-workspace, API routes (booking intake, Stripe webhook, crons, sanity-sync webhook, photo upload presigned URL, Art. 20 export, gift claim/dispute).
**Cron jobs:** Day-7 delivery marker, gift claim auto-open, price-drift reconcile, Sanity→D1 mirror, Sanity backup R2 (weekly/monthly lifecycle).
**Integrations:** Sanity, Stripe Payment Links, Resend, Cloudflare (Workers/D1/R2/Email-Routing/Turnstile), Mixpanel, Sentry, Microsoft Clarity (EU Consent v2), future Brevo.

### 0.2 Data flow
Booking submit → `/api/booking` validates via Zod + Turnstile → D1 row + Sanity doc write (atomic in code, separate transactional boundaries). D1 migrations 0001–0009 (latest 2026-05-11 retention ISC-1). Mutations: `/api/booking` (D1 + Sanity), `/api/sanity-sync` (Sanity→D1 mirror), `/api/sanity-backup-webhook`, Resend client `src/lib/resend.ts`. Stripe webhook → session lookup → D1 `paid_at` + Sanity `paidAt` + Mixpanel emit. Day-7 cron → GROQ eligibility → R2 fetch → Resend → D1 `delivered_at`.

### 0.3 Work process
**PRD cadence:** 33 PRDs in `www/MEMORY/WORK/` since 2026-04-14. Latest 5: 20260515-200000_intake-architecture-repair, 20260514-134500_build-planreviewer-skill, 20260514-000000_josephine-retrospective-for-future-planning, 20260513-000000_phase5-session7-perf-refactor-staging, 20260512-143200_phase5-session6-cleanup-and-audits.
**Deferrals:** BACKLOG.md carries 15 major item groups (193 deferral lines), oldest from Phase 3 backup (2026-05-13 with explicit trigger). All deferrals carry production-signal triggers; no vague "later" markers.
**Git activity (14d):** Main HEAD `7941744` (PR #89, 2026-05-09); `release/v1.0.0` cut 2026-05-13, 66 commits post-#89.
**Memory hygiene:** 35 feedback memories on file. 3 most recent: `feedback_wrangler_vars_declarative.md` (2026-05-13), `feedback_static_fallbacks_can_mask_outages.md`, `feedback_no_native_browser_dialogs.md`.

### 0.4 Doc inventory

| Path | mtime | Role | Health |
|---|---|---|---|
| CLAUDE.md | 2026-05-13 | CLAUDE | healthy |
| AGENTS.md | 2026-05-02 | RUNBOOK | stale |
| CLAUDE_AI_PROJECT_INSTRUCTIONS.md | 2026-04-27 | SPEC | stale |
| JOSEPHINE_MANUAL_ACTIONS.md | 2026-04-15 | RUNBOOK | orphan |
| www/docs/ADR-001-persistence.md | 2026-05-13 | SPEC | healthy |
| www/docs/BACKLOG.md | 2026-05-13 | BACKLOG | healthy |
| www/docs/CHANGELOG.md | 2026-05-13 | CHANGELOG | healthy |
| www/docs/DECISIONS.local.md | 2026-05-12 | REVIEW | healthy |
| www/docs/LAUNCH_SMOKE_TEST_PLAN.md | 2026-05-13 | RUNBOOK | healthy |
| www/docs/OPERATIONS.md | 2026-05-13 | RUNBOOK | healthy |
| www/docs/runbooks/CLOUDFLARE_SETUP.md | 2026-05-13 | RUNBOOK | healthy |
| www/docs/runbooks/SANITY_BACKUP_RUNBOOK.md | 2026-05-13 | RUNBOOK | healthy |
| www/docs/runbooks/STAGING_RUNBOOK.md | 2026-05-13 | RUNBOOK | healthy |
| www/MEMORY/WORK/20260515-200000_intake-architecture-repair/PRD.md | 2026-05-15 | PRD | healthy (subject of this audit) |

### 0.5 Health verdict
**Yellow.** Backlog is well-populated (193 lines, 15 categories, explicit triggers) and current; doc inventory is fresh; PRD cadence sustained. Yellow not red because the new PRD has two HIGH and three MEDIUM findings; zombie type definition in Sanity formField.ts is the dominant pull. Stale root-level docs are minor.

---

## 1. Pattern findings

### 1.1 zombie-schema-fields (architecture) — HIGH

**Finding:** D-3 in `PRD.md:88` deprecates Sanity `consent`-type fields. P1.11 marks existing fields as `deprecated: true` (annotation only). However, `studio/schemas/formField.ts:68` still lists `{ title: "Consent Checkbox", value: "consent" }` as a selectable type option. A future Sanity editor can still ADD a new consent field that the intake form no longer reads. This is the classic zombie-schema-fields shape: a schema option survives its consumer.

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/architecture/zombie-schema-fields.md`; `studio/schemas/formField.ts:68`; PRD.md:88 (D-3), PRD.md:163 (P1.11).

**Severity rationale:** HIGH — the deprecation is half-finished. Compliance and data-integrity surfaces are involved. Discovery cost of "why doesn't my new consent checkbox work?" lands on Becky.

**Suggested decision discipline:** When a field type is deprecated, the type definition itself is either removed (with migration of existing data) or guarded with a Studio validation rule that blocks new uses. Annotation alone is not deprecation.

**Proposed PRD remediation:** Add P1.X1 (before P1.11): `studio/schemas/formField.ts` removes `"consent"` from the type enum OR adds `validation: Rule => Rule.custom(...)` blocking new use. If removed, P1.11 must migrate all existing consent fields to a different type or strip them from documents. Document the choice in D-3.

### 1.2 council-evidence-requirement (decision-making) — HIGH

**Finding:** The 3-vantage Architect council that produced PRD's "ship first / ship second / defer" sequencing (synthesized into D-3 / D-4 / D-5) ran on 2026-05-15 against the same evidence base (Becky's report + Engineer audit + QA audit). Re-reading the council output: personas debated structural reasoning ("E2E catches integration drift, not design-level coupling"; "splitting components doesn't change the contract") but did NOT cite specific tests, code paths, vendor docs, or PR retrospectives. The PRD inherits the council's verdict without its evidence chain.

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/decision-making/council-evidence-requirement.md`; PRD.md:34 (council reference); council transcript in conversation history this session.

**Severity rationale:** HIGH — three load-bearing PRD decisions (D-4 integration-test-gate, D-5 refactor scope, sequencing of Phase 0 vs Phase 2) trace to a council without an evidence chain. Memory `feedback_vendor_citation_at_observe.md` already binds vendor citations; the same rigor should bind council reasoning.

**Suggested decision discipline:** Council debates that produce sequencing/architecture decisions must cite either (a) test results, (b) code paths under examination, (c) vendor docs, or (d) prior incident retrospectives. Opinion-only councils are surfacing structural intuitions, not evidence-led decisions, and should be labeled as such in the PRD so future sessions know whether to re-litigate.

**Proposed PRD remediation:** In PRD's "Open questions" section, add an item: "Council on Phase ordering ran 2026-05-15 as structural-reasoning debate, not evidence-cited. Decisions D-3 / D-4 / D-5 may merit re-debate if the Phase 0 Playwright runtime exceeds the 3-min target or if refactor surfaces unforeseen test-coverage gaps." OR: re-run the council with evidence-citation discipline before Phase 0 opens.

### 1.3 cross-boundary-predicate-fragmentation (planning) — MEDIUM

**Finding:** The legal-consent predicate (art6 + art9 + cooling-off all `true`) now spans four boundaries per PRD P1.3–P1.7: client-side React state (`art6Consent`, `art9Consent`, new `coolingOffConsent`), server-side validators in 3 booking routes, D1 schema (`art6AcknowledgedAt`, `art9AcknowledgedAt`, new `cooling_off_acknowledged_at`), and Sanity mirror (`consentSnapshot.art6Consent`, `art9Consent`, new `coolingOffConsent`). The PRD enumerates each boundary's task but doesn't declare a shared TypeScript type or predicate helper.

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/planning/cross-boundary-predicate-fragmentation.md`; PRD.md:155–165 (P1.3–P1.7).

**Severity rationale:** MEDIUM — fragmentation hasn't bitten yet; the existing two-checkbox version works. But adding a third checkbox is the moment to consolidate before the pattern entrenches.

**Suggested decision discipline:** Cross-boundary predicates need a single source-of-truth type/helper imported by every boundary. `src/lib/compliance/intakeConsent.ts` already owns the label constants — extend it to own a `LegalConsentSnapshot` type + `isFullyConsented(snapshot): boolean` helper consumed by client/server/mirror.

**Proposed PRD remediation:** Add P1.X2: `src/lib/compliance/intakeConsent.ts` exports `LegalConsentSnapshot` interface + `isFullyConsented()` predicate. All four boundaries import + use it. Document under D-1.

### 1.4 vendor-verification-discipline (product-management) — MEDIUM

**Finding:** PRD frontmatter `vendor_assumptions:` lists ten citations with URLs. The memory rule `feedback_vendor_citation_at_observe.md` says "cite vendor docs in PRD `vendor_assumptions:` frontmatter at OBSERVE, not at debug-time." Citations are present; verification status is not. Specifically: were the URLs fetched and the claims read, or are they good-faith URLs that I expect to be correct?

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/product-management/vendor-verification-discipline.md`; PRD.md:11–22 (vendor_assumptions block); memory `feedback_vendor_citation_at_observe.md`.

**Severity rationale:** MEDIUM — citations are honest URLs but the verification rigor isn't logged. The relevant ones are GDPR articles (well-known) and Playwright/MSW (mainstream tooling), so risk is low — but the discipline rule is "verify, don't speculate." Brevo policy Section E was a real audit gap in prior sessions; same shape could hide here.

**Suggested decision discipline:** When citing a vendor doc URL, mark verification status: `verified` (URL fetched, claim read in source), `inferred` (claim is well-known but URL not fetched in this session), or `requires-verification` (claim used in PRD but not yet verified — must verify before phase opens).

**Proposed PRD remediation:** Add a column to `vendor_assumptions:` entries or annotate each with `verified|inferred|requires-verification`. For Phase 0, verify Playwright `workers` parallelism semantics and MSW interception of fetch in workerd specifically (the workerd runtime is unusual; MSW's Node-fetch interceptor may not bind cleanly).

### 1.5 deferral-hygiene (planning) — MEDIUM

**Finding:** PRD P4.3 (issue #5 — "copy of your answers" stale promise) is written as a branching task: "If email DOES still include intake answers, no change. If email does NOT include answers, update thank-you body + Sanity initialValue + migration." This is a deferred verification disguised as a task — the check ("does the email still include answers?") could and should be done now, before PRD locks, so P4.3 is a single-path action.

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/planning/deferral-hygiene.md`; PRD.md:235 (P4.3); memory `feedback_no_more_splitting_and_deferring.md`.

**Severity rationale:** MEDIUM — one-task drift, not systemic; but conflicts with the explicitly-cited memory `feedback_no_more_splitting_and_deferring.md` and the PRD's own D-10 ("no deferrals across phases").

**Suggested decision discipline:** Verifications that can be answered with a 30-second grep should happen at PRD-write time, not be encoded as a phase task. Phase tasks should be executions, not "first check then maybe execute."

**Proposed PRD remediation:** Read `src/lib/emails/OrderConfirmation.tsx` (or equivalent) now; lock P4.3 to the single appropriate path (most likely: update copy + Sanity migration, since the recent gift-flow PRDs trimmed the email body).

### 1.6 pre-flight-freshness (work-process) — SOFT

**Finding:** Memory `feedback_refresh_git_state_at_observe.md` says "Run `git log -15 main` during OBSERVE for 'what's next' tasks." This PRD's OBSERVE didn't explicitly run that — the freshness signal came from CLAUDE.md being current (Explore confirmed main is at `7941744`, matching CLAUDE.md). State Snapshot reaffirms. So no actual drift, but the prescribed check was implicit not explicit.

**Cited references:** `~/.claude/skills/PlanReviewer/patterns/work-process/pre-flight-freshness.md`; memory `feedback_refresh_git_state_at_observe.md`.

**Severity rationale:** SOFT — flagged for discipline; no measurable risk on this specific PRD because the freshness was independently verified.

**Suggested decision discipline:** Make the git-log freshness check explicit in PRD frontmatter (`git_head_at_observe: <commit>`) so it's auditable in retrospect.

**Proposed PRD remediation:** Add `git_head_at_observe: 7941744 (main, 2026-05-09)` and `release_branch_head_at_observe: <release/v1.0.0 head>` to PRD frontmatter.

---

## 2. Top 3 Actions (decision-disciplines)

1. **[HIGH][zombie-schema-fields]** Half-finished deprecations are zombie hits. Add a "consumer-side deprecation" checklist to the project's PRD template: when a field type/option is being removed from runtime use, the schema definition must also be removed-or-guarded in the same PR. Apply now: PRD adds P1.X1 to either remove `"consent"` from `formField.ts:68` enum or add Studio validation blocking new uses.

2. **[HIGH][council-evidence-requirement]** Council debates that drive load-bearing decisions need evidence-citation. When a Council runs in this project from now on, the council's prompt must require each persona to cite at minimum one of: test result, code path, vendor doc, prior incident. Apply now: PRD records the 2026-05-15 council's evidence-gap explicitly in "Open questions" so future sessions can re-litigate if signals warrant.

3. **[MED][cross-boundary-predicate-fragmentation]** Predicates that span ≥3 boundaries need a single owning module before the third boundary is added. Adding the cooling-off consent is the consolidation trigger. Apply now: PRD adds P1.X2 — `LegalConsentSnapshot` type + `isFullyConsented()` predicate in `src/lib/compliance/intakeConsent.ts`, imported by all four boundaries.

---

## 3. Closing Summary

**What's good:**
- PRD frontmatter follows project conventions (slug, vendor_assumptions, mode, phase tracking).
- Phasing is completionist per `feedback_no_more_splitting_and_deferring.md` — D-10 explicit.
- Locked decisions (D-1 through D-10) carry rationale, not just declarations.
- Refactor sequencing (Phase 0 tests → Phase 2 refactor) shows awareness of refactor-without-tests risk.
- Memory writes promised at P1.15 (new `feedback_legal_ui_never_cms_conditional.md`) keeps lessons portable.
- Rollback strategy explicit per phase.

**What's risky:**
- Two HIGH findings above; both have concrete PRD remediations proposed.
- Phase 0's MSW-in-workerd assumption is unverified (vendor-verification gap). If MSW doesn't intercept cleanly in the OpenNext runtime, fixture strategy needs Plan B (real Sanity staging or local proxy).
- Becky's actual root cause for bug #3 remains a "best hypothesis." PRD acknowledges this (P3 fixes the symptom regardless) but the verification loop with Becky should not be skipped.
- Sustained 14+-session arc + Max's frustration about wasted time = high risk of "skip the audit-doc walk" temptation. The audit's value is highest if its diffs apply, not if it sits in `docs/`.

**What needs further investigation:**
- Existing Sanity bookingForm documents — how many in production carry a `consent`-type field today? If <5, manual Studio cleanup at Phase 1; if many, migration logic at P1.11 becomes load-bearing.
- Becky's Birth Chart "last page" claim for bug #3 — confirm via Sanity staging fixture whether her form had a `multiSelectExact` field with count mismatch (most likely cause per Engineer hypothesis) vs another shape.
- `release/v1.0.0` → main merge ordering vs this PRD's Phase 0 — does the new Playwright suite gate the existing release branch, or does it apply only to PRs after Phase 0 merges? Decide explicitly.

---

## Audit metadata

- **Skill version:** PlanReviewer v2.1
- **Active pattern library:** 10 active patterns across 9 domains (`~/.claude/skills/PlanReviewer/patterns/`)
- **Layer 1 surfaces scanned:** `CLAUDE.md`, `www/docs/BACKLOG.md`, `www/docs/CHANGELOG.md`, last 6 PRDs in `www/MEMORY/WORK/`, 35 feedback memories in `~/.claude/projects/-Users-maxgertzen-dev-projects-josephine-soul-readings/memory/`
- **Layer 2 MD-docs discovered:** 14 cataloged in 0.4
- **Orphan docs:** `JOSEPHINE_MANUAL_ACTIONS.md` (unreferenced from CLAUDE.md / BACKLOG / CHANGELOG)
- **Skipped:** Pattern library `multi-store-field-drift`, `wrong-cause-fix-cascade`, `env-var-triplication`, `missing-environment-separation`, `default-open-production-posture` — detection passes did not match this PRD's content
- **Quality gates:**
  - **tier_1_spotcheck:** pass — every finding cites a pattern, severity tags consistent, top-3 actions trace to findings
  - **tier_2_council:** SKIPPED — auto-trigger condition met (2 HIGH findings present), but user (Max) is mid-session, ran an external 3-vantage council on adjacent material today, and explicitly redirected to "no more delay." Conservative interpretation: surface findings as-is, mark `tier_2_can_rerun: true`. Re-run with `audit --vet` if Max wants Tier 2 council vetting before applying diffs.
- **Steering-doc diffs proposed:** see §Proposed Diffs below
- **Memories proposed:** see §Proposed Memory Writes below
- **Shipped:** false (audit-doc only; diffs not yet applied)

---

## Proposed Diffs

### CLAUDE.md (project root) — "Binding constraints" section

```diff
- 4 separate consent checkboxes (entertainment + cooling-off + T&C/Privacy + optional newsletter) — do NOT consolidate
+ 3 hardcoded legal acknowledgment checkboxes on final intake page (art6 / art9 / cooling-off), all required, all rendered unconditionally; T&C/Privacy folded into art6 label per Privacy Counsel 2026-05-09; entertainment disclaimer surfaced as page/email text not checkbox; newsletter opt-in lives on separate surface per Brevo decision 2026-05-09. Source: PRD `20260515-200000_intake-architecture-repair` D-1 / D-2.
```

### CLAUDE.md — "Known pitfalls (open)" — NEW SUBSECTION

```diff
+ ## Known pitfalls (open) — surfaced by PLAN_AUDIT_2026-05-15
+ 
+ - **Zombie consent-type field in Sanity schema.** `studio/schemas/formField.ts:68` still lists `"consent"` as a selectable type after the intake form stopped reading it. Until PRD `20260515-200000_intake-architecture-repair` Phase 1 ships, do NOT add new consent-type fields in Sanity Studio — they will render nothing.
+ - **Council decisions without evidence-citation.** The 3-vantage council that drove the intake-repair PRD ran 2026-05-15 as structural-reasoning debate, not evidence-cited. Decisions D-3 / D-4 / D-5 may merit re-litigation if Phase 0 surfaces unexpected runtime / coverage data.
```

### PRD `20260515-200000_intake-architecture-repair/PRD.md` — Phase 1 additions

```diff
  ### Phase 1 — Compliance decoupling + content contract
  ...
+ - [ ] P1.X1: `studio/schemas/formField.ts:68` removes `"consent"` from the `type` enum OR adds Studio validation rule blocking new uses. Existing documents migrated per P1.11 (now load-bearing, not annotation-only).
+ - [ ] P1.X2: `src/lib/compliance/intakeConsent.ts` exports `LegalConsentSnapshot` interface + `isFullyConsented(snapshot): boolean` predicate. Client (IntakeForm + LegalAcknowledgments), server (3 booking routes), D1 (submission insert), and Sanity mirror all import and use it. No boundary maintains its own predicate.
```

### PRD frontmatter

```diff
  ---
  task: ...
+ git_head_at_observe: 7941744 (main, 2026-05-09)
+ release_branch_head_at_observe: <fill at next session start>
  vendor_assumptions:
- - "Playwright @latest (1.49+) — ..."
+ - "Playwright @latest (1.49+) — workers parallelism + WebKit/Chromium/Firefox runners. https://playwright.dev/docs/intro — [requires-verification: workers in OpenNext/workerd]"
- - "MSW 2.x — intercepts fetch at the request layer; supports Next.js App Router via setup-node in workerd. https://mswjs.io/docs/getting-started"
+ - "MSW 2.x — intercepts fetch at the request layer. https://mswjs.io/docs/getting-started — [requires-verification: workerd runtime compatibility BEFORE Phase 0 P0.4]"
  ...
```

### PRD Open Questions — addition

```diff
  4. **Existing Sanity `consent`-type fields** — how many production bookingForm documents currently have one? If <5, manual cleanup at Studio. If many, P1.11 migration script becomes load-bearing.
+ 5. **Council evidence gap (audit-flagged).** The 3-vantage council that drove D-3 / D-4 / D-5 ran as structural-reasoning debate, not evidence-cited. Re-run with evidence-citation discipline if Phase 0 surfaces unexpected runtime / coverage data; otherwise treat as a known limitation and proceed.
+ 6. **MSW + workerd compatibility.** Phase 0 P0.4 assumes MSW intercepts fetch at the OpenNext-workerd worker boundary. The MSW node-fetch interceptor may not bind cleanly to workerd's runtime. Verify before P0.4 opens; Plan B is local-fastapi Sanity proxy.
```

---

## Proposed Memory Writes

### `feedback_legal_ui_never_cms_conditional.md` (NEW)

```markdown
---
name: Legal-requirement UI is never CMS-conditional
description: Legal acknowledgment checkboxes (GDPR Art. 6/9, consumer-protection cooling-off) are hardcoded in code; CMS authority is limited to label text only. Never required-ness, never render-condition.
type: feedback
audit_source: PLAN_AUDIT_2026-05-15.md#1.1
pattern: zombie-schema-fields
---

Legal-requirement UI is always hardcoded with CMS authority limited to label text. CMS editors must NEVER be able to:
- Hide a legally-required checkbox by deleting a content field
- Untick the "required" flag on a legal-requirement checkbox
- Change the legal contract via content change (only the verbatim wording, behind Privacy Counsel approval)

**Why:** PR-pre-launch surface had GDPR Art. 6 + Art. 9 acknowledgment checkboxes gated on a Sanity-driven `consentField`. If the editor deleted the field or unticked required, the legal contract silently broke. Server-side gates caught it (no data leak) but the UX dead-ends silently. Caught 2026-05-15 in Becky's smoke test.

**How to apply:** Before delegating ANY required UI element's render-condition or required-ness to a CMS field, ask: "If the editor changes this field, does the legal contract change?" If yes → hardcode the element, expose label text only.
```

### `feedback_consumer_side_deprecation_complete.md` (NEW)

```markdown
---
name: When a field type is deprecated from runtime use, deprecate the schema definition in the same PR
description: Half-finished deprecations create zombie schemas — the consumer ignores the field but the schema still lets editors add new ones.
type: feedback
audit_source: PLAN_AUDIT_2026-05-15.md#1.1
pattern: zombie-schema-fields
---

When removing a field type's runtime consumer (e.g. component stops reading `field.type === "consent"`), the same PR must also:
1. Remove the field type from the schema's enum/selector, OR
2. Add a schema-side validation rule blocking new uses of the type, OR
3. Mark the type explicitly `deprecated: true` AND add a UI warning in the editor for any existing/new use.

Annotation-only deprecation in a separate PR is not deprecation — it's documentation. Editors can still add the zombie field and break their own workflow.

**Why:** Sanity `formField.ts:68` retained `"consent"` as a selectable option after the intake form stopped reading it. Future editors adding a "consent" type field would have wondered why nothing rendered.

**How to apply:** Treat "remove consumer + remove producer" as one atomic PR. If they must split for scope, add a PR-of-record annotation flagging the zombie window.
```

---

## Triage decisions

(Populated by `triage` mode invocations.)

---

## Flow state

(Populated by `start` / `flow` mode invocations.)

---

## How to act on this audit

```
# Triage HIGH findings interactively
Skill("PlanReviewer", "triage www/docs/PLAN_AUDIT_2026-05-15.md")

# Auto-queue all H+M to BACKLOG.md
Skill("PlanReviewer", "queue www/docs/PLAN_AUDIT_2026-05-15.md")

# Scaffold PRD stubs for all HIGH (no interaction)
Skill("PlanReviewer", "spawn www/docs/PLAN_AUDIT_2026-05-15.md")

# Re-run Tier 2 Council vetting before applying diffs
Skill("PlanReviewer", "audit www/MEMORY/WORK/20260515-200000_intake-architecture-repair --vet")

# After remediating: dispatch Algorithm on the next-best PRD
Skill("PlanReviewer", "next www/docs/PLAN_AUDIT_2026-05-15.md")
```

---

## Tier 2 Council Reconciliation (appended 2026-05-15)

Three personas vetted §1 findings: **Stack Expert** (Next.js + Sanity + workerd), **HeuristicHLD** (architectural coherence), **Security/Pentester** (GDPR + audit trail). Reconciliation applied per skill rule.

### Severity changes (from persona consensus)

| Finding | Original | Reconciled | Trigger |
|---|---|---|---|
| §1.1 zombie-schema-fields | HIGH | **HIGH (kept)** + scope-expand | All 3 personas keep; Stack Expert adds: do NOT touch `bookingGiftForm.ts` consent GROUP (distinct from `formField.type === "consent"`) |
| §1.2 council-evidence-requirement | HIGH | **MEDIUM (downgraded)** | 2 of 3 personas (Stack + HLD) argue D-3/D-4/D-5 are structural taste, not vendor-citation territory; Pentester elevates but in security frame only |
| §1.3 cross-boundary-predicate-fragmentation | MEDIUM | **HIGH (elevated)** | 2 of 3 personas (Pentester + HLD) elevate. Pentester: audit trail already drifts per-route (`gift-redeem` only writes art9, `gift` only writes art6 — pre-existing fragmentation). HLD: pattern is project-wide, consolidating at consent locks shape for gift / magic-link / Stripe webhook cascade. |
| §1.4 vendor-verification-discipline | MEDIUM | **HIGH (elevated)** | Stack Expert: MSW+workerd is architecturally questionable, not just unverified. MSW's Node interceptor runs in the Playwright test PROCESS — it cannot intercept fetches issued from inside the workerd worker handling `page.goto`. PRD's P0.4 strategy is likely a dead-end; fix is an env-var-gated Sanity client pointing at a fixture sidecar. |
| §1.5 deferral-hygiene | MEDIUM | **MEDIUM (kept)** | All 3 personas keep |
| §1.6 pre-flight-freshness | SOFT | **SOFT (kept)** | All 3 personas keep |

### New findings (Council-surfaced, added to §1)

#### §1.7 — gift-form consent surface inherits the same CMS-conditional hole (NEW — HIGH)

**Finding:** D-1/D-2/D-3 cover the booking intake form ONLY. `studio/schemas/bookingGiftForm.ts:14, 209-244` defines a separate consent GROUP (3 fields editable in Studio: `coolingOffConsentLabel`, T&C label, etc.) for the gift purchaser surface (`/gift` route). The same legal-UI-via-CMS shape exists on the gift path — Phase 1 hardcodes booking checkboxes, gift surface stays CMS-editable, identical compliance defect persists.

**Cited references:** Stack Expert MP-4 + HeuristicHLD M-B (≥2-persona consensus); `studio/schemas/bookingGiftForm.ts:14, 209-244`.

**Severity:** HIGH — same regulatory weight as §1.1 / original §1.2 / original §1.3, applied to a parallel surface the PRD ignored.

**Suggested decision discipline:** Compliance-affecting decisions on form A must check parity with form B before merging. Audit ALL form surfaces (intake, gift purchase, gift redeem, gift claim) for the same CMS-conditional legal-UI pattern simultaneously.

**Proposed PRD remediation:** Extend D-1 + D-3 to bookingGiftForm. Add P1.X3: hardcode gift-form purchaser-side consents on the same compliance principles; CMS authority limited to label text only.

#### §1.8 — Sanity `options.list` has no built-in `hidden`/`deprecated` predicate (NEW — HIGH)

**Finding:** Stack Expert verified: Sanity Studio v3's `defineField` + `options.list` is a static array. There is no `hidden: true` or `deprecated: true` per-value flag. PRD P1.11's "annotation-only" approach via marking existing documents `deprecated: true` is non-standard for Sanity — there's no built-in editor affordance to surface this to a content editor. The clean path is: remove `"consent"` from `formField.ts:68` enum entirely; legacy docs with a `consent`-type field load fine (Studio just shows the raw string with no edit affordance).

**Cited references:** Stack Expert critique of §1.1; https://www.sanity.io/docs/string-type (options.list semantics).

**Severity:** HIGH — PRD's described deprecation mechanism does not exist as written. Phase 1 will not work as specified.

**Suggested decision discipline:** Before relying on a vendor-feature behavior, verify the feature exists in the version being used. Especially for "deprecation," "soft removal," "annotation" — these are common CMS asks that often aren't supported as imagined.

**Proposed PRD remediation:** Replace P1.11 with: "Remove `"consent"` from `studio/schemas/formField.ts:68` enum. Existing bookingForm documents with consent-type fields load fine (Sanity preserves raw values not in the active enum). Add Studio document validation rule that warns + blocks publish if a section contains a `consent`-type field."

#### §1.9 — MSW interception strategy for Sanity is architecturally invalid in OpenNext/workerd (NEW — HIGH)

**Finding:** PRD P0.4 plans MSW handlers at `tests/e2e/mocks/sanity.ts` to intercept GROQ queries. But MSW's Node interceptor runs in the Playwright test PROCESS. Browser-originated fetches (from `page.goto`-loaded pages) DO reach the workerd dev server, but the workerd worker's outbound fetches to Sanity (RSC queries, GROQ from API routes) bypass MSW because MSW isn't loaded inside the worker isolate. Stack Expert + Pentester both flagged this from different angles (architectural validity + dataset isolation).

**Cited references:** Stack Expert §1.4 critique; Pentester MP-6 (Sanity dataset isolation); https://mswjs.io/docs/integrations/node.

**Severity:** HIGH — Phase 0's entire fixture strategy is built on this assumption. If wrong, Phase 0 doesn't ship.

**Suggested decision discipline:** Mocking strategies that span process boundaries (test process vs. worker isolate vs. browser) must be verified against the runtime's actual fetch resolution path before being adopted as a foundation.

**Proposed PRD remediation:** Replace MSW-for-Sanity with an env-var-gated Sanity client: `SANITY_DATASET=e2e-fixtures` + a local fixture-serving sidecar that handles GROQ queries from JSON files. Keep MSW for the Stripe + Resend interceptions (those originate from the worker AND the test process, but Stripe SDK at `src/lib/stripe.ts` instantiates `new Stripe(...)` and may bypass even fetch-level mocks). Phase 0 P0.4 also needs `SANITY_API_WRITE_TOKEN=""` in CI test env so any escape-through write attempt fails 401, not pollutes staging.

#### §1.10 — Audit-trail integrity during P1.3 → P1.4 deploy gap (NEW — HIGH)

**Finding:** PRD P1.3 removes `consentField` derivation; P1.4 rewrites `consentLabelSnapshot` to serialize all three labels. If shipped in separate commits/deploys (PRD doesn't say they're atomic), submissions landing between would write `consentLabelSnapshot: ""` (today's fallback at IntakeForm.tsx:559) into D1 + Sanity mirror — GDPR Art. 5(2) accountability hit if any production submission lands with empty audit label.

**Cited references:** Pentester MP-1; `IntakeForm.tsx:559`; `sanityMirror.ts:91`.

**Severity:** HIGH — direct regulatory exposure.

**Suggested decision discipline:** Compliance-affecting refactors must declare atomicity explicitly. Either same commit, or the defensive-defaults shape (write the new schema first while old code still writes old shape) before swapping consumers.

**Proposed PRD remediation:** Add P1.X4: "P1.3 + P1.4 ship in the SAME commit and SAME deploy. If split: P1.4 ships FIRST as a defensive default (snapshot serializes all three art6/art9/cooling-off labels even if `consentField` still exists), THEN P1.3 removes the derivation in a separate deploy. Backward-compatible reversal order required."

#### §1.11 — Test fixture anonymization discipline missing (NEW — HIGH)

**Finding:** PRD P0.3 commits Sanity fixtures to git at `src/__fixtures__/sanity/e2e/`. PRD says "anonymized" once. No procedure, no checklist, no reviewer gate. If Becky's actual reading copy, Josephine's contact details, or real customer email patterns land in git, that's a PII leak with public-history permanence.

**Cited references:** Pentester MP-3.

**Severity:** HIGH — irreversible PII leak risk if Sanity production content gets committed.

**Suggested decision discipline:** Any test fixture sourced from production content must pass through an anonymization gate documented as code, not as a README note. CI must enforce the gate via regex/lint.

**Proposed PRD remediation:** Add P0.X1: "Fixture-generation script `scripts/generate-e2e-fixtures.ts` reads Sanity production with read-only token; strips: `contactEmail`, all `hello@*` strings, phone/tel fields, person names matching denylist, any field flagged `legalReviewed: true`. PR template gains 'fixtures anonymized' checkbox. CI lint validates fixture JSON against regex denylist before allowing PR merge."

#### §1.12 — Playwright env-guard against live Stripe keys (NEW — MEDIUM)

**Finding:** PRD P0.5 intercepts `buy.stripe.com/*` (Payment Link redirect). Stripe SDK at `src/lib/stripe.ts:13` instantiates `new Stripe(requireEnv("STRIPE_SECRET_KEY"))` and webhook + reconcile + redaction modules hit `api.stripe.com` via SDK, not `buy.stripe.com`. MSW must also intercept `https://api.stripe.com/*`, AND the test harness must assert `STRIPE_SECRET_KEY?.startsWith("sk_test_")` before allowing the suite to run.

**Cited references:** Pentester MP-4; `src/lib/stripe.ts:13`.

**Severity:** MEDIUM — guardrail risk, not active leak. Live-mode flip is gated separately; current state is test-mode only.

**Suggested decision discipline:** Test harnesses against payment surfaces need explicit env-guards (assert test-mode key prefix at suite start, abort otherwise). Network-level mocks are necessary but not sufficient.

**Proposed PRD remediation:** Add P0.X2: "Playwright `globalSetup` asserts `STRIPE_SECRET_KEY?.startsWith('sk_test_') === true` OR aborts with explicit error. Add `tests/e2e/mocks/stripe.ts` covering BOTH `buy.stripe.com/*` (redirect) AND `api.stripe.com/*` (SDK calls)."

#### §1.13 — Phase ordering trap: Playwright tests before refactor double-writes them (NEW — MEDIUM)

**Finding:** PRD ships Playwright (Phase 0) BEFORE the IntakeForm refactor (Phase 2). 7 tests target the current 864-line god-component's selectors/DOM. Phase 2 changes DOM structure, extracts 7 modules — Playwright selectors will likely need rewriting in Phase 2. Alternative: Phase 2 refactor FIRST under existing 32-test vitest cover (P2.9 colocated tests already planned), THEN Phase 0 Playwright suite targets the clean structure.

**Cited references:** HeuristicHLD M-A.

**Severity:** MEDIUM — wasted-work risk, not a defect. Counterargument from Council: writing tests against unstable foundation is exactly when you most need them (refactor regressions). The bigger risk is Phase 2 introducing a regression that Phase 0 Playwright would have caught.

**Suggested decision discipline:** When refactor + integration-test work are both queued, evaluate test stability investment vs. refactor-regression risk explicitly. Default per Engineer council verdict: test cover first, refactor under cover. But Council was opinion-led on this (see §1.2 caveat).

**Proposed PRD remediation:** Add explicit "Phase ordering tradeoff" note to PRD Context: tests-first chosen to catch refactor regressions; expect ≤30% Playwright selector rewrite during Phase 2 (use role-based locators where possible to minimize rewrite blast radius).

#### §1.14 — release/v1.0.0 → main merge vs. Phase 0 CI gate sequencing (NEW — HIGH)

**Finding:** `release/v1.0.0` carries 66 commits pending main-merge. If Phase 0's required Playwright check applies retroactively, the release-branch fails the gate it predates. PRD doesn't declare whether the gate applies to (a) release/v1.0.0 → main merge, or (b) PRs cut AFTER Phase 0 lands.

**Cited references:** HeuristicHLD M-C; CLAUDE.md "Active release branch" block.

**Severity:** HIGH — could block the release merge that's pending Stage B/C smoke tests.

**Suggested decision discipline:** New CI gates must declare retroactive applicability. Default: gate applies to PRs OPENED after the gate's merge commit; existing PRs are grandfathered with a deprecation window.

**Proposed PRD remediation:** Add to D-4: "Gate applies to PRs OPENED on or after Phase 0 merge commit. release/v1.0.0 → main merge is grandfathered (it predates the gate). Existing PRs older than Phase 0 merge are flagged but not blocked."

#### §1.15 — Refactor `<300 lines` metric is anti-architectural (NEW — SOFT)

**Finding:** PRD's Phase 2 target conflates length with decomposition. 864→299 via yanking 565 lines into 7 modules can leave coupling intact (props drilling, shared mutable refs). Better metrics: prop-drilling depth ≤2, no module imports >3 hooks from sibling modules, render-render boundaries explicit via React.memo where state isolation matters.

**Cited references:** HeuristicHLD M-D.

**Severity:** SOFT — discipline, not blocker.

**Suggested decision discipline:** Refactor targets should specify coupling metrics, not just length. Length is a proxy for "this file is too big to read" but doesn't measure architectural improvement.

**Proposed PRD remediation:** Add to Phase 2 acceptance criteria: prop-drilling depth ≤2 between extracted modules; no module imports >3 hooks from siblings; ReviewSummary + IntakeForm boundary explicit via memoized props.

#### §1.16 — Memory file proliferation (NEW — SOFT)

**Finding:** 35 feedback memories on file. PRD + audit add 4 more (P1.15 promise + audit's 2 proposed writes + the candidate pattern note). No consolidation discipline. Several existing memories overlap (`feedback_no_more_splitting_and_deferring.md` + `feedback_one_fix_then_verify.md` + `feedback_no_pre_existing_passes.md` are "complete the task" variants).

**Cited references:** HeuristicHLD M-E; MEMORY index in system context.

**Severity:** SOFT — efficiency, not correctness.

**Suggested decision discipline:** Establish a periodic memory-consolidation pass (e.g. every 10 new memories: review overlap, merge or supersede).

**Proposed PRD remediation:** Out of scope; file as separate POST_LAUNCH_BACKLOG item OR add a 30-min consolidation task to Phase 5.

### Reconciled Top 3 (per HeuristicHLD M-F + new severities)

1. **[HIGH][§1.1 + §1.7 + §1.8]** Fix Sanity schema deprecation correctly: remove `"consent"` from `formField.ts:68` enum (don't annotate); extend D-3 to cover `bookingGiftForm.ts` consent group; verify Sanity v3 enum-removal semantics.
2. **[HIGH][§1.3]** Add `LegalConsentSnapshot` type + `isFullyConsented()` predicate spanning all 4 boundaries — addresses ALREADY-EXISTING audit-trail drift between booking / gift-purchase / gift-redeem routes, plus locks shape before cooling-off ack lands.
3. **[HIGH][§1.9 + §1.10 + §1.11]** Phase 0 needs structural rework: MSW-for-Sanity replaced by env-gated fixture sidecar; P1.3+P1.4 declared atomic; fixture anonymization documented as code-enforced gate.

### Tier 2 quality-gate metadata

```yaml
tier_2_council:
  status: ran
  trigger: "2 HIGH findings present + user requested via --vet equivalent"
  personas: [stack-expert (general-purpose subagent, Next/Sanity/workerd lens), heuristic-hld (general-purpose subagent, architectural coherence lens), security (Pentester subagent, GDPR/audit-trail lens)]
  elevated:
    - "§1.3 cross-boundary-predicate-fragmentation: MEDIUM → HIGH (2 personas — Pentester + HLD)"
    - "§1.4 vendor-verification-discipline: MEDIUM → HIGH (Stack Expert — MSW architecturally invalid in workerd)"
  downgraded:
    - "§1.2 council-evidence-requirement: HIGH → MEDIUM (2 personas — Stack + HLD)"
  dropped: []
  added:
    - "§1.7 gift-form consent CMS-conditional hole — ≥2-persona consensus → candidate pattern: consent-surface-parity-across-flows"
    - "§1.8 Sanity options.list has no hidden/deprecated predicate — Stack Expert (high evidence)"
    - "§1.9 MSW in workerd architecturally invalid — Stack Expert + Pentester aligned"
    - "§1.10 P1.3→P1.4 deploy-gap audit-trail break — Pentester (security)"
    - "§1.11 Fixture anonymization discipline missing — Pentester (security)"
    - "§1.12 Playwright env-guard against live Stripe keys — Pentester"
    - "§1.13 Phase ordering trap (refactor vs tests first) — HeuristicHLD"
    - "§1.14 release/v1.0.0 vs Phase 0 gate sequencing — HeuristicHLD"
    - "§1.15 <300-line metric anti-architectural — HeuristicHLD"
    - "§1.16 memory proliferation — HeuristicHLD"
  candidate_patterns_written:
    - "patterns/_candidates/consent-surface-parity-across-flows.md"
  user_resolved: []
  requires_user_resolution:
    - "§1.13 phase ordering: keep tests-first OR invert to refactor-first?"
```

---

## Applied 2026-05-15

Per user decision via PlanReviewer triage:

- **CLAUDE.md (project root):**
  - "Binding constraints" — replaced "4 consent checkboxes" line with the locked 3-booking / 2-gift hardcoded structure + reference to PRD D-1 / D-1a.
  - Added "Known pitfalls (open)" section between "Binding constraints" and "Operational notes" — references this audit + PRD v1.1 + 6 active pitfalls.
- **Feedback memories (project memory dir):**
  - `feedback_legal_ui_never_cms_conditional.md` — written. Indexed in MEMORY.md.
  - `feedback_consumer_side_deprecation_complete.md` — written. Indexed in MEMORY.md.
- **MEMORY.md index:** updated with 3 new lines (2 memories + audit-doc reference).
- **Candidate pattern:** `consent-surface-parity-across-flows.md` filed at `~/.claude/skills/PlanReviewer/patterns/_candidates/` (awaiting `Skill("PlanReviewer", "promote-pattern consent-surface-parity-across-flows")` review).
- **PRD rewritten as v1.1** with all Tier 2 reconciliations folded in — see `www/MEMORY/WORK/20260515-200000_intake-architecture-repair/PRD.md`.
- **Session 0 prompt** written at `www/MEMORY/WORK/20260515-200000_intake-architecture-repair/SESSION_0_PROMPT.md` for the next-session Phase 0 kickoff.

**Shipped: true** (audit-side state changes; PRD execution begins next session).
