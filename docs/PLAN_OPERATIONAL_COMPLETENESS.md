# Operational completeness — multi-PR integration branch

**Branch:** `feat/operational-completeness`
**Base:** `main` (post-PR #72)
**Started:** 2026-05-06
**Owner:** Max

## Scope

Three backlog items from the post-PR-#72 priority list, bundled to one integration branch. Each is independently shippable; bundling lets us iterate on the cron infrastructure once and reuse it across the items.

| # | Item | Status | Source |
|---|------|--------|--------|
| 1 | OpenNext `scheduled` handler dispatch | landed (commit on branch) | `www/docs/POST_LAUNCH_BACKLOG.md` → Infrastructure |
| 2 | D1 → Sanity reconcile cron | landed (commit on branch) | `www/docs/POST_LAUNCH_BACKLOG.md` → Persistence (ADR-001) |
| 3 | Resend templates → @react-email migration | landed via sub-PR | `www/docs/POST_LAUNCH_BACKLOG.md` → Infrastructure |

### Why these three together

- **#1 is leverage.** Wrangler cron schedules in `wrangler.jsonc` are aspirational today — every cron route is triggered externally via `Authorization: Bearer ${CRON_SECRET}` curl. Adding a `scheduled` handler in `custom-worker.ts` (we already own that file post-PR #70) activates all schedules natively. Cheapest item, biggest unlock.
- **#2 wants #1.** The reconcile cron is most useful when it fires automatically on a schedule; with #1 done, it's a one-and-done. Without #1, it's just another externally-curled route.
- **#4 is independent** but small. Bundling avoids opening a separate PR cycle for what is essentially copy-iteration plumbing.

### What was excluded and why

- **Studio admin UX for `deliveredAt` (item #3 from the original cluster)** — deliberately scoped out. It's a Phase-1.5 task (~weekend), needs a Sanity Studio document-type/admin-page surface, and has no infrastructure dependency on items #1/#2/#4. Better as its own focused session once Josephine has been using the CLI stopgap (`scripts/mark-delivered.mts`) long enough to surface real workflow needs.

## Session-split resilience

This work may span multiple sessions. To make split-resumption clean:

### Commit boundaries

Each item ships as one commit on this branch. **Don't bundle item N+1 work into item N's commit** — keep the history clean so a session-split mid-N doesn't bleed into N+1's diff review.

Order: this Plan doc commit → Item #1 → Item #2 → Item #4 → final PR.

### Resumption checklist

If a future session picks this up cold:

1. Read this file end-to-end.
2. `git log --oneline main..HEAD` to see which items have landed.
3. Check the "Status" column above (this Plan doc gets edited as items complete — the last completed-item update should reflect reality).
4. Read `www/docs/POST_LAUNCH_BACKLOG.md` for the full per-item context.
5. Run `pnpm typecheck && pnpm lint && pnpm test` to confirm the branch is healthy before starting new work.

### Status updates inside this doc

After each item lands, update the Status column above + add a short note in the **Session log** below. Plan-doc-as-truth.

## Session log

### 2026-05-06 — branch + plan doc

Branched off `main` at the post-PR-#72 SHA. Plan doc written. Items #1 and #2 will tackle the cron infrastructure together (#1 lands first, #2 builds on it). #4 is independent and can drop in any time. PR opens once all three land.

### 2026-05-06 — Item #1 landed: OpenNext scheduled handler

`custom-worker.ts` now exposes a `scheduled` handler beside `fetch`. It looks up the wrangler `cron` schedule string in `src/lib/cron-routes.ts`'s `CRON_DISPATCH` map and dispatches internal fetches against the matching `/api/cron/*` paths. Each request carries `cf-cron: 1` so `isCronRequestAuthorized` accepts it (CRON_SECRET path remains for manual triggers). Origin is per-env (`withjosephine.com` vs `staging.withjosephine.com`) so request logs attribute correctly. `wrangler.jsonc` cron-block comments updated to reflect the new state. 709/709 tests pass (added 5 for the routes map). Bundle gzip 4098 KiB — no growth. Will need post-deploy verification: trigger a scheduled event via CF dashboard "Trigger" button on staging and confirm the route fires (visible in `wrangler tail`).

### 2026-05-06 — Item #4 landed: Resend → @react-email migration (via sub-PR)

Sub-branched off this branch as `feat/resend-react-email`, opened sub-PR targeting `feat/operational-completeness` (CI trigger added to ci.yml so the sub-PR's checks fire). Migrated all 6 transactional emails from inlined HTML strings in `src/lib/resend.tsx` to React components in `src/lib/emails/`:

- `Day2Started.tsx` (firstName)
- `Day7Delivery.tsx` (firstName, readingName, listenUrl)
- `Day7OverdueAlert.tsx` (email, readingName, submissionId, createdAt)
- `ContactMessage.tsx` (name, email, message — multi-line preserved via `<br/>` segments)
- `JosephineNotification.tsx` (full submission context + responses table + photo block)
- `OrderConfirmation.tsx` (folio layout — header masthead, gold-rule title, body, inset price card, signature, footer)

Components use `@react-email/components` primitives (`<Html>`, `<Body>`, `<Container>`, `<Section>`, `<Heading>`, `<Text>`, `<Link>`, `<Hr>`) for cross-client compatibility. `@react-email/render` converts to HTML server-side; the existing `sendOrSkip` keeps passing HTML strings to Resend (no Resend SDK pattern change).

**TDD-first per user instruction** — for each email type: write parity test (red), write component (green), iterate. `src/lib/emails/test-helpers.ts` exposes `visibleText` (DOM text-content with React markers stripped) + `linkHrefs` (for href assertions). 31 new tests across 6 component test files. Existing `src/lib/resend.test.ts` updated to use `visibleText` for body assertions while keeping raw-HTML assertions for href/link checks.

**Visual parity preserved per user instruction** — every text string + brand color token + link URL from the legacy renderer is asserted in the React component's render output. The `OrderConfirmation` folio layout (vellum & letter design) is preserved structurally with the same table-based row structure email clients need.

746/746 tests pass (+31 new). Bundle gzip 4112 KiB (+5 KiB for react-email runtime) — well under the 6 MiB target. Lint + typecheck clean.

The legacy helper functions (`renderEmailShell`, `paragraph`, `signOff`, `renderResponsesHtml`, `renderInsetPrice`, `renderOrderConfirmationHtml`) are removed. `resend.ts` renamed to `resend.tsx` since it now contains JSX. Internal type `ContactMessage` renamed to `ContactPayload` to avoid collision with the imported `ContactMessage` component.

Followups (not in this branch):
- **Sanity-editable email copy.** Max raised this 2026-05-06 — the migration moved from inline-HTML to React, but the body copy is still hardcoded in component source. Becky/Josephine still can't iterate copy without an engineer. Next-session candidate: add per-email `Sanity` schema fields (e.g. `emailContent.day2.body`, `emailContent.orderConfirmation.body` etc.), fetch at render time in `resend.tsx`, fall back to the hardcoded copy if the Sanity fetch fails. Works best with the CRM-decoupling plan as a continuum (this is the in-codebase intermediate step before fully outsourcing to a CRM).
- **Visual preview** — added `pnpm email:preview` (Max-driven check). Renders all 6 emails to `email-previews/*.html` for browser-based parity verification against the legacy outputs in his inbox. Output dir gitignored.
- The CRM-decoupling plan (project CLAUDE.md → "Post-launch future enhancements") is the durable answer once volume + Becky's needs justify it.

### 2026-05-06 — Sub-PR #4 queued: Studio file-upload UI for Day-7 delivery (LAUNCH BLOCKER)

Surfaced 2026-05-06 by Max's question: "where/how will Becky set up the file and assign it correctly?". Answer: today's flow is broken. The Sanity submission schema has `voiceNoteUrl` / `pdfUrl` as plain `string` fields — Studio renders them as text inputs, and there's no R2 admin upload surface. Becky has no way to put audio + PDF at a stable URL without an engineer running `pnpm tsx scripts/mark-delivered.mts` from a terminal.

**Fix:** convert the schema fields to Sanity file assets. Becky drag-drops audio + PDF in Studio → Sanity CDN URL → set `deliveredAt` → day-7-deliver cron fires automatically (via Item #1's scheduled handler).

**Files to touch (verify each via grep before assuming the list is complete):**
- `studio/schemas/submission.ts` — `voiceNoteUrl: string` → `voiceNote: file`, `pdfUrl: string` → `readingPdf: file`. Sanity validation: required when `deliveredAt` is set.
- `src/lib/booking/persistence/sanityMirror.ts` — `mirrorSubmissionPatch` patch shape changes. After Sanity asset upload, resolve `asset.url` and write that back to D1's URL columns (recommended) so the listen page consumer keeps its current shape.
- `src/lib/booking/persistence/repository.ts` — D1 columns `voice_note_url` + `pdf_url` keep their TEXT type if we resolve `asset.url`; no D1 schema migration needed in that case.
- `src/app/listen/[token]/...` — listen page reads `voiceNoteUrl` / `pdfUrl` from D1; no change if D1 stores resolved URL strings.
- `src/app/api/cron/email-day-7-deliver/route.ts` — fires on `deliveredAt`; no change.
- `scripts/mark-delivered.mts` — CLI stopgap, becomes obsolete after this lands. Delete or repurpose for testing.
- Tests — existing tests use the URL-string shape; update fixtures + add a Sanity-asset round-trip test.

**Data-migration consideration:** prod D1 + prod Sanity probably have ZERO completed deliveries today (Becky hasn't run the live flow yet). Verify before migrating: `wrangler d1 execute --remote --command "SELECT id, delivered_at FROM submissions WHERE delivered_at IS NOT NULL"`. If zero rows, the migration is "swap field type" — no backfill needed. If non-zero, write a migration that uploads each existing URL's content to Sanity assets OR keeps both shapes during a transition.

**Effort:** ~2–4hr focused session. Schema migration + listen-page asset deref + mirror-write update + tests.

**Status:** queued as the next sub-PR off this integration branch. After it lands, the integration branch merges to main as a single PR carrying all 4 items.

### 2026-05-06 — Item #2 landed: D1 → Sanity reconcile cron

New `/api/cron/reconcile-mirror` route walks D1 submissions from the last 7 days, fetches the matching Sanity docs in a single `_id in $ids` GROQ query, and uses a pure `diffSubmission` helper (`src/lib/booking/persistence/reconcileMirror.ts`) to decide skip/create/patch per row. Compares 8 fields (status, paidAt, expiredAt, deliveredAt, voiceNoteUrl, pdfUrl, amountPaidCents, amountPaidCurrency) plus `emailsFired` array membership keyed by `(type, sentAt)`. Patch path uses existing `mirrorSubmissionPatch` + `mirrorAppendEmailFired` from `sanityMirror.ts` so semantics match the original mirror writes.

Wired into the `0 */6 * * *` schedule (alongside the existing reconcile + email crons). Listed in CRON_DISPATCH map; wrangler.jsonc comment updated.

Limitation: the `create` path is intentionally NOT implemented. If a Sanity doc is missing entirely (i.e. the original create-mirror failed), we can't faithfully reconstruct the consent snapshot (`acknowledgedAt` + `IP` aren't in D1). Logged as `missing` in the cron summary; recovery requires a separate Studio admin action — that's item #3 in the original cluster, deliberately scoped out of this branch.

Added `listSubmissionsCreatedAfter(cutoffIso)` helper to repository.ts (mirrors the existing `listSubmissionsByStatusOlderThan` pattern, no status filter).

715/715 tests pass (+6 for the diff logic). Bundle gzip 4107 KiB (+9 KiB for new route + helper). Post-deploy verification: trigger a `0 */6 * * *` cron via CF dashboard, watch `wrangler tail` for the route fire + `{ checked, skipped, patched, missing }` summary.

## PR strategy

**One PR at the end**, not three. The three items are small enough individually that three review cycles would be more overhead than value, and they share the same infrastructure context (the cron schedule wiring). If any item grows during implementation past ~150 LoC, reconsider — split it into its own PR and update this doc.

`/simplify` runs once at the end, against the cumulative diff. `/security-review` likewise. Per-item gates (typecheck/lint/test) run before each commit.

## Anti-criteria

- Do NOT touch `custom-worker.ts`'s Sentry wiring (PR #70 territory; works; out of scope).
- Do NOT add Studio admin UX (excluded above; separate session).
- Do NOT promote staging cron schedules during this branch — staging mirrors prod via `/api/sanity-sync`, so reconcile-on-staging is meaningless and would burn quotas.
- Do NOT change the cron secret model (still bearer-token); the `scheduled` handler just adds a second invocation path beside it.

## Backlog references

- Operational items: `www/docs/POST_LAUNCH_BACKLOG.md` → Infrastructure → "OpenNext `scheduled` handler dispatch", "Resend template IDs"
- ADR-001 reconcile: `www/docs/POST_LAUNCH_BACKLOG.md` → Persistence → "D1 → Sanity reconcile cron"
- Project status: `~/.claude/projects/-Users-maxgertzen-dev-projects-josephine-soul-readings/memory/project_booking_form_rebuild.md`
