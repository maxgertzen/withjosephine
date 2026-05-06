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
| 2 | D1 → Sanity reconcile cron | not started | `www/docs/POST_LAUNCH_BACKLOG.md` → Persistence (ADR-001) |
| 3 | Resend template IDs (extract inline HTML) | not started | `www/docs/POST_LAUNCH_BACKLOG.md` → Infrastructure |

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
