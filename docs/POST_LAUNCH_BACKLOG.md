# Post-Launch Backlog

Items deferred from the booking-form rebuild pre-push reviews (code review
2026-04-30, security review 2026-04-30). None of these block the initial
push; revisit after launch traffic stabilises.

Each item: where it came from + why it was deferred + a one-line action.

---

## Security

### GDPR sub-processor disclosure migrations — code ready, Max runs against Sanity

- **Source:** Audit performed 2026-05-11 on the live `legalPage-privacy` document + `siteSettings.consentBanner.body` (project CLAUDE.md soft-launch hold-gate item #7). Six disclosure gaps + 1 banner gap surfaced.
- **What landed in code (PR `feat/privacy-subprocessor-audit`, off main):**
  - `scripts/migrate-consent-banner-clarity.ts` — rewrites the consent banner body so it discloses Microsoft Clarity alongside Mixpanel. Refuses to overwrite if Becky has edited the body away from the seed copy.
  - `scripts/migrate-privacy-subprocessors-2026-05.ts` — bundled migration on `legalPage-privacy`. Seven operations, each independently idempotent: rewrite `priv-b8` (Payment info — amount/currency/billing country), rewrite `priv-b14` (Stripe — EU-US DPF + SCCs), remove `priv-b15` (Web3Forms — stale), rewrite `priv-b18` (Sanity — disclose intake/photo/voice/PDF storage), rewrite `priv-b19` (Cloudflare — Workers/D1/R2/Turnstile/Email Routing), insert `priv-resend-2026-05` (Resend — transactional + contact form), insert `priv-sentry-2026-05` (Sentry — error monitoring, PII scrubbed). `lastUpdated` only advances, never moves backwards.
- **Max-action — run order (staging first, then production for BOTH scripts):**
  1. `set -a && source .env.local && set +a && NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-privacy-subprocessors-2026-05.ts`
  2. Spot-check at `staging.withjosephine.com/privacy` that the seven changes landed and read correctly.
  3. `set -a && source .env.local && set +a && NEXT_PUBLIC_SANITY_DATASET=staging pnpm tsx scripts/migrate-consent-banner-clarity.ts`
  4. Spot-check at `staging.withjosephine.com` (force the banner via the Sanity Studio "hide banner in Studio preview" toggle if needed; or visit from an EU geo).
  5. Re-run BOTH scripts against staging once more to confirm the idempotency no-ops fire ("nothing to do" / "already up to date").
  6. Repeat steps 1+3 without the staging env override to apply against production.
  7. Verify on `withjosephine.com/privacy` + the live banner.
- **Why deferred:** Production Sanity writes are Max-actions per project convention (no AI-driven writes to legal-text artefacts).
- **Folds into:** Soft-launch hold-gate item #7 in project CLAUDE.md. Closes that item.

### S-3. WAF rate-limit rules
- **Source:** Security review.
- **What:** No per-IP throttling on `/api/booking`, `/api/contact`, or
  `/api/booking/upload-url`. Worst case is resource cost (Resend quota,
  R2 storage), not data theft.
- **Action:** Cloudflare dashboard → Security → WAF → Rate limiting rules.
  10 req/min/IP per route is generous for legitimate use. No code change.
- **Folds into:** Punch 6 (R2 CORS) — both are CF dashboard tasks.

### F-10. Verify Resend domain before first prod send
- **Source:** Security review.
- **What:** `src/lib/resend.ts` `FROM_ADDRESS` is `Josephine <hello@withjosephine.com>`.
  If the domain isn't verified in Resend (DKIM/SPF/DMARC published in CF DNS),
  every send returns 500.
- **Action:** Resend dashboard → Domains → confirm `withjosephine.com` verified.
  Send a test from the dashboard before opening the form to traffic.

### AI-bot accessibility policy — decide what we want indexed
- **Source:** Firewall events review 2026-05-06 (24h Security Events sample showed Claude-SearchBot blocked once on `/sitemap.xml`).
- **What:** A "Manage AI bots" managed rule is currently active and is blocking AI-search crawlers (Anthropic, presumably also OpenAI / Perplexity / Google AI Overviews indexers). Default-deny posture inherited from the WAF default; never explicitly chosen.
- **Decision needed (Max + Josephine):** Do we *want* the site indexed by AI-search? Trade-off:
  - **Allow**: organic discovery via "best akashic record reader" / "soul blueprint reading" prompts in ChatGPT/Claude/Perplexity. New top-of-funnel channel that didn't exist 2 years ago. Low cost — these bots are well-behaved and crawl rarely.
  - **Block (status quo)**: zero risk of AI tools quoting Josephine's voice/copy, training on practice descriptions, or surfacing prices/contact in summaries. Cleaner brand control. Loses the discovery channel.
  - **Hybrid**: allow `Claude-SearchBot` + `OAI-SearchBot` + `PerplexityBot` (search/citation, link-back) but keep blocking `GPTBot` / `Google-Extended` / `ClaudeBot` / `CCBot` (training crawlers, no link-back).
- **Action when decided:**
  - CF Dashboard → Security → WAF → Managed Rules → "AI bot management": flip from block-all to allow-list, OR
  - Add a custom rule with explicit UA allowlist for the chosen crawlers.
  - Update `robots.txt` to match (currently doesn't differentiate).
  - If allowing AI-search, verify `/sitemap.xml` returns 200 to those UAs (it currently 403s per the firewall log).
- **No deadline.** Optional. Worth ~30 min of conversation with Josephine before deciding — her brand voice is a real asset and she may have a strong opinion either way.

---

## Infrastructure

### Staging-tier provisioning runbook — DOCUMENTED 2026-05-07 in `feat/csp-nonce-and-audits`
- **Source:** `staging.withjosephine.com/book/soul-blueprint/intake` returned 404 for ~24h after the staging tier shipped (PR-S series). Root cause: Sanity `staging` dataset was created Private (default), and `sanityClient` is `useCdn:true` with no token, so customer-facing queries went unauthenticated → null → `notFound()`. Pages with static fallbacks (entry, letter) rendered fine and masked the issue. Fix was a one-toggle dashboard change (flip dataset visibility → Public).
- **Captured at:** [`docs/STAGING_RUNBOOK.md`](./STAGING_RUNBOOK.md). Provisioning checklist + the dataset-visibility gotcha + verification protocol (smoke the deepest page in a flow, not just the entry).
- **PAI memory:** `feedback_sanity_client_token.md` + `feedback_static_fallbacks_can_mask_outages.md`.
- **Action:** Reference the runbook when standing up the next non-prod env (dev?). No standalone code work.

### R2 backups bucket + Sanity Export token provisioning (Phase 3 prerequisite — Max-action)

- **Source:** Phase 3 backup cron PR (Sanity dataset NDJSON snapshot → R2). Cron + binding shipped behind a `SANITY_BACKUP_ENABLED` deploy flag so the code is ready in advance; provisioning is what flips it on.
- **What's required before flipping `SANITY_BACKUP_ENABLED=1`:**
  1. Create R2 bucket `josephine-backups` (production) and `josephine-backups-staging` (staging) via CF dashboard → R2 → Create bucket. Same account that hosts `withjosephine-booking-photos`.
  2. Attach lifecycle rules per bucket:
     - prefix `backups/weekly/` → expire after 90 days
     - prefix `backups/monthly/` → expire after 1095 days (3 years, matches reading-content retention)
  3. Apply R2 **Bucket Locks** per prefix (write-once immutable retention). Locks must MATCH the lifecycle expirations so a compromised API token can't shorten retention:
     - prefix `backups/weekly/` → retention 90 days, mode = Compliance
     - prefix `backups/monthly/` → retention 1095 days, mode = Compliance
  4. Create a distinct KMS key for the backups buckets (defence against primary R2 key compromise leaking cold copies). CF Dashboard → R2 → bucket → Settings → Encryption.
  5. Generate a Sanity **Viewer** API token at manage.sanity.io → Project → API → Add API token. Read-only scope, restricted to the production dataset. Repeat for staging.
  6. `pnpm wrangler secret put SANITY_EXPORT_TOKEN` against the production worker (and `--env staging` against staging) with the matching Viewer tokens.
  7. CF Dashboard → Workers → withjosephine (+ withjosephine-staging) → Settings → Variables → add public var `SANITY_BACKUP_ENABLED = 1`.
- **Verification:** manually trigger the cron after provisioning — `curl -H "Authorization: Bearer $CRON_SECRET" https://withjosephine.com/api/cron/backup-sanity-dataset`. Should return 200 JSON with `success: true`, non-zero `ndjsonBytes`, and `assetCount`. Then check R2 dashboard for `backups/weekly/<YYYY-Www>/dataset.ndjson` + assets subtree.
- **Why deferred:** R2 bucket creation, lifecycle, Bucket Locks, KMS, and Sanity token issuance are all CF/Sanity dashboard operations Max owns. Code ships gated; nothing depends on the cron firing until the flag is on.
- **Restore drill:** Annual, documented in Phase 4 PRD's compliance runbook (separate session). Not in scope here.

### Phase 3.5 — Sanity webhook → R2 mirror SHIPPED 2026-05-11 (code on `feat/listen-redesign-and-gifting`)

**Status:** Code-gated behind the existing `SANITY_BACKUP_ENABLED` flag (same flag as Phase 3 weekly cron). Route: `/api/sanity-backup-webhook`. Closes the voice-note + reading-PDF 7-day RPO gap to seconds. Council decision artefact retained below.

**Max-actions required BEFORE flipping `SANITY_BACKUP_ENABLED=1` (in addition to the Phase 3 provisioning checklist above):**

1. **Generate a strong shared secret** for the webhook HMAC. Suggestion: `openssl rand -hex 32`.
2. **Put the secret on both workers:**
   - `pnpm wrangler secret put SANITY_BACKUP_WEBHOOK_SECRET` (production)
   - `pnpm wrangler secret put SANITY_BACKUP_WEBHOOK_SECRET --env staging` (staging)
   - Use the SAME value on both workers if both staging + prod Sanity datasets should mirror their own R2 backup buckets.
3. **Configure the Sanity webhook(s)** at manage.sanity.io → Project → API → Webhooks → Add webhook:
   - **Production-dataset webhook:**
     - Name: `Production submission backup mirror`
     - URL: `https://withjosephine.com/api/sanity-backup-webhook`
     - Dataset: `production`
     - Trigger on: **Create + Update** (skip Delete — we don't remove backups when a doc is deleted)
     - Filter: `_type == "submission"`
     - Projection: `{ _id, _type, voiceNote, readingPdf }`
     - HTTP method: `POST`
     - Secret: paste the same value as the worker secret
   - **Staging-dataset webhook** (same shape, URL = `https://staging.withjosephine.com/api/sanity-backup-webhook`, dataset = `staging`).
4. **Verify** by uploading a test voice note to a draft submission in Studio. Within seconds: check Sentry has no captures, and R2 dashboard shows `backups/live/file-<hash>-mp3` in `josephine-backups`.

**Reliability posture.** Sanity webhooks are at-least-once with up to 5 retries over ~24h. If a webhook is silently dropped beyond retries, Phase 3's weekly cron picks the asset up at the next Monday run — that's the intentional safety-net layering. No separate orphan-reaper for `live/` (Phase 3 cron is the reconciler).

**Idempotency.** R2 key `backups/live/<assetId>` is content-addressed by Sanity asset `_id` (which includes content hash). HEAD-before-PUT check skips re-mirroring if the key exists. Duplicate webhook deliveries are safe.

---

#### Council decision artefact (4-vantage, 2026-05-11)

**Decision:** **A-NOW, B-decision deferred** with explicit trigger conditions. 3 vantages (Backend Architect, Cost Analyst, SRE) said A-NOW-B-LATER; the Practitioner-Ops vantage pushed back on B ever happening — Becky-continuity + custom-uploader-as-vendor-risk are real concerns. **Re-evaluate B against those when a trigger fires, don't auto-flip.**

**The gap (now closed by Phase 3.5 shipped).** Phase 3 weekly cron protects submission TEXT data adequately (D1 source of truth + reconcile-mirror + R2 backup = 4 layers). Binary files were the 7-day-RPO hole — Phase 3.5 closes that.

**Triggers to revisit Option B (Becky-uploads-directly-to-R2 instead of Sanity):**
- Becky sustains ≥50 readings/month — at that volume Sanity Asset bill crosses $13/mo and R2-as-primary pays back in ~11 months. Re-platform cost from A→B is ~16h (R2 plumbing already exists), not the full 24h of a cold B.
- Sanity has any binary-asset incident.
- A forced Sanity Studio refactor lands for unrelated reasons (SDK upgrade breaks Phase 2 dashboard) — bundle B into that session.
- At any of these, run a fresh decision against the Practitioner-Ops concern (Becky-continuity + custom-uploader-as-new-vendor-risk) before committing to B.

**Out of scope (explicit rejections):** daily-cron-instead-of-weekly (event-driven webhook is a superior RPO win at similar cost) and Google Sheets as third-store (doesn't solve the binary-asset gap; submission text is already protected three ways).

### Phase 3.5 webhook backup — security follow-ups (Pentester deferrals)

Pentester gate on the Phase 3.5 PR (verdict GO, MEDIUM-1 fixed in-PR). Two items deferred to backlog:

- **LOW-1: `@sanity/webhook` `isValidSignature` uses plain `!==` not constant-time.** Both `/api/sanity-sync` (existing) and `/api/sanity-backup-webhook` (new) inherit this from the upstream library. Real-world exploitability on Workers is very low (cold-start jitter + regional routing + per-request CPU variability dominate any byte-level timing signal), and the cost of forking the library is high. Mirrors the Phase 1 listen-route HIGH-1 timing-oracle precedent. **Trigger to fix:** when upstream `@sanity/webhook` ships a release using `crypto.subtle.timingSafeEqual` or equivalent — bump the dep and re-verify.
- **LOW-2: No per-route rate-limiting on `/api/sanity-backup-webhook`** (or `/api/sanity-sync`). Attacker without HMAC secret can't reach the expensive path (body-size pre-check from MEDIUM-1 also blocks them at the door). Attacker WITH the secret is a confused-deputy — rate-limiting is the wrong control. **Trigger to add:** Workers analytics shows >60 rpm unauthenticated → wire a `WEBHOOK_LIMITER` rate-limit binding scoped to client IP, evaluated before HMAC verification.

### Phase 3 backup cron — security follow-ups (Pentester deferrals)

Pentester gate on the Phase 3 PR (verdict GO, MEDIUM-1 fixed in-PR). Three items deferred to backlog:

- **MED-2: Bound NDJSON line length + per-`uploadPart` timeout.** `extractAssetRefs` accumulates `pending` until a `\n` is found — a single multi-MB JSON line (e.g. future Portable Text body on a submission) would buffer entirely in Worker memory. Mitigation: reject lines > ~5 MiB. Separately, `streamToR2Multipart`'s `uploadPart` has no timeout — a hung upload would burn the 15-min scheduled wall clock. Wrap with a timeout race. Trigger: file once submission docs gain Portable Text bodies, OR after the first cron run that takes >5 min wall-clock.
- **LOW-3: Document last-writer-wins semantics + Bucket-Lock-mode interaction.** Two concurrent backup invocations (manual curl + scheduled trigger) on the same period produce two `createMultipartUpload` flows, both `complete()`ing the same key — last writer overwrites. Once Bucket Locks ship (Max-action), the mode choice (Compliance vs Governance) determines whether the second `complete()` is rejected. Recommendation: Governance mode so "fresh-snapshot-wins" semantics are preserved for retries. Document in the Max-action provisioning entry above.
- **LOW-4: Extend `scrubSensitiveRequestData` in `custom-worker.ts` to scrub `event.extra.ref.key`** on the backup-cron Sentry-capture path. The asset ref includes a sanitized customer-supplied filename which is a marginal PII surface in admin-only Sentry. Same posture as the existing listen-page URL scrub. Two-line change.

### Phase 3 backup cron — `extractAssetRefs` line-splitter O(N²) on long records
- **Source:** /simplify Efficiency reviewer on Phase 3 PR (EFF-6).
- **What:** `src/lib/backup/ndjsonAssets.ts` builds the in-flight string buffer via `pending += decoder.decode(...)` and repeatedly `pending.slice(newlineIdx + 1)` after each line. For a Sanity export where one doc emits a ≥100 KB line (e.g. large Portable Text or embedded images in a future doc-type), the per-line tail-realloc cost is quadratic. At soft-launch (~10 KB total NDJSON) it's irrelevant.
- **Action:** Switch the line walk to an offset-based scan, OR pipe through `TextDecoderStream` + a `TransformStream` that splits on `\n` natively. ~10 lines.
- **Trigger:** filing now so the line is in view; defer execution until either (a) cron `durationMs` for the dataset-NDJSON walk crosses ~1s, or (b) any submission doc lands a multi-KB Portable Text body in Sanity. Neither is true today.

### Phase 3 backup cron — tee Sanity export stream to skip the R2 re-read
- **Source:** /simplify Efficiency reviewer on Phase 3 PR (EFF-1).
- **What:** Today the cron streams Sanity export → R2 multipart, then does a separate `bucket.get(ndjsonKey)` to walk asset refs. Reviewer suggested `body.tee()` to split the source stream into two consumers in parallel. Deferred because tee'd ReadableStreams in the Streams spec queue unbounded for the slower consumer — if R2 upload throughput lags Sanity download (likely at projected scale), the JS-side queue can exceed Workers' 128 MiB request-memory ceiling. The current re-read is memory-bounded; the R2 GET round-trip costs ~$0.0004 per backup (Class B op, negligible).
- **Action:** If R2 GET cost or cron wall-clock duration ever becomes the bottleneck, revisit with bounded backpressure (e.g. a `TransformStream` with a small `highWaterMark` on the slow branch) instead of naive `tee()`.

### Dead `NEXT_PUBLIC_WEB3FORMS_KEY` GH secret (Max-action only)
- **What:** Set as a GH SECRET pre-launch when contact-form was on web3forms; web3forms was replaced by Resend, source code has zero references today (verified via grep). Pure dead config.
- **Action (Max):** `gh secret delete NEXT_PUBLIC_WEB3FORMS_KEY` at the repo level. No code change.

### `/api/booking/upload-url` architectural alternative
- **Source:** Code review (S-4 long-term fix).
- **What:** Current design: Turnstile-gated upload-url + R2 ContentLength
  signing + orphan-reaper cron. The "right" fix the reviewer suggested
  long-term is to gate uploads on an already-validated submission ID
  (i.e. `/api/booking/init` → `pendingId`, then upload-url requires it).
  Today's three layers cover the abuse surface adequately.
- **Action:** Revisit if upload abuse becomes a real signal.

### Launch smoke test plan — single source of truth

Stage-by-stage smoke tests (A = run NOW; B = before main-merge with staging secrets set; C = after main-merge on production; D = operational, separate from launch) live in **[`docs/LAUNCH_SMOKE_TEST_PLAN.md`](./LAUNCH_SMOKE_TEST_PLAN.md)**. The file is the authoritative checklist for "what still needs to be verified" before the production go-live and is referenced from the soft-launch hold gate in the project root `CLAUDE.md`.

### Phase 5 Session 1a — server-side scaffold UNCOMMITTED on `feat/listen-redesign-and-gifting` (2026-05-12)

**Status:** 14/41 ISC of Phase 5 verified on the working tree. Schema + route + Stripe webhook gift branch + Alice's `GiftPurchaseConfirmation` Resend template + Sanity doctype + Sanity mirror passthrough + Studio submission gift fields — **all in the working tree, NOT committed yet**. Lint + typecheck + build + tests green (1115/1116, same pre-existing flake). PRD: `www/MEMORY/WORK/20260509-202915_phase5-gifting/PRD.md` (`phase: complete`, `progress: 14/41`).

**Mid-session scope growth:** PRD grew from 36 → 41 ISC after `gift_delivery_method` dimension added. Purchaser picks `self_send` (we email Alice a shareable URL at webhook time, she forwards manually) or `scheduled` (cron sends the claim email at Alice's chosen date+time — Session 2 work). Both modes use the same `gift_claim_email_fired_at` column for the 3-tier refund cliff gate.

**Next-session prerequisite (do this BEFORE Session 1b UI work):** Session 1b is a FRESH quality-gate session with PM + UX expert + UI designer per Max's explicit instruction (2026-05-12). Resume prompt + 8 pre-scaffold journey questions at `www/MEMORY/WORK/20260509-202915_phase5-gifting/SESSION_1B_PROMPT.md`. /simplify + Pentester deferred to that session.

**Commit-shape recommendation:** two commits before pushing — Session 1a (server-side) then Session 1b (UI). Migration `0007_gifting.sql` runs alongside main-merge per existing cadence.

**Sanity studio post-deploy:** when Sanity Studio publishes, `emailGiftPurchaseConfirmation` will appear as a new singleton under "✉️ Customer emails & pages". Becky can edit subject/preview/hero/detail/refund copy per delivery-mode variant. Defaults in `src/data/defaults.ts` → `EMAIL_GIFT_PURCHASE_CONFIRMATION_DEFAULTS` are draft brand-voice placeholders that the Session 1b quality-gate locks down with Becky.

### Phase 5 Session 1b — `/simplify` deferred follow-ups (2026-05-12)

After the 3-agent `/simplify` sweep on the Session 1b + redemption-flow diff. High-leverage refactors deferred to keep this iteration small + reviewable. Capture-not-bury per Max's explicit instruction.

- **Extract shared booking-route helpers** — `lookupLabel`, `stringifyValue`, `buildResponses`, body honeypot/consent/turnstile guards, schema-build + safe-parse + fieldError reducer. All ~100 lines duplicated verbatim between `src/app/api/booking/route.ts` and `src/app/api/booking/gift-redeem/route.ts`. Target: a single `src/lib/booking/responseBuilder.ts` (pure helpers) + `src/lib/booking/validateBookingRequest.ts` (async guard returning a discriminated `{ ok: true, fields, validatedValues, ip, reading, bookingForm } | { ok: false, response }`). Routes shrink to ~60 lines each. Trigger: next time either route changes.
- **Replace `GiftForm.tsx` hand-rolled fields with `Form/*` components** — currently 475 lines; lots of repeated `<label className=… htmlFor=…><input className=…>`. `Form/Input`, `Form/Textarea`, `Form/Checkbox`, `Form/FieldShell`, `Form/DatePicker` already exist and are used by IntakeForm. Expected: ~150 line reduction + visual consistency. The `<input type="datetime-local">` for the send-at picker is the loudest mismatch — should use `Form/DatePicker` + `Form/TimePicker` per the brand-driven-no-native-controls rule (`feedback_no_native_browser_dialogs.md` analog).
- **Lift IntakeForm `mode === "redeem"` branch to caller via `onSubmit` callback prop** — currently the form carries both create and redeem submit paths internally with parallel-but-different success handling. Cleaner shape: `IntakeForm` takes `onSubmit: (payload) => Promise<{redirectUrl: string}>`; the entry page passes the Stripe-going version, `gift/intake/page.tsx` passes the redeem version. Decouples a 600-line form from two concerns it shouldn't own. Trigger: next time IntakeForm gets another mode/branch.
- **Share `GiftDeliveryMethod` type across files** — `"self_send" | "scheduled"` is declared inline in `gift/route.ts` and `GiftForm.tsx`, plus exported from `repository.ts`. Add a `GIFT_DELIVERY_METHODS = { SELF_SEND: "self_send", SCHEDULED: "scheduled" } as const` alongside the existing exported type and reuse the constants in radio `value=` strings + comparisons. Same rule for the `mode: "create" | "redeem"` literal on IntakeForm.

### Phase 5 — Session 2 — SHIPPED 2026-05-12 (Durable Object alarm, NOT cron)

Architecture pivoted at session start: Max picked Durable Object alarms over the locked hourly polling cron. Trade-off: precision at the exact `gift_send_at` timestamp vs ~30-60 min of extra build (DO migration + class + alarm wiring + tests). Shipped surfaces:

- `src/lib/durable-objects/GiftClaimScheduler.ts` — per-gift DO, keyed `idFromName(submissionId)`. `fetch("/schedule")` persists submissionId + sets alarm at fireAtMs; `alarm()` POSTs the internal dispatch route, increments retryCount, reschedules (+7d) or clears storage.
- `src/lib/booking/giftClaimDispatch.ts` — pure async dispatcher with all branch logic (`first_send`, `reminder`, `stop: claimed | cancelled | abandoned | max_retries | missing | not_scheduled`).
- `src/app/api/internal/gift-claim-dispatch/route.ts` — admin route the DO posts to (shared `x-do-secret` gate via `_lib/headerSecretAuth.ts`).
- `src/app/api/internal/gift-claim-regenerate/route.ts` + `scripts/regenerate-gift-claim.ts` — admin recovery primitive when a customer writes in saying they lost their link. Issues a fresh token (invalidating prior URL), emails the right party per delivery method. Send-first-then-persist to preserve the prior token on Resend failures.
- `src/lib/emails/GiftClaimEmail.tsx` + `studio/schemas/emailGiftClaim.ts` — two-variant template: `first_send` (with CTA + URL) and `reminder` (no URL, "check your inbox or write to us") — preserves the "no token regen on retry" constraint without storing raw tokens.
- Stripe webhook `scheduled`-mode branch parallelises `dispatchGiftPurchaseConfirmation` + `scheduleGiftClaimAlarm` via `Promise.all`.
- New secret: `DO_DISPATCH_SECRET` (worker secret on prod + staging; documented in wrangler.jsonc).

**Deferred to Session 4 or later (filed here):**

- **MED — Out-of-isolate HTTP hop on alarm fire.** DO's `alarm()` does `fetch("https://origin/api/internal/gift-claim-dispatch")` — a public-edge round-trip per fire. Mitigation: add a `services` binding to the worker (so `env.SELF.fetch(...)` works in-isolate) and replace the public fetch. ~20 min change. Trigger: 100+ scheduled gifts/month sustained OR observable alarm-latency tail.
- **LOW — Regenerate route has no per-submission rate-limit.** Secret-gated, so operator-only. A "clumsy operator" running the CLI in a loop can issue infinite fresh tokens. Track `gift_claim_regenerate_count` or refuse if last regenerate < 5 minutes ago. Trigger: any operator incident, or Session 3 surfaces a self-service "resend my link" path that needs the same throttle.
- **INFO — Purchaser-controlled `{tag}` substitution.** If a purchaser types `{recipientName}` literally as their first name, it gets substituted into copy. No XSS (React text-escape), purely visual confusion. Strip `{…}` from the input field on form submit OR sanitise in `template()`. Trigger: any user report.
- **REUSE — `sendAndRecord` helper.** Pattern "send via Resend, append `emails_fired_json` only when `resendId !== null`" recurs in 5+ places (`giftClaimDispatch` × 2 branches, regenerate route, day-7-deliver cron, applyPaidEvent). Webhook gift branch has the inverse pattern (unconditional append — preserves attempt log including dry-run; may or may not be intentional). Worth extracting once the right semantic per call site is locked.
- **REUSE — `EmailShell` for `GiftClaimEmail` + `GiftPurchaseConfirmation` + `OrderConfirmation`.** All three reimplement the Html/Head/Preview/Tailwind/Body/Container frame inline. Half the email suite already uses `EmailShell`. The gift family is just inconsistent. Risk: snapshot-test fallout. Defer until a Session 4 + UX review can audit visual diff at the same time.

### Phase 5 — Session 3 — SHIPPED 2026-05-12 (PR #107, squash `4b790e6`)

Purchaser self-service surface (`/my-gifts`) + 3 mutation routes (`edit-recipient`, `cancel-auto-send`, `resend-link`) + DO `/cancel` endpoint. Magic-link `listenSession` reused for purchaser scope (authorized via `purchaser_user_id`). See `www/MEMORY/WORK/20260512-130515_phase5-session-3-my-gifts/PRD.md` for the 61 atomic ISC + /simplify + Pentester verification blocks. 1248 / 1248 tests green; no new secrets, no D1 migration.

### Phase 5 — Session 4b — SHIPPED 2026-05-12 (PR #109, squash `0ad4bb2` on `feat/listen-redesign-and-gifting`)

Stripe live-mode blocker sweep + every new Pentester finding + every Session-3 corroborated Pentester deferral. Self-review audit (`SELF_REVIEW.md`) walked Session 4 ship-claims vs reality; 18/25 ✅, 5 partial, 2 missed → 13 GAPs surfaced. Of those: GAPs 1, 2, 4, 5, 6, 7, 12 SHIPPED inline; GAPs 8, 9, 13 absorbed by other tranches; GAPs 3, 10, 11 deferred (3 = T7 carry-over copy work; 10, 11 = production-signal-required, see below).

**Shipped (T1–T3 of the original Session 4b plan):**
- ✅ **LB-3 anti-abuse cap claim-time re-check** (commit `88a7043`) — closes self_send mode bypass
- ✅ **LB-4 GDPR Art. 17 cascade purchaser walk** (commit `7ada206`) — pseudonymise-vs-delete branching for purchaser-owned gifts
- ✅ **LB-6 + GAP-1/2/12 GiftForm + GiftCardActions a11y bundle** (commit `c4e41fc`) — WCAG 3.3.1 + 4.1.2
- ✅ **B5.14–B5.19 + B7.26** (commits `29b7e71`, `8c0f690`) — every new Session-4 Pentester finding: idempotency, prefilled_email drop, constant-time tokens, regenerate cooldown, metadata canary, logging discipline, {tag} sanitisation
- ✅ **B6.20–B6.23** (commits `0c8a854`, `579a7d6`, `c3a9dc3`, `8c0f690`) — every Session-3 corroborated Pentester deferral: resend-link TOCTOU atomic lock, cancel-auto-send atomic-flip-first, GiftCardData narrow projection, 401/404 timing parity
- ✅ **Audit-surfaced GAPs 4, 5, 6, 7** (commits `486e87e`, prior `88a7043`) — ZWSP JSDoc, MAX_EMAIL_CHARS hoist, purchaserEmail length cap (Pentester LOW-3 parity miss), booking-route email handling
- ✅ **Ship-as-decision: B8.29 IntakeForm mode prop + B8.33 isDefaultNext helper** (commit `ef78869`) — inline JSDoc replaces a "defer-with-trigger" entry

**Tests: 1272 → 1304** (32 new). Typecheck + lint + build + CI all green at merge.

**Migration:** `0009_gift_resend_lock.sql` (additive: adds `gift_resend_lock_until INTEGER` column to `submissions`).
- ✅ Applied to **staging** D1 2026-05-12 (alongside catch-up of 0005–0008 which were also pending on staging).
- ⏸ **NOT applied to production** — production main is at PR #89, which doesn't use any of these columns. Production migration is gated on the eventual `feat/listen-redesign-and-gifting` → `main` merge.

**Carry-over** (T4–T8 sections below) ships in Session 5 directly on `feat/listen-redesign-and-gifting` BEFORE main-merge per Max's directive. Pre-launch, NOT post-launch polish.

### Phase 5 — Session 6 — Pentester LOW deferrals (post-launch with explicit triggers)

Pentester re-audit on the Session 5+6 combined diff (2026-05-12, HEAD `5f0c96a`) returned **CONDITIONAL GO**. M-1 (admin apex allowlist) + M-2 (regenerate TOCTOU lock) shipped in-PR (commit `5f0c96a`). Two LOW findings deferred:

- **L-1 — No success audit for admin regenerate.** `cascadeDeleteUser` writes its own `performedBy: "studio-admin"` audit; `regenerateGiftClaim` writes only the `gift_claim_regenerate` email_fired entry (no operator-identity capture). **Trigger to revisit:** first post-launch incident where the team needs to reconstruct "who pressed regenerate at <time>". Fix: add `writeAudit({ eventType: "admin_action", success: true, ... })` after the `ok` branch in `regenerateGiftClaim`; include `submissionId` for searchability.
- **L-2 — Analytics double-count on regenerate.** Successful regenerate appends BOTH `gift_claim` (via `sendAndRecord`) AND `gift_claim_regenerate` (explicit append) to `emails_fired_json`. Any cohort walk counting `gift_claim` events sees regenerations as first-sends. **Trigger to revisit:** first analytics dashboard / cohort study that walks `gift_claim` event counts. Fix: either pass a discriminator into `sendAndRecord` so the regenerate path appends ONLY `gift_claim_regenerate`, OR teach the cooldown walk to consider both types.

### Phase 5 — Session 5 — SHIPPED 2026-05-12 (`feat/listen-redesign-and-gifting`, commits `f7a08ec` through `123097d`)

Pre-launch completion sweep. T4–T8 carry-over from Session 4b + audit GAPs 8/9/10/11 closed; T6.28-30 (thank-you self_send claimUrl) the lone deferred-with-trigger entry (architecture-cost rationale, production-signal trigger). Stripe live-mode flip cleared of all the pre-launch quality gates this session covered.

**Shipped (10 commits, 1304 → 1313 tests):**

- ✅ **T4 (`f7a08ec`)** — `env.SELF` service binding in `GiftClaimScheduler.alarm()` replaces the public-edge HTTPS round-trip with in-isolate fetch. `wrangler.jsonc` `services` block added for both prod (`withjosephine`) + staging (`withjosephine-staging`). `Fetcher` type shimmed at `src/types/cloudflare-workers.d.ts` (codebase deliberately avoids `@cloudflare/workers-types`). Fallback to `globalThis.fetch` preserved for unit-test contexts that don't stub `env.SELF`. New DO test asserts `env.SELF.fetch` invocation when bound.
- ✅ **T5 (`738f31f`)** — `src/lib/http/jsonPost.ts` typed POST helper (6 unit tests cover 200/422/429/non-2xx/network/no-body). `src/lib/hooks/useMutationAction.ts` hook tracks per-endpoint submitting + topError + fieldErrors. `src/components/Form/InlineError.tsx` role=alert message. `GiftCardActions` 3 mutation controls consume all three. `/api/booking/gift` carve-out documented inline (its 422 is anti-abuse-cap object-shaped, not field-array). **Server Actions migration** (B4.13) shipped as `useMutationAction` adoption instead — OpenNext 1.19.4 + workerd has fragile server-action manifest handling adjacent to the documented `outputFileTracingExcludes` workStore bug; revisit on next OpenNext release noting stable Server Actions on Cloudflare Workers.
- ✅ **T6 part 1 (`52f73c7`)** — Vellum article framing on `/book/[readingId]/gift` (wraps GiftForm) + `/gift/claim` (no-token and already-claimed branches, both via new `VellumShell`). `/gift/claim` gains `BookingFlowHeader`, `StarField`, `CelestialOrb` (PAGE_ORBS), `GoldDivider`. Two new Sanity singleton doctypes — `giftClaimPage` (6 fields) + `giftIntakePage` (6 fields, supports `{readingName}` token substitution). Registered in `studio/schemas/index.ts` + `deskStructure` under "✉️ Customer emails & pages". Fetch helpers + GROQ queries + type defs + `GIFT_CLAIM_PAGE_DEFAULTS` / `GIFT_INTAKE_PAGE_DEFAULTS`. Migration `scripts/migrate-gift-pages-2026-05.ts` ran against staging (2 created, 0 skipped); production deferred to main-merge.
- ✅ **T6 part 2 (`5e6368c`)** — GiftForm validation strings to Sanity (10 new fields on `bookingGiftForm` doctype under new "Submit + errors" group: 5 field-required, 3 top-level error variants, 1 generic, 1 network + 1 timezone-hint template). `TimezonePreview` rendered below the GiftForm send-at picker; `EditSendAtTimezonePreview` rendered below GiftCardActions drawer's send-at input — both use `Intl.DateTimeFormat(undefined, …)` for the browser's resolved zone. Resend-link control receives a precomputed `resendVerdict` via `GiftCardData` (avoids leaking raw `emailsFired`); CTA disables + inline message renders `nextAvailableAt` formatted in TZ. Migration `scripts/migrate-gift-form-validation-2026-05.ts` (setIfMissing idempotent; staging is no-op until the singleton bootstraps).
- ✅ **T7 (`163f124`)** — `/my-gifts` action surface copy extraction. 14 new fields on `myGiftsPage` doctype covering drawer headings + field labels + Save/Saving/Cancel buttons + 2-stage confirm copy + Sending/Throttled + 3 action-error variants (generic/network/closed). `GiftCardActions` reads every in-button label + error variant from `copy.*`. Closes Session 4 self-review **GAP-3** (the 3 in-button loading labels that were flagged inconsistent with Becky-editable-everywhere posture). Migration `scripts/migrate-my-gifts-actions-copy.ts` (setIfMissing; staging is no-op until singleton bootstraps).
- ✅ **T8 (`fc7a5a4`)** — `src/lib/booking/sendAndRecord.ts` helper captures the "Resend send → if resendId, appendEmailFired" pattern. **5 call-site adoptions:** giftClaimDispatch first_send (preserves `markGiftClaimSent` ordering via the new `appended` flag) + giftClaimDispatch reminder + gift-claim-regenerate route (keeps the separate `gift_claim_regenerate` audit entry) + email-day-7-deliver cron + email-day-2 cron. `applyPaidEvent` webhook gift-branch carve-out preserved (B5.14 sentinel pre-append-then-update; documented in helper JSDoc). `GIFT_DELIVERY = {selfSend, scheduled} as const` + `GiftDeliveryMethod` type exported from booking/constants.ts.
- ✅ **T9 (`123097d`)** — Audit GAPs 8/9/10/11. **GAP-8/9:** 7-line JSDoc comment on the GiftCardActions 422 test explains the `fireEvent.submit(form)` vs click choice (jsdom + testing-library quirks); grep confirms no other site has silent-no-op patterns. **GAP-10 — partial-intake recovery for gift recipients:** IntakeForm autosave now keyed by `draftScope` — `gift-redeem.<submissionId>` in redeem mode, else `readingId`. localStorage cross-submission isolation + restore-on-mount + clear-on-redeem + 72h TTL all work for gift recipients now. 2 new tests cover the scoping isolation + restore-from-localStorage. **GAP-11:** 8 Becky-friendly Studio description rewrites across `emailGiftClaim` (4) + `emailGiftPurchaseConfirmation` (4); each rewrite explains WHEN/WHY the field renders + which downstream surfaces it appears on, replacing the bare `Use {token}` engineer notes.

**Sanity migrations queued for production main-merge:**
- `scripts/migrate-gift-pages-2026-05.ts` — creates `giftClaimPage` + `giftIntakePage` singletons.
- `scripts/migrate-gift-form-validation-2026-05.ts` — adds 10 validation/timezone fields to `bookingGiftForm`.
- `scripts/migrate-my-gifts-actions-copy.ts` — adds 14 action-copy fields to `myGiftsPage`.
- All three are `setIfMissing` idempotent + safe to re-run.

**Honest deferrals (in-PR, production-signal-required):**

- **T6.28-30 — thank-you self_send claimUrl.** Showing the raw claim URL on `/thank-you/[id]?gift=1` for self_send mode requires raw-token persistence (weakens hash-only security model + creates refresh-breaks-URL UX) OR remint-on-visit (every page refresh invalidates the email link). Email path already delivers the URL within ~1s; `/my-gifts` provides full self-service. **Production-signal trigger:** first purchaser support request asking where the link is, OR analytics showing self_send purchasers landing on thank-you but not claiming within 1 hour at >5% rate.
- **T8.7-10 — EmailShell consolidation across GiftClaimEmail / GiftPurchaseConfirmation / OrderConfirmation.** The 3 templates carry bespoke Container styling (cream cards, 600px width, dedicated padding) that EmailShell's generic 560px Container doesn't fit. Genuine refactor needs EmailShell extended with a bare-body content-projection prop. **Revisit trigger:** next email template change (add a 4th template OR substantive copy/visual revision to one of these 3).
- **T8.11-14 — GiftForm → `Form/*` primitives.** 8 hand-rolled `<label>+<input>` blocks. Replacing each with `Form/Input` etc. is a substantial UI refactor + snapshot rewrite. Forms tests passing; visual + a11y already addressed in Session 4b. **Revisit trigger:** next gift-form schema change (add/remove field) is the natural point to migrate that field + its neighbors.
- **T8.15-17 — `AuthGatedPage` chrome extraction.** SignInCard + CheckYourEmailCard duplicated between MyGiftsView + MyReadingsView. **Revisit trigger:** third consumer added or substantive copy divergence between the two.
- **T8.19-20 — GIFT_DELIVERY const sweep across ~20 production sites.** Const + type exported; new sites get it for free. Bulk replacement is mechanical low-value because literals are already type-checked against `SubmissionRecord.giftDeliveryMethod`. **Revisit trigger:** introduction of a 3rd delivery method OR Pentester finding on type-safety here.
- **T8.21 — `regenerateGiftClaim` Studio document action — RE-PROMOTED to Session 6 pre-launch.** Becky has no CLI access; today the recovery flow is customer → Becky → Max runs `scripts/regenerate-gift-claim.ts` from his terminal, making Max a single-point-of-failure for support. Studio action ships pre-launch. Sibling actions `editGiftRecipient` (purchasers self-serve via `/my-gifts`) and `markBounced` (should be Resend-webhook-automated, not manual) stay deferred — neither has a real Becky workflow today.

### Phase 5 — Session 3 — deferred follow-ups (status after Session 4 review)

- ✅ **MEDIUM-1 — `/api/gifts/[id]/resend-link` rate-limit TOCTOU.** **SHIPPED in Session 4b** (PR #109, commit `0c8a854`). New `gift_resend_lock_until` column (migration `0009_gift_resend_lock.sql`); `acquireGiftResendLock` / `releaseGiftResendLock` repo helpers; route uses try/finally with 60s TTL lock. Concurrent-request race test green.
- ✅ **LOW-1 — `cancel-auto-send` pre-cancel alarm race.** **SHIPPED in Session 4b** (PR #109, commit `579a7d6`). Atomic-flip-first redesign: conditional D1 UPDATE with placeholder hash WHERE `gift_claim_email_fired_at IS NULL` (0 rows → 409); cancel DO alarm (idempotent); issue fresh token; send purchaser self-send-confirmation email; final UPDATE swaps placeholder for real hash. Closes the millisecond race.
- ✅ **LOW-2 — `edit-recipient` own-email check plus-aliasing + Unicode bypass.** **SHIPPED in Session 4** (PR `feat/phase-5-session-4-review`). New `ownEmailKey()` helper in `src/lib/booking/emailNormalize.ts` does NFKC + plus-strip; used in both `gift/route.ts` purchaser-vs-recipient check AND `edit-recipient/route.ts`. Unit tests at `src/lib/booking/__tests__/emailNormalize.test.ts`. Route tests cover the bypass case in both routes.
- ✅ **LOW-3 — `recipientEmail` length cap missing.** **SHIPPED in Session 4**. `MAX_EMAIL_CHARS = 254` (RFC 5321) added to `gift/route.ts` + `edit-recipient/route.ts`. Test coverage in both route test files. (Session 4b GAP-6 extended this to `purchaserEmail` too, closing the audit-surfaced Pentester miss.)
- ✅ **LOW-4 — `listGiftsByPurchaserUserId` returns `SELECT *` to a Server Component.** **SHIPPED in Session 4b** (PR #109, commit `c3a9dc3`). New `GiftCardData` narrow projection — only the columns `/my-gifts` page actually renders. No purchaser email / financial fields serialized to the client component.
- ✅ **INFO-1 — 401 vs 404 timing differential.** **SHIPPED in Session 4b** (PR #109, commit `8c0f690`). `authorizeGiftPurchaser` performs a no-op `findSubmissionById('<placeholder>')` on the 401 path to match 404 timing.

**UX nits surfaced after staging deploy (2026-05-12, Max) — Session 4 dispositions:**
- ✅ **Footer touches last gift card on `/my-gifts`** — **SHIPPED in Session 4** (M-1). Footer lifted out of `<main>` in `MyGiftsView.tsx` with explicit `mt-12` breathing room.
- ✅ **Action buttons need in-button loading state** — **SHIPPED in Session 4** as part of LB-1 fix (see below). New client component `src/app/my-gifts/GiftCardActions.tsx` replaces the broken `ActionForm`; each action surfaces local pending state via React state hooks.

**Reuse / Quality deferrals** (Session 4 dispositions, updated after Session 4b):
- ~~Shared `<AuthGatedPage>` page-chrome~~ — **Still deferred (Session 4b T8 carry-over)**; **trigger**: any third auth-gated dashboard added.
- ~~`GIFT_DELIVERY` constants object~~ — **Still deferred (Session 4b T8 carry-over)**; **trigger**: any new gift-delivery-method enum value added.
- ✅ **`isDefaultNext(path)` helper** — **SHIPPED-AS-DECISION in Session 4b** (PR #109, commit `ef78869`). Inline documentation explains the simpler-shape-today rationale + the explicit re-trigger ("third call-site duplicating the literal").
- ~~Sanity Studio document actions on submission doctype (Becky-facing)~~ — **Still deferred (Session 4b T8 carry-over)**; **trigger**: Becky requests Studio buttons in lieu of CLI scripts.

### Phase 5 — Session 4 — SHIPPED 2026-05-12 (PR `feat/phase-5-session-4-review`)

Multi-agent council review (PM + UX + UI Designer + Copywriter + QA + Pentester) against the FINAL shipped surface of Sessions 1a/1b/2/3. Surfaced 4 NEW launch-blockers beyond the known deferral list — all critical bugs shipped in this PR; visual/architectural polish deferred with explicit triggers below.

**Shipped fixes:**

- ✅ **LB-1 — `/my-gifts` action buttons functionally broken.** Council finding: `ActionForm` in `MyGiftsView.tsx:122-130` rendered `<form method="POST" action={endpoint}>` against JSON-only routes. Result: `edit-recipient` returned 400 immediately on empty form-encoded body; `cancel-auto-send` + `resend-link` succeeded but navigated the browser to a raw JSON page (worse: cancel-auto-send fired a real Resend email + irreversibly flipped state on a single click with no confirmation). **Fix:** new `src/app/my-gifts/GiftCardActions.tsx` "use client" component using `fetch()` with JSON body for each action; in-button loading state via local `submitting` state; `cancel-auto-send` requires 2-stage tap-to-confirm (no native dialog per brand rule); `edit-recipient` opens an inline drawer with `recipientName`/`recipientEmail`/`giftSendAt` fields pre-filled; on success `useRouter().refresh()` re-renders the server-side list. Test coverage: `src/app/my-gifts/__tests__/GiftCardActions.test.tsx` (6 tests).
- ✅ **LB-2 — `GiftPurchaseConfirmation.refundLine` promised a refund that contradicted the locked non-refundable policy.** Council Copywriter caught the content contradiction; QA verified both variants ship the same copy. **Fix:** `defaults.ts:418-419` updated to "Gifts are non-refundable once payment is complete. Until {recipientName} opens their link, you can change their name, email, or send date from your gifts page at withjosephine.com/my-gifts." — points at the `/my-gifts` self-service surface (which IS the management surface; Max question 2026-05-12 caught the original "write to me" framing being inconsistent with Session 3's shipped functionality). Regression test asserts: no "arrange a full refund" substring + non-refundable phrase present + `withjosephine.com/my-gifts` URL present, in both variants. Sanity migration script `scripts/migrate-gift-copy-2026-05.ts` updates both staging + production datasets.
- ✅ **LB-5 — `/api/internal/gift-claim-dispatch` not in apex allowlist.** Pentester finding: DO `alarm()` POSTs to `${origin}/api/internal/gift-claim-dispatch`; during soft-launch (`under_construction` flag), middleware would rewrite to `/` → DO logs "non-JSON" → scheduled gifts silently fail. **Fix:** `/api/internal/` prefix added to `APEX_ALLOWLIST_PREFIXES`; covers both dispatch AND regenerate routes. Middleware test added in `src/__tests__/middleware.test.ts`.
- ✅ **M-1 — Footer spacing on `/my-gifts`.** Lifted `<Footer />` out of `<main>` with `className="relative z-10 mt-12"`.
- ✅ **M-3 — LOW-3 length cap.** See above.
- ✅ **M-4 — LOW-2 plus-aliasing + NFKC.** See above.
- ✅ **M-5 — Persona-name comment removed.** `src/lib/booking/giftPersonas.ts:26` JSDoc rewritten to use "purchaser" instead of "Alice" (memory `feedback_no_persona_names_in_code` applies to comments).
- ✅ **Copy locks (D-3/D-4/D-5/D-6)** shipped in `defaults.ts` + same Sanity migration script:
  - `shareButtonLabel`: "OPEN GIFT LINK" → "Share the link"
  - `claimButtonLabel`: "OPEN YOUR GIFT" → "Open your gift"
  - `statusSentLabel`: "Sent — waiting for them to open it" → "Sent — resting in their inbox"
  - `statusPreparingLabel`: "They're preparing their reading" → "In Josephine's hands" (also better honors privacy lock — no recipient-side activity hint)
  - `antiAbuseCapBody`: warmer phrasing per Copywriter

**Test deltas (1248 baseline → 1266):**
- middleware apex-allowlist test (+1)
- emailNormalize unit tests (+5)
- GiftPurchaseConfirmation refundLine regression (+2)
- gift/route length-cap tests (+2)
- edit-recipient length-cap + plus-alias tests (+2)
- GiftCardActions component tests (+6)

**Council artifacts** in `www/MEMORY/WORK/20260512-110145_phase5-session4-review/`:
- `PRD.md` — full ISC (97 atomic) + council coverage
- `DECISIONS.md` — synthesised findings + dispositions
- `FLOW_INVENTORY.md` — Stage B source-of-truth (every customer-facing flow with preconditions + steps + assertions)

### Phase 5 — Session 4 — HIGH-priority deferrals — ✅ ALL SHIPPED in Session 4b (PR #109)

- ✅ **LB-3 — anti-abuse cap claim-time re-check** — commit `88a7043`. `countActivePendingGiftsForRecipient` extended with `excludeSubmissionId`; gift-redeem route gate added between email-match and redeem; 5 new tests (2 route + 3 repository).
- ✅ **LB-4 — GDPR Art. 17 cascade purchaser walk** — commit `7ada206`. `cascadeDeleteUser` enumerates `listGiftsByPurchaserUserId` in parallel with the recipient walk; pseudonymises purchaser fields when recipient already claimed (preserves contract-base Art. 6(1)(b) data); full-deletes when recipient hasn't claimed yet. 4 new cascade tests.
- ✅ **LB-6 — GiftForm + GiftCardActions a11y wiring** — commit `c4e41fc`. All 8 GiftForm fields wired with `id` + `aria-describedby` + `aria-invalid`; focus-on-error via `useRef`; `✦` wrapped in `<span aria-hidden="true">`; drawer heading + form `aria-labelledby`; send-at input label association. WCAG 3.3.1 + 4.1.2 compliant.

### Phase 5 — Session 5 — pre-launch must-ship cohort (continued from above)

All items below are pre-launch per Max's directive. The "Session 4b — carry-over" sections that follow enumerate the same items in tranche form (T4–T8); they need to ship in `feat/listen-redesign-and-gifting` before main-merge.

### Phase 5 — Session 4b — carry-over (visual polish + Sanity copy extraction) — PRE-LAUNCH

These are NOT launch-blockers (the surface is functional + on-brand-enough) but represent council-agreed polish. Each gets a concrete trigger.

- **D-1 — Vellum-letter framing on GiftForm + `/gift/claim`.** UI Designer flagged the gift flow as visually incoherent vs `/gift/intake` (which uses the bordered `<article>` + inner gold-border vellum pattern). Recipient's first impression of the gift on `/gift/claim` is a bare centered text block; purchaser's gift form is a flat form with no vellum cues. **Trigger to ship:** any user feedback that the gift flow "feels like a different website" OR a focused visual coherence pass before live-mode flip OR Becky requests visual parity. **Fix path:** wrap both surfaces in the same `<article class="bg-j-ivory border border-j-blush rounded-sm shadow-j-card">` + inner gold-border pattern from `gift/intake/page.tsx:71-104`. Add `BookingFlowHeader` + `Footer` chrome.
- **D-2 — Hardcoded customer-facing copy on `/gift/claim` + `/gift/intake` pages.** 11 strings total: SEO titles + descriptions, claim no-token heading + body, claim already-claimed heading + body, intake eyebrow + welcome variant heading + non-welcome heading + lede. **Trigger to ship:** Becky requests to edit either page. **Fix path:** add `giftClaimPage` + `giftIntakePage` Sanity doctypes + fetch helpers + dataset migration.
- **D-7 — GiftForm validation strings hardcoded.** 6 strings ("Required to proceed.", "Enter a valid email address.", etc.). **Trigger:** Becky asks to tune error copy. **Fix:** add `verificationError`, `genericError`, `networkError` + 6 per-field error slots to `bookingGiftForm` doctype.
- **D-8 — Timezone preview on send-at picker.** Native `datetime-local` has no timezone hint; UX expert flagged confusion risk. **Trigger:** first customer-support ticket about send-time misalignment. **Fix:** render local-time preview ("This will arrive Friday, May 19 at 9:00 AM in your timezone") below the picker.
- **D-9 — Resend-link UI rate-limit feedback.** Current behavior: route returns 429 + client shows "You've already resent this recently…" generic message. Could show specific window (1h / 24h) + when the button becomes available again. **Trigger:** rate-limit hit count >=3 per purchaser in production logs, OR Becky reports CS confusion. **Fix:** read `gift_resend` entries from `emails_fired_json` server-side, surface `lastResendAt` + `nextAvailableAt` to the client component.
- **D-10 — claimUrl rendered on `/thank-you/[id]?gift=1` for self_send.** Currently the purchaser learns the shareable URL only from the email. PM flagged single-channel delivery as a CS landmine. **Trigger:** first "I paid but never got my gift link" support ticket OR Becky reports email-delivery friction. **Fix:** thank-you page reads `gift_claim_token_hash` presence + status, fetches the claim URL via a same-origin server helper, renders as primary CTA "Copy your gift link" + plain-text fallback.

### Phase 5 — Session 4 — new Pentester findings — ✅ ALL SHIPPED in Session 4b (PR #109)

- ✅ **NEW-MED-1 — `dispatchGiftPurchaseConfirmation` idempotency** — commit `29b7e71`. Pre-append `gift_purchase_confirmation` to `emails_fired_json` BEFORE Resend send; webhook retry short-circuits on duplicate type for the same submission. Retry test in `webhook.test.ts`.
- ✅ **NEW-MED-3 — Stripe `prefilled_email` dropped** — commit `29b7e71`. `buildPaymentUrl` no longer sets `prefilled_email` on the Payment Link URL.
- ✅ **NEW-LOW-1 — Token-validity timing leak closed** — commit `29b7e71`. `verifyGiftClaimToken` always hashes + always issues DB lookup, regardless of shape mismatch.
- ✅ **NEW-LOW-2 — `gift-claim-regenerate` 5-min cooldown** — commit `8c0f690`. New `gift_claim_regenerate` `EmailFiredType` + per-submission cooldown via `emails_fired_json` walk. 429 on cooldown hit.
- ✅ **NEW-LOW-3 — Stripe metadata integrity canary** — commit `29b7e71`. Webhook gift branch warn-logs on `session.metadata.is_gift !== String(submission.isGift)`.
- ✅ **NEW-INFO-1 — DO logging discipline documented** — commit `8c0f690`. JSDoc audit confirms only `submissionId` logged across `GiftClaimScheduler`, `giftClaimDispatch`, and the internal dispatch route. No raw emails / Resend IDs / token material.

### Phase 5 — Session 4b — carry-over (/simplify-deferred fixes) — PRE-LAUNCH

All from the Session 4 /simplify review. Pre-launch per Max's directive (2026-05-12). Ship in Session 5 alongside the other carry-over tranches on `feat/listen-redesign-and-gifting` before main-merge.

- **Sanity-editable copy slots for `/my-gifts` action surfaces.** `GiftCardActions.tsx` hardcodes ~14 customer-facing strings (drawer field labels, button states "Saving…" / "Switching…" / "Sending…", and 5 error/throttle messages). **Trigger:** Becky requests to edit any of these strings, OR a focused copy-pass before Stripe live-mode flip. **Fix path:** add ~14 fields to `myGiftsPage` doctype + extend `MY_GIFTS_PAGE_DEFAULTS` + new migration script.
- **`useMutationAction` hook + `<InlineError>` primitive.** The 3 action controls in `GiftCardActions.tsx` share an identical `submitting + topError + try/catch/finally + router.refresh()` scaffold (~40 lines duplicated). **Trigger:** any 4th mutation surface lands on `/my-gifts` or `/my-readings`. **Fix path:** extract `useMutationAction<T>({endpoint, body?, onResultStatus})` returning `{submitting, topError, run}`.
- **`jsonPost<T>(url, body)` helper.** Identical POST + 422-branch + network-catch pattern in `GiftForm.tsx:110-141` + 3× in `GiftCardActions.tsx`. **Trigger:** any 4th client-fetched mutation lands.
- **Server actions + `revalidatePath('/my-gifts')` instead of `router.refresh()`.** Feasibility-gated on CF Workers + OpenNext compatibility (verify before committing). Each mutation action triggers a full RSC re-fetch today. **Trigger:** `/my-gifts` page TTFB exceeds 500ms P95 after any action OR Worker CPU duration alerts OR `useMutationAction` hook lands (above). **Fix path:** convert 3 mutation routes to Server Actions; have them return the updated `SubmissionRecord` for optimistic local updates.

### Phase 5 — Session 4b — carry-over (refactor deferrals) — PRE-LAUNCH

Pre-launch per Max's directive (2026-05-12). Ship in Session 5 on `feat/listen-redesign-and-gifting` before main-merge. Items marked ✅ shipped in 4b.

- `sendAndRecord` helper extraction — pattern is 5×, each call site has different post-send invariants. **Trigger:** any pattern divergence (e.g., a new email type appends to a different log shape).
- `EmailShell` consistency for GiftClaim + GiftPurchaseConfirmation + OrderConfirmation — snapshot-test fallout. **Trigger:** next email-template touch that involves visual refactor.
- ✅ **IntakeForm `mode` prop refactor** — **SHIPPED-AS-DECISION in Session 4b** (PR #109, commit `ef78869`). Inline JSDoc captures the simpler-shape-today rationale + retrigger: "third mode value added."
- GiftForm migrate to `Form/*` components — large refactor; Form/* API hasn't stabilised. **Trigger:** `Form/*` API documentation lands + at least one other complex form migrated successfully.
- ✅ **`{tag}` substitution sanitisation** — **SHIPPED in Session 4b** (PR #109, commit `29b7e71`, B7.26). `stripTemplateTags` helper strips `{...}` from purchaser-controlled inputs (`purchaserFirstName`, `giftMessage`, `recipientName`) at form-submit time in both gift route + edit-recipient route.

#### Session 4b T4–T8 carry-over — PRE-LAUNCH, must ship in Session 5

PR #109 closed T1–T3 (Stripe blockers + every Pentester finding + every Session-3-corroborated finding). T4–T8 ship in Session 5 directly on `feat/listen-redesign-and-gifting` BEFORE main-merge per Max's directive. Each item below has a clear path.

- **T4 — DO `env.SELF` service binding.** `GiftClaimScheduler.alarm()` POSTs over the public edge instead of in-isolate. ~20 min change once wrangler config + env type update are wired. **Trigger:** 100+ scheduled gifts/month OR observable alarm-latency tail.
- **T5 — `jsonPost<T>` + `useMutationAction` + Server Actions migration.** See "/simplify-deferred fixes" section above.
- **T6 — Visual polish:** D-1 vellum framing on GiftForm + `/gift/claim`; D-2 `giftClaimPage` + `giftIntakePage` doctypes + migration; D-7 GiftForm validation strings to Sanity; D-8 timezone preview on send-at picker; D-9 resend-link UI rate-limit feedback; D-10 claimUrl on `/thank-you/[id]?gift=1` for self_send.
- **T7 — `/my-gifts` Sanity copy extraction.** See "/simplify-deferred fixes" first bullet above.
- **T8 — Refactor cluster.** `sendAndRecord` helper, `EmailShell` consistency, GiftForm → `Form/*` primitives, `<AuthGatedPage>` chrome extraction, `GIFT_DELIVERY` const table, Sanity Studio document actions on submission doctype.
- **Final gates not yet run on Session 4b diff:** end-to-end `Skill("simplify")` 3-vantage sweep + `Agent(Pentester)` re-audit. Both queued for the polish PR.

### Phase 5 Session 4 — Multi-agent gift-flow review (ARCHIVED — SHIPPED 2026-05-12)

**Locked 2026-05-12 by Max. SHIPPED 2026-05-12 via PR `feat/phase-5-session-4-review`** — see "Phase 5 — Session 4 — SHIPPED" entry above for the disposition of every council finding (shipped fixes + defer-with-trigger items). Stage B authoring source: `www/MEMORY/WORK/20260512-110145_phase5-session4-review/FLOW_INVENTORY.md`. Original contract preserved below for historical reference.

**Why this gate exists:** the gift flow accumulated decisions across Sessions 1a / 1b / 2 / 3 with mid-flight policy changes (no-refunds override, ask-for-first-name, edit-recipient-instead-of-cancel, scheduled-vs-self_send dual-mode). A single coherent review pass against the FINAL shipped surface — not the historical decisions — is the right way to catch journey gaps, UX rough edges, code-quality regressions, and security holes that only emerge from end-to-end inspection.

**Roles to spawn (council format — use the Thinking skill's Council mode, not ad-hoc Agent calls):**

- **Product Manager** — journey coverage, feature-completeness against PRD, edge-case enumeration, customer-support exposure
- **UX expert** — flow fidelity at 375px mobile-first, friction points, brand-voice landing, recipient-side experience continuity, lost-email recovery affordances
- **UI Designer (Quiet Archivist brand voice)** — visual coherence across entry → gift form → claim → intake → thank-you → listen-page, vellum aesthetic discipline, design-token hygiene
- **Copywriter** — Cormorant/Inter cadence, sentence-level voice, copy in claim email + recipient claim landing + intake page + thank-you, Becky-editable Sanity copy slots for every customer-facing string
- **QA agent (separate spawn, after the 4 above synthesize)** — comprehensive flow + edge-case verification matrix; output is a structured pass/fail report

**Audit dimensions (each dimension produces concrete findings + council-resolved decisions):**

1. **Flow completeness** — every flow and edge case is covered:
   - Purchaser self_send → forwards link → recipient claims → recipient fills intake → delivery
   - Purchaser scheduled → cron fires at chosen time → recipient claims → recipient fills intake → delivery
   - Purchaser hits 3-active-gifts anti-abuse cap
   - Purchaser submits with recipient_email = purchaser_email (rejection path)
   - Purchaser misses a required field, gets field-level error
   - Recipient clicks already-claimed token → "already opened" page
   - Recipient clicks claim with valid token → cookie set → /gift/intake renders
   - Recipient submits intake with email NOT matching recipient_email → 422 with surfaced copy
   - Recipient submits intake with email match → submission redeemed → /thank-you/[id]?gift=1
   - Recipient closes browser mid-intake → returns via claim link → cookie may have expired → re-validate token
   - Purchaser edits recipient pre-cron-fire (Session 3) — happy path + already-fired guard
   - Purchaser resends self-send link to themselves (Session 3) — rate-limit branch
   - Purchaser cancels-as-no-refund (Session 3 — flip mode to self_send) — pre/post fire
   - Scheduled-mode email bounce (recipient typed wrong email) — Becky operational surface
   - Day-2 + Day-7 crons gated on `gift_claimed_at IS NOT NULL` — no spurious sends to unclaimed gifts
   - Stripe webhook retry after gift purchase already processed — idempotent gift_purchase_confirmation email

2. **UI / UX improvements on the shipped surface** — every page revisited against brand voice + mobile-first + accessibility (Designer + UX councils):
   - Entry page primary CTA + secondary outline pill stack
   - Gift form (`/book/[slug]/gift`) — 14 form fields + 3 consents + send-at picker + soft message counter
   - Claim page invalid/no-token graceful states
   - Gift intake page — variant copy vs the existing self-purchase intake
   - Thank-you page `?gift=1` variant — should it differ from self-purchase?
   - Purchase confirmation email (self_send + scheduled discriminated variants)
   - Recipient claim email (NEW — built in Session 2)
   - All Sanity-editable copy slots audited for clarity + Becky-as-editor naming

3. **Code correctness review** (use `/simplify` skill + add Council for architectural decisions):
   - Confirm shared booking-route helper extraction (Session 1b deferral) is still the right call OR re-evaluate
   - Confirm IntakeForm `mode` prop is the cleanest seam OR refactor to `onSubmit` callback
   - GiftForm hand-rolled fields vs `Form/*` components — final call on whether to migrate
   - Cron design for `scheduled` mode (Session 2) — race conditions, retry semantics, abandonment handling
   - `/my-gifts` (Session 3) — Phase 1 magic-link reuse vs purpose-built session, authz scoping

4. **DO-alarm precision + cost audit** — Phase 5 Session 2 ships the gift-send-claim path on a per-gift `GiftClaimScheduler` Durable Object, alarm firing at the exact purchaser-chosen `gift_send_at` (CF DO alarms typically fire within seconds). Session 4 reviews after first month of production traffic: actual drift (purchaser-expected vs Resend `sentAt` actual), DO invocation cost vs polling-cron baseline, alarm-replay incidents (at-least-once semantics), DO storage cleanup hygiene. Decision: keep DO alarms, fall back to polling cron, or add `env.SELF` service binding to remove the public-edge HTTP hop the DO currently uses for `/api/internal/gift-claim-dispatch`. Council weighs precision + cost + operational complexity against actual usage data.

5. **Thorough security review** (Pentester skill + Council):
   - End-to-end token / cookie / claim flow with all session combinations (cookie + token vs cookie-only vs token-only vs neither)
   - Edit-recipient (Session 3) authorization — purchaser_user_id scoping
   - Rate limits on resend-link (Session 3) — abuse / enumeration / cost-amplification
   - Email enumeration via 422 on recipient mismatch
   - PII handling in scheduled-claim cron (Session 2) — what's logged, what's in Resend, what's in Sentry
   - GDPR cascade-delete behavior for partially-claimed gifts
   - Stripe metadata leak vectors revisited with the final shape

6. **Council decisioning** — wherever the 4 (or 5 incl. QA) agents diverge, run a structured Council vantage debate. Resolved decisions land in a new `MEMORY/WORK/<timestamp>_phase5-session4-review/DECISIONS.md` doc with explicit Max-in-loop AskUserQuestion for anything that needs his call.

**Output of the review session:**
- `MEMORY/WORK/<timestamp>_phase5-session4-review/PRD.md` with atomic ISC enumerating EVERY fix surfaced by the council
- Implemented fixes for all council-agreed findings (UI polish, copy locks, code refactors, security hardening)
- A **flow inventory document** — every customer-facing flow with the exact preconditions, steps, and observable assertions. This document is the SOURCE for the Stage B smoke test instructions (see below).

**Follow-up: revisit deferred items** — after Session 4 fixes ship, audit `POST_LAUNCH_BACKLOG.md` for any items that can be folded in cheaply, minimizing pre-launch tech debt. Specifically the Session 1b `/simplify`-deferred refactors (extract booking-route helpers, GiftForm-to-Form-components, IntakeForm onSubmit callback, share GiftDeliveryMethod constants) — each runs through the SAME council review (UX/UI/Designer/Copywriter/Code) before landing. Do NOT bulk-merge deferred items without council coverage; the whole point of this gate is to avoid silent quality regressions during a polish pass.

**Stage B — derived from Session 4's flow inventory (not from a generic template):**
- Stage B smoke test instructions are written AGAINST the flow inventory document that comes out of Session 4. Every flow enumerated in audit dimension #1 above gets a corresponding Stage B step with preconditions + actions + assertions + rollback signal.
- Existing `LAUNCH_SMOKE_TEST_PLAN.md` Stage B template stays as the umbrella structure; the gift-specific steps slot in as a sub-section authored from the flow inventory.
- Only AFTER Stage B passes on staging do we main-merge `feat/listen-redesign-and-gifting` → `main`.

### Phase 4 — production secrets + R2 lifecycle (POST-MERGE OF `feat/listen-redesign-and-gifting` → `main`)

Phase 4 ships flag-off-by-absence: every vendor helper returns `vendorNotConfigured` until its env vars are populated, and the cascade reports the missing-config as a `partialFailures` entry but still completes the in-house data scrub (D1 + R2 + Sanity). These are the production-only actions to actually turn the vendor calls on — run after `feat/listen-redesign-and-gifting` merges to `main`. Staging secrets are out of scope for this runbook (set them on the staging worker as part of the bake; see `STAGING_RUNBOOK.md` for that flow).

Run from `www/` with the production Cloudflare Workers binding (no `--env` flag — `wrangler` defaults to production).

```bash
# 1. Admin API key — gates the Sanity Studio "Delete customer data" doc action
#    via X-Admin-Token header. Without it, the admin endpoint returns 404
#    to all callers and Becky can't cascade-delete.
#    Generate locally: openssl rand -base64 32
#    Save to password manager BEFORE pasting into wrangler.
wrangler secret put ADMIN_API_KEY

# 2. Mixpanel service-account credentials — HTTP Basic auth pair from
#    Mixpanel Project Settings → Service Accounts → "Add Service Account"
#    (role: Admin, US region, expires: Never). The "Add" dialog shows
#    username + secret ONCE — copy both immediately. Without these, the
#    cascade's Mixpanel data-deletions call returns "mixpanel: not configured"
#    partial-failure and Mixpanel event/profile data is NOT deleted.
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_USERNAME
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_SECRET

# 3. Brevo API key — DO NOT SET until Brevo Phase 1 vetting ticket has
#    cleared (see "Brevo Phase 1 — pre-vetting via support ticket" below).
#    Without it, cascade reports "brevo-contact: not configured" +
#    "brevo-smtp-log: not configured" partial-failures. Acceptable until
#    Brevo Phase 1 ships — Brevo isn't carrying any customer data yet.
# wrangler secret put BREVO_API_KEY
```

**R2 lifecycle on `exports/` prefix (production bucket).** GDPR Art. 20 export ZIPs accumulate without an expiry policy. CF Dashboard → R2 → `withjosephine-booking-photos` → Settings → Object lifecycle rules → Add rule:

- Rule name: `exports-7d-expiry`
- Prefix: `exports/`
- Action: `Delete uploaded objects after 7 Days`
- Enabled: ✓

(The pre-signed download URLs already expire after 7 days; this rule garbage-collects the underlying R2 objects so they don't keep counting against storage.)

**Verify after each secret lands:**

```bash
# Confirm the worker sees them (does NOT print the value, only the names):
wrangler secret list | grep -E "ADMIN_API_KEY|MIXPANEL_SERVICE"
```

**End-to-end smoke-test (after ADMIN_API_KEY + Mixpanel pair both set):**

1. Open Sanity Studio at `withjosephine.sanity.studio/production`.
2. Pick a real submission doc (or a test one — cascade is irreversible per Stripe Redaction, so use a test row first).
3. Click "Delete customer data" → type `DELETE` → paste the admin token → click "Run cascade delete".
4. Toast should say "Customer data cascade complete" (success) or list partial-failures (Brevo `not configured` is expected pre-vetting).
5. Query `deletion_log` in production D1 — expect TWO rows for that user_id: `action='started'` with `started_at` populated, then `action='completed'` with `completed_at` populated + `mixpanel_task_id` non-null + `stripe_redaction_job_id` non-null.
6. Confirm in Mixpanel: the data deletion request appears in Project Settings → Data Deletion Requests (state may be `pending` / `processing` for up to 30 days — that's the vendor SLA).
7. Confirm in Stripe Dashboard: the Redaction Job appears under Settings → Privacy → Redaction Jobs with status `validating` → `ready` → (manual `/run` trigger TBD via reconciliation cron in a future phase).
8. Re-trigger the doc action on the same submission → expect Studio toast "no recipient user" (idempotency holds; the row has already been deleted).

If any step fails, the cascade is non-destructive on first failure (each step wraps in try/catch + records the failure into `deletion_log.partial_failures_json` rather than rolling back). Investigate the partial-failure string and re-run after fixing.

### Phase 4b — deferred follow-ups (filed during PR — defer triggers below)

Pentester + /simplify reviews on the Phase 4b GDPR cascade PR surfaced a handful of items that didn't make the in-PR cut. Each has an explicit trigger condition for when to revisit.

- **24h vs 7d export URL expiry (Pentester MED-1).** `/api/privacy/export` emails a 7-day pre-signed R2 GET URL. Email-channel exposure window is long; alternative is to gate downloads behind a Next route that re-checks the `__Host-listen_session` cookie and 302s to a freshly-signed short-lived URL. **Trigger:** any complaint that an export link was exfiltrated, OR more than 10 exports/month sustained (broader attack surface). Cheap fix when triggered: drop `EXPORT_URL_EXPIRY_SECONDS` to 24h.
- **Sanity asset orphan reconcile cron (Pentester MED-2).** Cascade's `deleteSanityAssetsForSubmission` captures partial failures into `deletion_log.partial_failures_json` but doesn't retry. Voice notes / PDFs can orphan if Sanity 503s mid-cascade. **Trigger:** any `deletion_log` row with `sanity-asset-delete` or `sanity-doc-delete` in `partial_failures_json` that hasn't been hand-cleaned within 7 days. Cron writes a daily Mixpanel/Sentry alert; build the auto-retry only after Becky's surfaced this twice.
- **Concurrent cascade invocation guard (Pentester MED-3).** Cascade doesn't check `wasUserDeleted(userId)` before starting — concurrent double-click writes two `started` rows + two Stripe Redaction Jobs (irreversible). **Trigger:** any `deletion_log` query that returns >1 `started` row per `user_id` within the same minute. Fix at trigger time: insert with `INSERT … ON CONFLICT DO NOTHING` on `(user_id, action='started', started_at > now-60s)`.
- **Structured `partialFailures` shape + VendorId union (Quality MED).** Current `partialFailures: string[]` is stringly-typed; parsing by prefix breaks if vendor error formats change. **Trigger:** when the reconcile cron in MED-2 above lands, design its filter against a structured `{vendor, phase, detail}` shape rather than regex on free-text — touch all three vendor helpers + the cascade caller in one focused pass.
- **`formatHttpError(vendor, response)` helper extract (Quality MED).** Pattern repeated 5× across vendor helpers (`text().catch(...).slice(0, 200)`). Fine as-is for three helpers; revisit when a fourth vendor lands (Phase 5 gifting may add Stripe Connect or similar).
- **`PrivacyExport` React Email template + Sanity doc-type (Reuse LOW-MED).** Every other transactional sender uses a React Email template wired through Sanity copy (`sendOrderConfirmation`, `sendDay7Delivery`, `sendMagicLink`, etc.); `sendPrivacyExportEmail` is the only inline-HTML outlier. For brand consistency (EmailShell wrapper, SignOff, SerifHeading) + Becky-editability of the copy, create `src/lib/emails/PrivacyExport.tsx` + `emailPrivacyExport` Sanity doc-type, mirror `sendMagicLink`'s lazy-import + defaults-merge shape. **Trigger:** soft-launch traffic includes ≥3 Art. 20 export requests/month, OR Becky asks to edit the wording.
- **Sanity N+1 in cascade per-submission loop (Efficiency LOW).** Each submission: `client.fetch` asset refs + `client.delete` doc + `client.delete` per asset = N+3 round-trips per submission, serial across submissions. Fine at 1–3 submissions/user. **Trigger:** any cascade against >10 submissions for a single user (gifting power-users in Phase 5). Cleanup pass: pre-fetch all asset refs via `*[_id in $ids]{voiceNote, readingPdf}` + batch deletes via `client.transaction()`.
- **`zipSync` → `AsyncZipDeflate` flip (Efficiency MED).** Current `zipSync` is single-threaded and blocks the isolate. Comment in `export/route.ts` pre-commits to the flip threshold. **Trigger:** any export bundle ≥25 MB observed (log-and-watch), OR Worker CPU duration on `/api/privacy/export` >10s P95.
- **Mixpanel project token in URL query (Pentester MED-4).** `?token=...` ends up in vendor edge logs. Token is `NEXT_PUBLIC_MIXPANEL_TOKEN` (already client-exposed), low-impact. **Trigger:** Mixpanel documents body-token support for `data-deletions/v3.0` — then move it.
- **HMAC email_hash in `deletion_log` (Pentester LOW-4).** Currently unsalted SHA-256 — rainbow-table feasible if a `deletion_log` dump leaks. **Trigger:** any incident-class event involving D1 read access from outside the worker. Cheap fix: HMAC with a server secret.
- **Per-IP rate-limit on `/api/admin/delete-user` (Pentester HIGH-2 follow-on).** In-PR fix added the failed-auth audit row; per-IP throttling against brute-force is the separate concern. Folds into the existing `S-3. WAF rate-limit rules` backlog item above — add the admin route to the WAF allowlist when that lands.

### Brevo Phase 1 — parallel-safe (NOT launch-blocking — 2026-05-11 re-tier)

**De-blocked 2026-05-11.** Earlier framing called Brevo Phase 1 "LAUNCH-BLOCKING" but the dependency wasn't real on inspection:

- Transactional email continues through Resend (the existing path — Order Confirmation, Day-2, Day-7 delivery emails all work without Brevo).
- No newsletter signup form exists on the site yet. The website can launch with no newsletter and add one 1–2 weeks later.
- The Phase 4 cascade integration is provider-agnostic by design — without `BREVO_API_KEY`, the cascade gracefully returns `brevo-contact: not configured` + `brevo-smtp-log: not configured` partial-failures and the rest of the cascade (R2 / Sanity / D1 / Stripe / Mixpanel) completes normally.
- Switching providers is ~30 min of code work — write `<provider>Delete.ts` mirroring `brevoDelete.ts` shape + swap two import lines in `cascadeDeleteUser.ts`. **Fallback ranked picks per the 2026-05-11 vendor research:** (1) Beehiiv — strongest explicit astrology acceptance, publishes astrology-newsletter promo content; (2) Mailchimp — scrutinise-not-ban for astrology; (3) Resend Broadcasts — no content prohibitions but Schrems-III exposure for EU customers.

**Brevo's 2026-05-11 reply (Frosina, ticket #5354963):**
> *"We have reviewed the information provided… `news.withjosephine.com` has been successfully authenticated… However, since the website `withjosephine.com` is currently still under construction and not yet live, we are unfortunately unable to complete the full account review at this stage. Our compliance team needs to be able to verify the website and its content as part of the standard validation process. Additionally, as Max rightly flagged, your business falls under Section E of our Acceptable Use Policy (clairvoyance, fortune telling and astrology), which requires a dedicated review by our compliance team. We would ask you to reach back out to us once your website is live."*

Net: domain auth ✓, account-level review deferred to post-launch (Brevo-side requirement, not a code dependency), Section E review will happen post-launch as a dedicated compliance pass. Externally confirms the demotion above.

**Post-launch action (after apex unpark):** reply on ticket #5354963 with (a) the live URL `withjosephine.com`, (b) the opt-in form URL (when the newsletter form ships), (c) a sample newsletter (Becky drafts).

**What stays from the original plan:**
- Vetting ticket with Frosina at Brevo (#5354963) — keep open. Reply post-launch.
- Cascade code under `src/lib/compliance/vendors/brevoDelete.ts` — keep as-is. Env-var-gated, no harm to leave in.
- 0.2% complaint / 2% bounce / 1% unsubscribe thresholds — useful operational knowledge if/when Brevo Phase 1 ships.

**Trigger conditions for vendor swap:**
- Brevo's post-launch review drags >2 weeks after the live-site reply OR rejects → switch to Beehiiv.
- Brevo's `SANITY_BACKUP_ENABLED`-style flag in code already exists implicitly via env-var absence — no further code work needed to "turn Brevo off" — just don't set `BREVO_API_KEY`.

Below is the original Phase 1 launch checklist for reference (still useful when Brevo eventually ships, just no longer launch-gating):

### Brevo Phase 1 — pre-vetting via support ticket (operational, parallel-safe)

- **Source:** Direct read of Brevo's Acceptable Use Policy PDF (`Anti-spam policy | Brevo`, 2026-05-11). Section E names "Clairvoyance, fortune telling and astrology" as a regulated/sensitive industry where *"you must pass through a vetting process via our support team before starting to send"*. Akashic Records + birth-chart readings + Soul Blueprint fall under this category. **Not optional — the policy phrasing is contractual ("must"), not advisory.**
- **What:** Email `support@brevo.com` BEFORE the first newsletter send (and BEFORE Phase 3 transactional migration). Describe the business: astrology + Akashic Record readings + birth charts, EU residency required (France/Germany/Belgium DC), audience separation in place (newsletter list ≠ paid-customer list), no email attachments (binaries delivered via magic-link-gated R2/Sanity proxy, not over Brevo), double-opt-in on the newsletter form. Request confirmation that the account is cleared for this content category.
- **Why this matters operationally:** A skip-and-send posture risks opaque account suspension on first complaint signal. The vetting ticket is a one-time ~10-minute action that closes the operational risk for the lifetime of the account.
- **Phase 1 newsletter form opt-in spec (locked by Brevo Section C, verbatim):** *"the Contact has to check a checkbox to subscribe to your newsletter AND the registration checkbox CAN'T be pre-checked, and explicit: the Contact knows which kind of messages they will receive and for what purpose."* Means: checkbox default-unchecked, descriptive label (e.g. "Monthly notes from Josephine on…" not "Subscribe"), proof-of-opt-in retainable per contact (Brevo's contact-create payload supports `attributes.OPT_IN_AT` — store the ack timestamp + label snapshot just like Art. 6/9 consent records).
- **Brevo abuse/complaint thresholds** (verified from `help.brevo.com/.../360017299259`, indexed snippets): complaint rate >0.2%, hard-bounce >2%, unsubscribe >1% → automatic account suspension. Tighter than typical (Mailchimp 0.5% complaint, Resend 0.08% complaint / 4% bounce). Audience separation + double-opt-in is the structural mitigation already in the locked plan.
- **Action sequence (one Max-action, three sub-steps):**
  1. Sign up at brevo.com (free tier).
  2. BEFORE building the audience or sending: email `support@brevo.com` with the vetting-ticket content described above. Wait for clearance reply.
  3. After clearance: provision DKIM/SPF/DMARC for `news.withjosephine.com` subdomain in CF DNS (does NOT touch the existing transactional sender), provision Becky's editor account, build the newsletter audience list as a separate Brevo list from any future paid-customer list.
- **PAI memory captured:** `feedback_verify_vendor_claims_against_docs.md` already exists from PR #82; this case re-validates the rule. Add a one-liner referencing the Brevo astrology / Section E lookup as a confirmed pattern: read the actual policy PDF (not just indexed snippets) when picking ANY vendor for ANY content category beyond plain SaaS.

### Microsoft Clarity (session replay) — wiring SHIPPED, provisioning pending
- **Wiring shipped:** `<ClarityScript>` client component mounted from `<AnalyticsBootstrap>` (inherits consent gate + non-prod opt-in), external `<Script src="https://www.clarity.ms/tag/...">` form (CSP-compliant, no nonce concern), `shouldEnableClientObservability(host)` shared gate, CSP `script-src` + `connect-src` extended to `https://*.clarity.ms`, `NEXT_PUBLIC_CLARITY_PROJECT_ID` wired through `.env.local.example` + `.github/workflows/ci.yml`. Privacy policy patch script staged at `scripts/migrate-privacy-clarity.ts` (idempotent, mirrors the Mixpanel patch from PR #57).
- **Outstanding Max-actions (sequence):**
  1. Sign up at clarity.microsoft.com → create project → get the 10-char tracking ID.
  2. Add `NEXT_PUBLIC_CLARITY_PROJECT_ID` to GH repo Variables (Settings → Variables → Actions → New repository variable). Value = the tracking ID. No env-scoped override needed; same project for prod + staging (staging won't render Clarity unless `NEXT_PUBLIC_TRACK_NON_PROD=1` is also flipped).
  3. Trigger a production deploy (re-run latest workflow) so the new build inlines the env var.
  4. Visit the site, click around, confirm `https://www.clarity.ms/tag/<id>` script loads in DevTools Network without CSP errors.
  5. Run `set -a && source .env.local && set +a && pnpm tsx scripts/migrate-privacy-clarity.ts` against the production Sanity dataset (and again with staging dataset) to add the sub-processor disclosure to the privacy policy. Idempotent — safe to re-run.
  6. Verify masking in Clarity dashboard: load a few real intake-form sessions, confirm DOB / first_name / last_name / photo fields render as redacted blocks, not actual content. ALL of these masks before opening real traffic.

### Resend `EmailSendResult` discriminated union

- **Source:** /simplify quality reviewer flag in `fix/staging-smoke-followups` (PR #86, 2026-05-08).
- **What:** `sendOrSkip` returns `{ resendId: null }` for three distinct outcomes: dry-run skipped (intentional, success-equivalent), `RESEND_API_KEY` missing (config failure), and Resend send failure. Six callers (booking, contact, 3 crons, Josephine notification) currently can't distinguish these without re-reading env flags. Contact route now does `!isFlagEnabled("RESEND_DRY_RUN")` to disambiguate — leaks Resend's internal flag awareness up to the route boundary.
- **Action:** Widen `EmailSendResult` to a discriminated union — `{ status: "sent"; resendId: string } | { status: "skipped"; reason: "dry_run" | "no_api_key" | "no_recipient" } | { status: "failed"; error: string }`. Each caller branches on `status`. Contact route's TODO at `route.ts` becomes a clean `if (result.status === "failed") return 500`. Touches every email caller — own PR.
- **Why deferred:** Surgical 3-liner unblocks staging; the proper boundary fix is its own PR. Touches 6+ callers + the lib + tests across each.

### Sanity write-client helper extraction (`scripts/_lib/sanity-write-client.mts`)

- **Source:** /simplify reuse reviewer flag in `fix/staging-smoke-followups` (PR #86, 2026-05-08). Tipping point reached: 3 scripts (`seed-booking-page-entry-copy.mts`, `seed-quality-sweep-fields.mts`, `cleanup-orphan-field-values.mts`) now duplicate the same env-load + token guard + `createClient` boilerplate (~22 lines each).
- **What:** Extract `scripts/_lib/sanity-write-client.mts` exporting `loadDotEnv()` + `createSanityWriteClient()` returning `{ client, dataset }`. Migrate the 3 callers to the helper.
- **Action:** New file under `scripts/_lib/`, refactor 3 existing scripts to ~3 lines of setup each. Mechanical, low risk.
- **Why deferred:** Out of scope for the staging-smoke fix bundle. Worth a focused 30-minute pass; pre-empt the 4th copy.

### Defaults-merge convention drift across content components

- **Source:** /simplify reuse reviewer flag in `feat/quality-sweep-projections-copy-types` (PR #85, 2026-05-07).
- **What:** ContactForm now uses per-field merge (`{ ...CONTACT_DEFAULTS, ...content }`), but Hero / HowItWorks / Footer / Navigation still use all-or-nothing fallback (`content ?? DEFAULTS`). The two forms behave differently the moment a partial Sanity doc exists — `?? DEFAULTS` drops every default the moment the doc is non-null, so any new optional field silently renders `undefined`. This is dormant today (those components don't have optional fields), but the next time someone extends e.g. `HeroContent`, they'll trip the same bug class ContactForm just escaped from.
- **Action:** Migrate Hero / HowItWorks / Footer / Navigation to the same `{ ...DEFAULTS, ...content }` shape. Mechanical, low risk, blast radius small (each component is a leaf with stable prop shape).
- **Why deferred:** Not blocking. Worth a focused 30-minute pass in the next sweep.

### Audit: orphaned schema fields — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

PROJECTED-BUT-UNUSED follow-up complete. 9 fields deleted, 1 wired up (`bookingPage.paymentButtonText` → PageNav), 6 new optional fields added (PageNav nav copy, PageIndicator tagline, ContactForm success state). 4 audit "ambiguous" entries verified as CONSUMED (`bookingForm.entryPageContent.*`, `bookingForm.pagination.overrides`, `bookingForm.loadingStateCopy`, `bookingForm.nonRefundableNotice` — schema description fixed). Full per-field landscape in `www/docs/audits/orphan-schema-fields.md`. Manual seed via `scripts/seed-quality-sweep-fields.mts` against production + staging (Max-action).

### Audit: hardcoded customer-facing copy — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types`

H3/H4/H5 shipped (SubmitOverlay loading copy via Sanity seed; ContactForm success state via `landingPage.contactSection` extension; IntakeForm PageNav labels via `bookingPage.paymentButtonText` + new `bookingForm.nextButtonText` + `saveAndContinueLaterText`). M1/M2/M3/M5 dropped with durable rationale. M4 PageIndicator resolved via new `bookingForm.pageIndicatorTagline` optional knob. Email-template copy remains out-of-scope (CRM migration path). Full landscape in `www/docs/audits/hardcoded-copy.md`.

### PR-F1 simplify-pass deferrals (remaining after Bundles 2 + 4)

**Source:** Code-quality + efficiency review on `feat/mixpanel-pr-f1` 2026-05-02. Three of five original items closed across PR #77 (Bundle 2 — `consentEffectRanRef` ref-guard + `<SavedIndicator>` extraction) and PR #79 (Bundle 4 — confirmed-and-rejected `process.env.*` hoist; see "Why kept inline" below). Remaining:

- **Why `process.env.*` reads in IntakeForm render path were KEPT inline (durable rationale, do not re-propose).** Tried hoisting to both module scope (Bundle 2) and `useMemo([], [])` (Bundle 4); both reverted. Root reason: Next's webpack DefinePlugin already inlines `NEXT_PUBLIC_*` as string literals at build time. The "inline reads" in source compile to bare constants in the output bundle. Module-scope hoist has the same runtime cost AND breaks `vi.stubEnv` test stubs. `useMemo` has the same runtime cost AS the inline reads PLUS hook overhead (cache lookup, deps-array compare). The inline reads ARE the optimal pattern at this build pipeline. Saved as memory `feedback_next_publicenv_inlining.md`.

- **`setState`-in-effect lint suppression in AnalyticsBootstrap.** Cleaner long-term fix is `useSyncExternalStore` for the consent state read. Refactor when the consent flow gains complexity (e.g. when we add per-purpose consent granularity).

- **`window.location.host` re-read in `initAnalytics()`.** Called once due to the `bootstrapped` guard. Hoist if/when re-init support is added (currently not on the roadmap). Eager module-scope read is unsafe (SSR breaks); lazy module-scope cache is identical work to the function-scope cache.

- **`migrate-privacy-mixpanel.ts` re-fetches on no-op idempotency check.** The script fetches the entire doc before short-circuiting. Acceptable today (script runs maybe 1–2 times in its lifetime); swap to a lightweight projection query if it becomes a template.

### Core Web Vitals → Mixpanel — CLOSED-AS-DROPPED 2026-05-07
- **Decision:** Dropped during the items-4/5/6 bundle planning. PerplexityResearcher confirmed Microsoft Clarity natively captures the three Google-ranked CWV metrics (LCP, INP, CLS) at p75 with session-replay correlation — strictly more useful than Mixpanel histograms. FID is deprecated (replaced by INP March 2024); FCP and TTFB are diagnostic, not Google-ranked. Quota wasn't the issue (~2,580 events/mo is 0.26% of Mixpanel's 1M free-tier cap), but the duplicate signal isn't worth one always-mounted client component plus per-route property slicing we can already get from Clarity's Performance widget. Locked by Max via AskUserQuestion.

### Generic delegated tracking listener (`data-mp-*`) — SHIPPED
- Shipped as part of the items-4/5/6 bundle. `<DelegatedTracking />` mounted in `src/app/layout.tsx`, single bubble-phase `click` listener at `document` resolves `closest("[data-mp-event]")`, reads remaining `data-mp-*` attrs as snake_case properties, fires `trackUntyped(event, props)`. Typed `track()` remains the only entry-point for SPEC §15 events; `trackUntyped` is documented as "delegated path only" in `client.ts`.

## Code quality (nice-to-fix)

Remaining items after PRs #76–#78 (Bundles 1–3) closed: F-11 cron-auth, build-time Turnstile bypass assertion, TrustLine cleanup, `clientReferenceId` orphan removal (+ D1 column drop via migration `0003`), `abandonmentRecoveryFiredAt` orphan removal, `void chipTick` refactor, `letter/page.tsx` IIFE simplification, `intake_save_auto` throttle, `@next/bundle-analyzer` wiring, `experimental_taintObjectReference` markers. Inferred-return-type sweep across components/routes — RESOLVED 2026-05-07 in `feat/quality-sweep-projections-copy-types` (Explore-agent enumeration found Bundle 4 + earlier sweeps had already covered all but one helper in StarField.tsx; remaining src/lib/** functions retain explicit annotations from PR #79).

- **`legal_full_name` in `SWAP_PRESERVED_KEYS`.** Kept as a fallback for
  pre-migration localStorage drafts. Drafts have a 30-day TTL — drop after
  2026-05-29 with confidence.
- **3× `fetchBookingForm` per `/book` flow.** Each of `/book/[id]`,
  `/letter`, `/intake` calls it independently. `cache()`-wrapped per request,
  so 3 separate Worker invocations = 3 fetches. Acceptable today; if Sanity
  CDN ever throttles, batch the fetch upstream.

### react-hooks/refs sweep (deferred 2026-05-09 from `feat/listen-redesign-and-gifting`)

`pnpm update --recursive --depth=Infinity` on the feature branch (run to
patch transitive OSV vulns) bundled an `eslint-plugin-react-hooks` upgrade
that promotes a few previously-warning patterns to errors. Three locations
got targeted `eslint-disable` lines with reason comments to unblock CI;
they need a proper refactor before the branch merges to main.

- `src/components/Form/DatePicker/DatePicker.tsx` — `setMonth(selected)`
  inside an effect (`react-hooks/set-state-in-effect`). Refactor to
  derived state via `useState` initializer or `useMemo`-driven month.
- `src/components/IntakeForm/IntakeForm.tsx:194` —
  `setSwappedFromReadingName(readingName)` inside the restore-on-mount
  effect. Same rule. Refactor: hoist the swap detection to a
  `useSyncExternalStore` or a derived value computed at render.
- `src/components/IntakeForm/IntakeForm.tsx:268` —
  `currentPageRef.current = currentPage` outside an effect (`react-hooks/refs`).
  Refactor: replace the ref-mirror pattern with `useEvent`-style stable
  callback or move the focus-listener registration inside the effect that
  already knows about `currentPage`.
- `src/components/IntakeForm/IntakeForm.tsx:632` (`currentSections.map`) —
  `renderField` closure captures `requestFreshTurnstileToken` which reads
  `turnstileRef.current` (`react-hooks/refs`). Refactor: pass a stable
  ref-resolver via context or move Turnstile orchestration up the tree.

### Sanity TypeGen adoption (deferred 2026-05-09)

`next-sanity` 12.4.5 (bundled with the same dep refresh) tightened
`sanityFetch`'s data type to `ClientReturn<QueryString, unknown>` —
without registered query→type mappings it falls through to `unknown`.
Workaround: typed wrapper at `src/lib/sanity/live.ts` that takes an
explicit `<T>` and asserts the result. Each `fetch.ts` wrapper supplies
`<T>` per call. Long-term fix is **Sanity TypeGen**: scan `groq` queries
+ schema, emit `query-types.d.ts`, and the typed wrapper becomes
unnecessary. Setup is `pnpm exec sanity typegen generate` against
`studio/schema.json`. ~1 session of work plus CI integration so the
generated file stays current.

---

## UX

### Pre-prod data cleanup (test smoke residue)
- **Source:** Smoke session 2026-05-01.
- **What:** Test bookings ran end-to-end against prod (CF Workers + real D1 + real Sanity + real R2). The submissions / mirrored Sanity docs / uploaded photos remain. We don't have a dedicated dev environment yet; everything lands in the prod stores.
- **Action before opening real traffic:**
  1. `pnpm wrangler d1 execute withjosephine-bookings --remote --command "DELETE FROM submissions WHERE email LIKE '%@gmail.com' OR email LIKE '%@example.com'"` — adjust filter to actual test emails.
  2. Studio → Submissions → delete each test row that mirrored.
  3. R2: delete the orphaned objects under `submissions/<id>/` for the deleted IDs (or wait for the orphan-reaper cron once it's running).
- **Long-term fix:** stand up a real dev environment (separate D1 DB + Sanity dataset + R2 bucket + Stripe test mode wiring on dedicated subdomain like `dev.withjosephine.com`) so the next round of smoke testing doesn't pollute prod.

### Reading prices — data reconcile + Stripe Payment Link sync (Max+Josephine)
- **Source:** Smoke session 2026-05-01; full audit 2026-05-06.
- **Code surfaces fixed in `fix/reading-price-drift-class`:**
  - Sanity schema validation rule on `priceDisplay` warns when it disagrees with `price` (cents). Studio surfaces a yellow warning on any reading doc whose two fields don't agree.
  - Prebuild `pnpm sync-readings-from-sanity` writes `src/data/readings.generated.ts` so the runtime fallback (Sanity outage path) tracks whatever Sanity last published. Static-fallback drift class closed.
- **Still open (data, not code):**
  - All three reading docs (production + staging) currently fail the validation as of 2026-05-06: `soul-blueprint` price=17900¢/display=$129; `birth-chart` price=9900¢/display=$89; `akashic-record` price=7900¢/display=$89.
  - Max + Josephine: pick the canonical price for each reading, update `price` (cents) AND `priceDisplay` together in production Sanity, then update the matching Stripe Payment Link via the dashboard (Stripe prices are immutable — this is "create new Price + new Payment Link, swap URL on the reading doc, archive the old"). Staging mirror picks it up automatically through `/api/sanity-sync`.
  - Once reconciled, consider flipping the schema rule from `warning` to `error` so future drift hard-fails Studio save.

### Manual end-to-end Stripe round-trip
- **Source:** Punch 2 — partially covered by smoke agent (stopped before
  Stripe redirect).
- **What:** Click through Soul Blueprint / Birth Chart / Akashic Record
  intake all the way through Stripe sandbox checkout, confirm the redirect
  to `/thank-you/[readingId]?sessionId=cs_test_...`, confirm webhook fires
  and marks submission paid in Sanity.
- **Action:** Manual smoke against a Stripe test card before opening real
  traffic. Required after R2 CORS is configured (Punch 6) since the photo
  upload will be exercised.

---

## Persistence (ADR-001 follow-ups)

D1 is the source of truth; Sanity is a one-way mirror. The mirror is
fire-and-forget — drift can happen on Sanity outages.

### D1 → Sanity reconcile cron
- **Source:** ADR-001.
- **What:** Periodic diff between D1 (truth) and Sanity (mirror) that
  pushes any rows Sanity is missing or stale on. Belt-and-braces against
  fire-and-forget mirror failures.
- **Action:** Add `/api/cron/reconcile-mirror` route. Walk D1, fetch the
  matching Sanity doc by `_id`, replay the create/patch if missing or
  divergent on key fields (`status`, `paidAt`, `deliveredAt`, last
  `emailsFired` entry).

### Sub-PR #4 — Becky operational layer (split into 4a / 4b / 4c, decided 2026-05-07)

**Background.** ADR-001 acceptance + 2026-05-06 + 2026-05-07 surfacing during the operational-completeness branch. Today's flow is broken for Becky: `voiceNoteUrl` / `pdfUrl` are URL strings in Sanity Studio (plain text inputs), there's no queue/visibility surface, and the only delivery path is `pnpm tsx scripts/mark-delivered.mts` from an engineer terminal.

**Decided 2026-05-07 (research + 4-voice council debate).** Path B+ (D1 columns kept; cron mirrors Sanity → D1 at fire time, listen page unchanged). Decision artefacts: `www/MEMORY/WORK/20260507-045653_subpr4-studio-file-upload-day7-delivery/PRD.md`. Research from Perplexity / Claude / Gemini and council of 4 (SaaS ops architect / solo creator / CS specialist / minimum-mechanism architect) all converged on:
- Sanity is Becky's surface; D1 stays source-of-truth via the existing mirror (no new D1 columns).
- Airtight gate = artifact existence as the readiness flag, atomic GROQ predicate at cron fire time. Sanity schema validation is defense in depth; the cron-time GROQ is what's load-bearing.
- Queue surface = pinned Sanity Structure pane, NOT a dashboard tool. Belongs in 4b.
- Digest = threshold-triggered (≥1 item due in <48h or overdue), NOT fixed-cadence. Belongs in 4c.
- Sequence = ship 4a alone, bake 1 week, then 4b + 4c bundled.
- Shared `isDeliverable(submission)` predicate built once in 4a, reused by 4b/4c (queue filter, digest filter, ICS deadline computation).

#### Sub-PR #4a — file upload + airtight delivery gate ✅ MERGED 2026-05-07 (PR #74)
- **Scope shipped.** Schema flip (`voiceNote: file`, `readingPdf: file`, validation `required when deliveredAt set` + cross-field gate on `deliveredAt`). New `isDeliverable()` predicate (with unit tests) + `fetchDeliverableSubmissions()` / `fetchUndeliveredSubmissionIds()` GROQ helpers. Day-7-deliver cron sources candidates from Sanity, dereferences `voiceNote.asset->url` + `readingPdf.asset->url`, writes URLs + `deliveredAt` to D1, then sends. Day-7 alert cron queries Sanity for `!defined(deliveredAt)` (not D1 — avoids the race between Becky setting `deliveredAt` and the deliver cron running). `mirrorSubmissionPatch` patch shape drops the 3 delivery fields. `scripts/mark-delivered.mts` deleted. D1 schema unchanged; listen page unchanged; `repository.ts` `Row` / `rowToRecord` unchanged.
- **Status.** Merged into `feat/operational-completeness` as commit `2d183f4`. Now in 1-week bake against Becky's first real reading. Once verified, integration branch → main as a single PR.
- **Bake checklist (manual smoke).**
  1. Becky uploads voice + PDF in Studio → schema validation accepts both files.
  2. Becky sets `deliveredAt` without files → schema validation BLOCKS save (defense in depth).
  3. Becky sets `deliveredAt` with both files → schema validation accepts.
  4. Cron-time GROQ predicate fires → D1 `delivered_at` + `voice_note_url` + `pdf_url` populated within one cron tick.
  5. Customer Day-7 email arrives with valid `/listen/<token>` URL.
  6. Listen page renders both audio + PDF download.
  7. If Becky stalls past 7d, alert cron fires once to Josephine (no duplicate alerts on subsequent ticks).

#### Sub-PRs #4b + #4c — RE-SCOPE BLOCKER (locked 2026-05-07)

**Both deferred pending a broader email-stack rediscussion.** Originally next-up after the #4a bake; the call now is to NOT build #4b or #4c in-codebase before deciding whether the email layer should move to a CRM (Mailchimp / similar — see CLAUDE.md "Post-launch future enhancements → Email automation → outsource to a CRM"). If the CRM migration lands first, parts of #4c (digest cron + per-booking notification) likely move into the CRM's automation layer; building them in-codebase now risks throwaway work.

**Scope of the rediscussion (must happen before any #4b/#4c implementation):**
- Which CRM (Mailchimp working assumption, but unconfirmed with Becky).
- What email types migrate: booking transactionals (`order_confirmation`, `day_2`, `day_7_delivery`, `day_7_overdue_alert`)? Marketing? Digest reminders to Becky?
- What stays in-code: admin notifications (Josephine alert), ICS attachment on per-booking email (calendar-attachment generation isn't a CRM primitive), `/api/sanity-sync` mirror cron.
- The Studio queue pane (#4b) is independent of email — could ship standalone if the CRM discussion stalls. Council-locked split rationale (research artefacts in `www/MEMORY/WORK/20260507-045653_subpr4-studio-file-upload-day7-delivery/PRD.md`) still stands.

Original scope kept below for reference.

#### Sub-PR #4b — Studio queue view (FOLLOW-UP, parked pending rediscussion)
- **Scope.** Custom Sanity Structure pane "Awaiting delivery" — pinned in Studio sidebar, GROQ-filtered to `_type == "submission" && status == "paid" && !defined(deliveredAt)`, sorted by `paidAt asc` (oldest first). Submission preview subtitle shows days-since-paid as plain text (e.g. "Day 4 of 7"). No traffic-light badges yet — defer until Becky asks.
- **Reuses from 4a.** The `isDeliverable()` predicate inverse for the filter; the GROQ shape from `fetchDeliverableSubmissions()`.
- **Effort.** ~1 day.

#### Sub-PR #4c — Becky-proactive pings (FOLLOW-UP, parked pending rediscussion)
- **Scope.** (1) New Resend cron `email-becky-digest` at 09:00 ET that fires only when ≥1 submission is overdue (>7d since paid + no `deliveredAt`) OR due within 48h. New Sanity siteSettings field `practitionerOpsEmail` for the recipient (Becky's address). Threshold-triggered = no fixed cadence — silence on quiet days is the signal. (2) ICS attachment on the per-booking notification email (sent at payment time): `.ics` file with `METHOD:PUBLISH` (NOT REQUEST — avoids attendee-response UI), `VTIMEZONE` block + `TZID`-qualified `DTSTART`/`DTEND`, deadline = `paidAt + 6d` (24h buffer before the 7d SLA). Auto-populates Becky's calendar without OAuth.
- **Declined options (durable record):** 48h-before-deadline single-shot reminders (overlap with digest); Telegram/Pushover phone push (channel proliferation, all sources warn against it at this scale).
- **Reuses from 4a.** `isDeliverable()` for the digest filter.
- **Effort.** ~1 day.

**Why split (locked rationale):** schema migrations on live Sanity always surface edge cases (existing string-field docs, asset reference shape mismatches). Shipping the gate alone lets it bake under real Becky usage before layering visibility + ping surfaces on top of it. Council 3/4 endorsed the split; the dissenter (M4, minimum-mechanism architect) conceded once migration risk was named.

### Apex + preview 500 (`InvariantError: Expected workStore to be initialized`) — FIXED + DEPLOYED 2026-04-30 (PR #44)

**Root cause:** Next 16.2.x's `outputFileTracingExcludes` interacts badly with `@opennextjs/cloudflare` 1.19.4's bundler under workerd. Excluding even harmless files (e.g. the `capsize-font-metrics.json` static asset, the unused Turbopack runtime) causes Next's per-request `workAsyncStorage.run` wrapper to set the store on a different `AsyncLocalStorage` instance from the one Next's render code reads via `getStore()` — producing the InvariantError on every server render. Static assets and pure API handlers were unaffected because they don't read workStore.

**Fix (commit pending):** Removed the entire `outputFileTracingExcludes` block from `next.config.ts`. Local repro (`pnpm cf:build && pnpm cf:dev`) returns HTTP 200 with full HTML on `/`, `/book/soul-blueprint`, and other dynamic routes; zero `InvariantError` in `wrangler tail`. Three quality gates green: typecheck, lint, 506/506 tests.

**Bisect evidence (this session, in order):** All performed against the local `cf:dev` harness from PR #44.
1. Gate `<SanityLive />` behind `{isDraftMode && ...}` — **NOT FIXED**, 500 + 10× InvariantError.
2. Lazy-init `defineLive(...)` (move out of module top-level) — **NOT FIXED**, 500 + 8× InvariantError.
3. Remove `await draftMode()` from RootLayout — **NOT FIXED**, 500 + 8× InvariantError.
4. Remove ALL `outputFileTracingExcludes` — **FIXED**, 200 + 0 errors.
5. Restore non-react-dom excludes (5 of 8) — back to 500.
6. Restore only capsize + turbo excludes (2 of 8) — still 500.
7. → Empty excludes block is the only working state.

**Bundle-size implications (FOR FUTURE OPTIMIZATION — read carefully before re-adding excludes):**

The original excludes were strips intended to keep the worker under Cloudflare's 3 MiB free-tier compressed limit. We're now on the paid plan (10 MiB limit) so the budget is no longer pressing. Empirical handler.mjs sizes observed during this bisect:
- All 8 excludes: 13231 KiB
- Two excludes (capsize + turbo): 13231 KiB
- Zero excludes: **12697 KiB** — counterintuitively *smaller* than with excludes.

Why excludes made the bundle bigger AND broke workStore: best current hypothesis is that when Next sees those paths excluded from tracing, it pulls in alternate (larger, polyfilled) fallback code paths that bundle a *separate* AsyncLocalStorage instance — and those paths are what end up in the OpenNext output, not the strips. So you pay a size penalty AND break workStore. This is upstream behavior, not something we can fix in our config.

**Items deferred from this fix:**
- **Cleaner narrowed exclude set.** I never bisected to a single load-bearing exclude — time-budget pressure and "fix it locally first" priority forced me to drop them all. Future work: bisect one-at-a-time (capsize, turbo, compression, vercel/og, server/og, react-dom-legacy, react-dom-browser, react-dom-bun) to find which specific entry triggers the duplication, then keep the safe ones. Ideally upstream the finding to OpenNext as an issue.
- **OpenNext upstream issue.** Worth filing once we have a minimal repro: `outputFileTracingExcludes` causes workStore duplication on Next 16.2.x via OpenNext 1.19.4 / workerd. Reference Next discussion #86978 (sibling symptom) and OpenNext #1157 (different message, same Next-16.2-on-Workers class).
- **Worker bundle compressed-size audit post-deploy.** Need to verify the 10 MiB limit isn't crossed on the next deploy; if it is, narrowing the excludes (per above) is the lever — the tradeoff is reintroducing the bug class.

**Pre-fix attempts (2026-04-30, deployed but didn't move it):**
- **PR #42** — restored `compiled/edge-runtime/**` + `compiled/@edge-runtime/**` NFT excludes (commit `d005f74` had stripped them on the wrong premise that workerd is "Node.js runtime"). Wrong cause, fix kept anyway.
- **PR #43** — bumped `@opennextjs/cloudflare` 1.19.1 → 1.19.4, Next 16.2.3 → 16.2.4, wrangler 4.83.0 → 4.86.0. Wrong cause; bundle grew 2.58 → 3.91 MiB compressed.
- **Workers paid plan** ($5/mo, 10 MiB compressed limit) upgraded — paid for, bundle no longer the constraint.

### Sentry follow-ups (post-`@sentry/cloudflare` ship)
- **Shipped:** server-side error capture via `Sentry.withSentry` wrap in `custom-worker.ts` (PR #70). Client-side React error capture via `@sentry/browser` from `error.tsx` / `global-error.tsx`, gated on the same consent banner as Mixpanel; client-side sourcemap upload to Sentry via a `pnpm sentry:sourcemaps` CI step (the @sentry/browser PR). DSN is the kill switch — unset `SENTRY_DSN` (server) / `NEXT_PUBLIC_SENTRY_DSN` (client) = silent no-op.
- **Open follow-ups:**
  1. **Worker-bundle sourcemap upload to Sentry** — blocked upstream on sentry-javascript#19213. `sentry-cli sourcemaps inject/upload` succeeds against `.open-next/worker.js[.map]` but runtime stack frames don't reference the uploaded Debug IDs because something in OpenNext's worker init strips them. Until upstream lands a fix, server-side stack traces from `Sentry.withSentry` reach Sentry minified. Acceptable tradeoff — `error.digest` provides per-error correlation; client-side captures are symbolicated.
  2. **Validate against the open AsyncLocalStorage bug** — sentry-javascript#18842 affects the `@sentry/nextjs` `onRequestError` hook, which we deliberately avoided. Worth re-checking in 6 months; if upstream resolves it, `@sentry/nextjs` would unlock automatic request-context correlation that `@sentry/cloudflare` standalone doesn't provide.

### D1 live-write smoke test (immediately post-deploy)
- **Source:** ADR-001 acceptance.
- **What:** First post-deploy verification that `/api/booking` actually
  writes to prod D1 (not just our unit tests against in-memory SQLite).
  Submit one real booking via the form (test data, junk email), confirm
  the row appears in `wrangler d1 execute --command "SELECT * FROM submissions" --remote`,
  then clean it up. Also confirm Sanity mirror landed via Studio.
- **Action:** Run within an hour of the first post-merge deploy. If
  drift, check Worker logs (`wrangler tail`) for D1-HTTP errors.

### Demote Sanity submission schema to read-only proxy
- **Source:** ADR-001 future state.
- **What:** Currently Studio shows submissions via the standard editable
  document type. Edits get clobbered by mirror sync. Replace with a
  custom Studio document type that fetches via API rather than holding
  its own copy.
- **Action:** Defer until ops actually use Studio for submissions.

## Phase 1 magic-link auth — review deferrals (LAUNCH-BLOCKING)

5-vantage code review on 2026-05-10 (Engineer + Pentester + /simplify Reuse/Quality/Efficiency) surfaced ship-blockers (#1–#5) and should-fix items (#6–#11) that landed in the same PR as the auth foundation. The items below were deferred — they MUST land before apex unpark / Stripe live-mode flip. Tracked here so they don't drift.

**Hard gate: every item in this section is launch-blocking.** Apex stays parked until they're shipped or explicitly closed-as-won't-do.

### A. Deferred from review (correctness/security follow-ups)

#### A-1. Unicode NFC normalization in `normalizeEmail`
- **Source:** Code review Pentester [LOW-7] 2026-05-10.
- **What:** `src/lib/auth/users.ts` `normalizeEmail` does `.trim().toLowerCase()` only — no `.normalize('NFC')`. A user whose email client autocompletes a decomposed form (`café@x.com`) while Stripe stored the precomposed form (`café@x.com`) will be locked out at email-match.
- **Action:** Add `.normalize('NFC')` in `normalizeEmail`; apply at both write (getOrCreateUser) and read (redeemMagicLink) sites. Bundle with the auth-polish PR.

#### A-3. Constant-time token-hash comparison
- **Source:** Code review Engineer [NIT] 2026-05-10.
- **What:** SQLite `WHERE token_hash = ?` short-circuits string equality; over a high-volume endpoint with timing observability this leaks bits. Practical risk is low because the attacker would need to generate the SHA-256 hash *prefix* (not the raw token), but defense-in-depth is cheap.
- **Action:** Phase 4 hardening. Apply `crypto.timingSafeEqual` after the lookup in `redeemMagicLink` + `getActiveSession`. Or accept the residual risk and document.

#### A-5. Session cookie rotation on use
- **Source:** Code review Engineer [surprise] 2026-05-10.
- **What:** 7d session cookie with a static value + Level 1 email-match only + no IP binding = stolen cookie is good for the full TTL with zero detection signal. Standard pattern, but combined with the rest of the threat model it's the residual risk.
- **Action:** Phase 4 threat-model doc + (optional) sliding-expiry-with-rotation. Decide: document residual risk vs implement rotation.

#### A-6. Cleanup cron for stale unconsumed magic links
- **Source:** Code review Engineer [surprise] 2026-05-10.
- **What:** No upper bound on how many unconsumed magic links can exist for a user. An attacker (or buggy client) could trigger thousands of issuances. Each row is small but the table grows unbounded.
- **Action:** Phase 4 cleanup-cron addition. `DELETE FROM listen_magic_link WHERE expires_at < (now - 7 days)`. Add to `/api/cron/cleanup`.

#### A-7. `idx_listen_audit_user` write-amp profiling
- **Source:** Code review Efficiency [INDEX] 2026-05-10.
- **What:** Every audit row writes 4 indexes (PK + idx_user + idx_submission + idx_timestamp). Audit fires on every magic-link issue, every redeem branch, every session start, every session-denial (after fix #7 lands). If audit is queried by `submission_id` 99% of the time, `idx_listen_audit_user` is overhead.
- **Action:** Profile after 30d of production traffic. Drop the index if not queried. Lightweight optimization.

### B. Polish (`/simplify` follow-up batch — single PR after main PR lands)

These are noise-level items the 5-vantage review surfaced. Bundle into one `/simplify` PR after the main session-1 auth foundation merges.

#### B-1. Lift `sha256Hex` into `src/lib/hmac.ts`
- **Source:** Code review Reuse [REUSE-OPP] 2026-05-10.
- **What:** `src/lib/auth/listenSession.ts` defines a private `sha256Hex` that wraps `crypto.subtle.digest` + manual hex conversion. `src/lib/hmac.ts` already exports `bytesToHex` — exactly the same byte-to-hex loop.
- **Action:** Export `sha256Hex` from `src/lib/hmac.ts` (reuses `TEXT_ENCODER` + `bytesToHex`). Import in `listenSession.ts`. `src/lib/auth/users.ts` doesn't currently use it but will after fix #2 lands — same import.

#### B-2. Use `normalizeEmail` instead of inline `trim().toLowerCase()`
- **Source:** Code review Reuse [REUSE-OPP] 2026-05-10.
- **What:** `src/lib/auth/listenSession.ts:192` currently does `args.claimedEmail.trim().toLowerCase()` inline; `users.ts:19` already exports `normalizeEmail`.
- **Action:** Import + use `normalizeEmail`. One-source-of-truth so the future NFC fix (A-1) auto-propagates.

#### B-3. `seedSubmissionForUser` test helper → `repo.createSubmission`
- **Source:** Code review Reuse + Quality + Engineer (3-lens convergence) 2026-05-10.
- **What:** `src/lib/auth/listenSession.test.ts` writes raw SQL to seed test rows, bypassing `createSubmission`. Drift risk: any future column added to `submissions` won't be exercised by these tests.
- **Action:** Lift to `src/test/seeds/submissions.ts` with a richer signature (`{ id, userId, status?, email?, readingSlug? }`). Reuse from Phase 2/5 tests.

#### B-4. `denyAndAudit` helper to collapse 4× duplicated audit writes
- **Source:** Code review Quality [NIT] 2026-05-10.
- **What:** `redeemMagicLink` repeats the same `await writeAudit({...}); return { ok: false, reason }` block at 4–5 error branches. Real divergence already showed up: `link_invalid` branch was missing `userAgentHash` that `link_email_mismatch` included.
- **Action:** Extract `denyAndAudit(reason, eventType, { userId, ipHash, userAgentHash, submissionId, now })`. Enforce consistency by construction.

#### B-5. Drop "iter 2" iteration markers from comments
- **Source:** Code review Quality [NOISE] 2026-05-10.
- **What:** `migrations/0004_listen_auth.sql:1` says "user-keyed (iter 2)"; `listenSession.ts` header has "Identity model (iter 2)" preamble. Iteration numbers belong in git, not the source.
- **Action:** Strip iteration markers; keep substantive content.

#### B-7. Drop tautological `constants` describe block
- **Source:** Code review Engineer [NIT] 2026-05-10.
- **What:** `src/lib/auth/listenSession.test.ts` has a `describe("constants")` block asserting literal numbers (`MAGIC_LINK_TTL_MS === 24*60*60*1000`). This is testing TypeScript, not behavior.
- **Action:** Delete the block.

#### B-8. Make `dailySalt` rotation test boundary-explicit
- **Source:** Code review Engineer [BUG-test] 2026-05-10.
- **What:** Current "different day, different hash" test uses `Date.UTC(2026, 4, 9, 12, 0, 0)` + 24h, which works but is fragile across timezone/locale assumptions.
- **Action:** Construct `day1 = day_n * 86_400_000` and `day2 = (day_n+1) * 86_400_000` explicitly so the test asserts the floor-arithmetic boundary directly.

#### B-10. Add explicit "forwarded-link Level 1 success path" test
- **Source:** Code review Engineer [BUG-test] 2026-05-10.
- **What:** No test explicitly frames the case "issued for alice; redeem with claimedEmail='alice@example.com' succeeds and grants alice's session". The current happy-path test covers this mechanically but not as the documented Level 1 hardening property.
- **Action:** Add a clearly-named test asserting the property + invariant comment.

---

## Phase 1 session 3 — /simplify deferrals + Pentester deferrals (LAUNCH-BLOCKING)

Surfaced by the 3-reviewer /simplify pass + Pentester gate on `feat/listen-session3-redesign` 2026-05-11. The session-3 fixes that landed in-PR are recorded in the PRD verification block; the items below were filed as a follow-up so the main PR stayed scoped.

**Hard gate: every item in this section is launch-blocking** (consistent with the session 1+2 deferral policy).

#### S3-A1. `findSubmissionById` timing-oracle on `/listen/[id]`
- **Source:** Pentester HIGH-1, 2026-05-11.
- **What:** Logged-in attacker probing `/listen/[id]` with a random submissionId triggers a D1 SELECT regardless. Index hit vs miss is timing-distinguishable, so a session-bearing attacker can enumerate "submission exists" without ownership.
- **Why accepted-for-now:** Submission IDs are opaque CUID2 (~2^140 search space). The leak is binary "exists in D1" with no recipient/content info. Any logged-in user can already enumerate their own readings via `/my-readings`; this is a strictly weaker primitive.
- **Action:** Defer to Phase 4 hardening alongside the `crypto.timingSafeEqual` work (A-3). Cheap fix when it lands: speculatively call `findSubmissionRecipientUserId` even on no-session paths and discard, so all 3 signIn-producing branches do the same I/O.

#### S3-B1. Extract `applyTemplateVars(text, { firstName, readingName })` helper
- **Source:** /simplify Reuse R-3, 2026-05-11.
- **What:** Three sites template `{firstName}` / `{readingName}`: `Day7Delivery.tsx#template`, `resend.tsx#sendDay7Delivery` (subject), `ListenView.tsx#fillTemplate` (heading). Each is 2–3 lines of `replaceAll`. Drift class: someone adds `{readingPriceDisplay}` to one site, others silently miss it.
- **Action:** Lift to `src/lib/emails/template.ts` (or `src/lib/templating.ts`) exporting `applyTemplateVars(text, vars: Partial<{ firstName: string; readingName: string }>)`. Reuse from all 3 sites.

#### S3-B2. Typed `ListenOutcome` union shared across listen-page state + redirect routes
- **Source:** /simplify Quality Q-4, 2026-05-11.
- **What:** Three files (`src/app/listen/[id]/page.tsx`, `src/app/api/auth/magic-link/route.ts`, `src/app/api/auth/magic-link/verify/route.ts`) all reference the string literals `"sent"`, `"rested"`, `"throttled"` in URL search params / search-param checks. Drift risk: rename one without renaming the others.
- **Action:** Extract `type ListenOutcome = "sent" | "rested" | "throttled"` to a shared module (e.g. `src/lib/auth/listenOutcomes.ts`) + use across the 3 files.

#### S3-B3. State-forgery UX defense for `?error=rested` / `?sent=1` (Pentester LOW-1)
- **Source:** Pentester LOW-1, 2026-05-11.
- **What:** Attacker who knows a victim's submissionId can craft `https://withjosephine.com/listen/sub_x?error=rested` and trick the victim into clicking "Send me a fresh link". The form posts to `/api/auth/magic-link` which only sends email to the user-typed address — no destructive primitive. Confusion-only.
- **Action:** Accept. Document residual risk in privacy/security notes when launching. No code change.

#### S3-B4. Sanity-editor mailto subject header injection (Pentester LOW-2)
- **Source:** Pentester LOW-2, 2026-05-11.
- **What:** `copy.throttledMailtoSubject` / `copy.assetTroubleMailtoSubject` flow through `encodeURIComponent` then into a `mailto:` URL. Some mail clients still decode `%0D%0A` into header lines (`Cc:`, `Bcc:`). Threat actor must already be a Sanity editor — within their authorized role.
- **Action:** Accept OR add a Studio-side validation rule rejecting CR/LF in those fields. One-liner if it ships.

#### S3-B5. Audit row on magic-link throttle (Pentester LOW-3)
- **Source:** Pentester LOW-3, 2026-05-11.
- **What:** `/api/auth/magic-link` throttle fires before user lookup, so `user_id` is unknown. Currently silent. `writeAudit` accepts `userId: null`; filling this in would distinguish "throttled bursts from one IP" from "no traffic" in the audit table.
- **Action:** Add a `link_send_throttled` event_type + write on the rate-limit branch with `user_id: null`. Cheap addition for forensics.

#### S3-B7. `fetchCopyWithDefaults(loadDefaults, loadFetcher)` helper for Resend send paths
- **Source:** /simplify Reuse review on Phase 2 batch 2, 2026-05-11.
- **What:** Four send functions in `src/lib/resend.tsx` (`sendMagicLink`, `sendDay7Delivery`, `sendOrderConfirmation`, `sendDay2Started`) repeat the identical 4-line shape: lazy `await import(defaults)` + lazy `await import(fetch)` + `fetchX().catch(() => null)` + `{ ...DEFAULTS, ...(sanity ?? {}) }`. A `fetchCopyWithDefaults<T>(loadDefaults, loadFetcher)` helper would collapse 16 lines → 4 and centralize the swallow-error policy.
- **Why deferred:** The lazy-import is the load-bearing part (avoids pulling the Sanity client into the Resend worker bundle when emails are skipped). Abstracting the dynamic-import callbacks makes the bundler analysis harder to read. Land alongside S3-B1's `interpolate()` so the email-send path gets one canonical 2-line pattern in one PR.

#### S3-B8. Thank-you override fallback chain — drop the dead hardcoded literals
- **Source:** /simplify Quality review on Phase 2 batch 2, 2026-05-11.
- **What:** `src/app/thank-you/[readingId]/page.tsx:105-126` has 6 fields using `override?.x ?? thankYouPageContent?.x ?? "hardcoded literal"`. The seed script (`scripts/seed-customer-emails-and-pages.mts` + existing `seed-content-wiring-sweep.mts`) makes the middle term guaranteed-present in any seeded dataset, so the hardcoded literal tail is dead in practice — only live as belt-and-braces if the singleton is ever deleted.
- **Why deferred:** Belt-and-braces value is small but real. Fixing means trusting the seed script to be the sole source of truth, which is a stronger guarantee than the current code accepts. Land when the editorial workflow has 1+ week of stable runtime.

#### S3-B6. Welcome-back ribbon — masked-email reveal in State 4
- **Source:** UX Engineer spec — "Check your email" + masked email + send-another link.
- **What:** The current `CheckEmailCard` doesn't actually render a masked email (no email is known at that point — the user just submitted the form to the listen page route which doesn't echo the submitted email back). The spec is aspirational; needs either (a) a query-param-encoded masked-email pass-through, or (b) "Check the email you just entered" copy that doesn't require the address.
- **Action:** UX Engineer pass to decide between (a) and (b). Pure copy decision if (b); ~10 lines if (a).

---

## Phase 1.5 (planned, not deferred)

These were always scoped out of Phase 1 by the booking-flow build PRD.

- **Day +14 follow-up email.** SPEC §13.E. Needs `/api/cron/email-day-14`
  + helper + verbatim copy from §13.E.
- **Mixpanel analytics.** PR-F — 17 events from SPEC §15.

---

## Next-version features (Phase 2)

Items not in current scope. Captured here so they don't drift; revisit
after launch + the staging/dev separation work lands.

### Server-side consent audit log
- **Source:** Max 2026-05-02 (PR-F1 review). Today the visitor's
  Accept/Decline choice for analytics consent lives only in their
  browser's localStorage under `josephine.consent`. That's enough to
  technically gate the SDK, but it's NOT a record we can produce if
  challenged by a regulator (GDPR Article 7(1) — "the controller shall
  be able to demonstrate that the data subject has consented").
- **What's missing:** an audit trail proving *who* consented, *when*,
  to *which version* of the privacy policy. localStorage can be cleared,
  spoofed, or wiped between sessions; it's not evidence.
- **Action:**
  - Add a `consent_record` table in D1 (or a `consentRecord` document
    type in Sanity if Josephine wants visibility in Studio): `{ id,
    anonymous_visitor_id, accepted_at, policy_version, accepted_categories,
    ip_hash, user_agent }`. The visitor ID is a random UUID generated
    at first visit and stored in localStorage alongside the consent
    state — never personal data.
  - Add a `policyVersion` field on the privacy `legalPage` doc in
    Sanity, manually incremented when material wording changes ship.
    Read at consent-record write time.
  - Add `/api/consent` route, called fire-and-forget from the Accept
    handler in `<AnalyticsBootstrap>`. Body: `{ visitor_id, policy_version,
    accepted_categories: ["analytics"] }`. Server hashes IP, captures
    user agent, writes the row.
  - Document the audit log itself in the privacy policy (it IS personal
    data — recursive disclosure required). Section "Records of consent."
- **Why deferred:** Regulatory enforcement risk for a single-practitioner
  site at this scale is near-zero unless someone files a specific
  complaint. The localStorage-only posture is a defensible starting
  point; the audit log is the next maturity step before scale or
  before adding marketing-driven processing (which the Phase-2
  newsletter waitlist below would also need).

### Embed Sanity Studio at `staging.withjosephine.com/studio` (nice-to-have)
- **Source:** Max 2026-05-06, after surfacing that Sanity Studio's Presentation tool can't iframe `staging.withjosephine.com` cleanly when CF Access is in the way. Workaround in place today: open staging.withjosephine.com in another tab, complete Access login, then Presentation iframe carries the cookie (works only if CF Access SameSite=None and browser third-party-cookie policies cooperate — fragile to Privacy Sandbox tightening).
- **What:** Mount Sanity Studio inside the Next.js worker at `staging.withjosephine.com/studio` using `next-sanity`'s `<NextStudio>` component. Studio shell + iframed preview content live on the same origin → Access cookie is first-party → no SameSite issue, no fragility.
- **Scope:**
  1. `pnpm add next-sanity sanity` to www (sanity already in studio/, lands in www too).
  2. New route `src/app/studio/[[...index]]/page.tsx` mounting `<NextStudio config={config}>`.
  3. Reference `studio/sanity.config.ts` so the embedded Studio uses the same schema (or extract to a shared module).
  4. Sanity Project Settings → API → CORS Origins → add `https://staging.withjosephine.com`.
  5. Optionally retire the hosted `withjosephine.sanity.studio` once embedded is verified — or keep it for prod-dataset edits without preview.
- **Why deferred:** the cross-tab login workaround is good-enough today. The embed is the architecturally cleaner answer (canonical "co-locate Studio with preview origin" pattern) and removes the SameSite-cookie fragility — worth doing when the workaround starts breaking or when Becky / Josephine want a smoother editor flow.
- **Effort:** 2–4 hours code + Sanity CORS config + verification.

### Sanity webhook sync — extend to copy referenced assets
- **Source:** PR-S5b1 sync endpoint scoping 2026-05-06.
- **What:** `/api/sanity-sync` syncs document edits from prod → staging via Sanity webhook → HMAC-verified endpoint → `getSanityWriteClient().createOrReplace()`. Asset documents (`sanity.imageAsset`, `sanity.fileAsset`) are explicitly skipped by the endpoint — Sanity asset binaries are stored per-dataset in Sanity's CDN, and copying just the asset doc to staging produces broken CDN URLs (the binary lives in the prod dataset's CDN path, not staging's).
- **Symptom:** if Becky uploads a NEW image in Studio (not editing existing), the doc's `image.asset._ref` points at a prod-only asset, and rendering on `staging.withjosephine.com` shows a broken image until a manual `pnpm seed:staging` re-seeds.
- **Action:** When the sync endpoint receives a doc with `image.asset._ref` fields, fetch the referenced asset from prod (Sanity API) and write it to staging too — including binary upload via `client.assets.upload()`. Recurse through reference chains. Test against a doc with multiple image refs.
- **Why deferred:** Becky's typical edits are text changes, not image uploads. The seed script is a manual recovery path until the asset auto-sync ships. Worth doing when image-upload edits become regular.

### "Fully booked" toggle with newsletter waitlist
- **Source:** Max 2026-05-01. Once Josephine is taking real bookings,
  there will be periods where she's at capacity and needs to pause
  intake without taking the site down.
- **What:** A Sanity-controlled switch that, when enabled, replaces
  the "Book a Reading" CTA with a "Fully booked for now" message and
  a newsletter signup form. Visitors can opt in to be notified when
  openings reappear.
- **Sanity schema (proposed):**
  - Site-wide kill switch on `siteSettings`: `acceptingNewBookings: boolean`.
  - Per-reading override on each `reading` doc: `acceptingNewBookings: boolean`
    (defaults to site-wide value if unset). Lets Josephine close
    Soul Blueprint while keeping Akashic Record open.
  - Editable copy fields on `siteSettings` for the closed state:
    `fullyBookedHeading`, `fullyBookedMessage`, `waitlistOptInLabel`,
    `waitlistConfirmationMessage`. All Sanity-driven, no hardcoded text.
- **UX states:**
  - **Open (current behavior):** reading card CTA → `/book/[reading]`.
  - **Closed:** reading card CTA → opens an inline form (no route
    change). Form fields: first name (optional), email (required,
    validated), opt-in checkbox **unchecked by default** (GDPR/PECR
    requires affirmative consent for marketing email).
  - On submit: success state with confirmation copy + close button.
- **Backend:**
  - New `/api/waitlist` route. Turnstile-gated like `/api/contact`.
  - Dual write: Sanity `waitlistSubscriber` doc (so Josephine sees
    signups in Studio) + Resend Audience (for later broadcast).
    Same dual-write pattern as bookings.
  - Double opt-in flow recommended: signup writes a `pending` row,
    sends a confirmation email with a tokenized link, link flips
    row to `confirmed` and adds to Resend Audience. Demonstrates
    consent for compliance.
- **"Openings available" trigger:**
  - V1: manual broadcast via Resend dashboard → Audience → Send
    campaign. No code needed beyond getting them into the audience.
  - V2 (later): Sanity field `nextOpeningAt: datetime` + cron
    that fires the campaign automatically. Skip until v1 is in use.
- **Privacy/legal updates required:**
  - `/privacy` policy must add a section covering the marketing list
    (purpose, lawful basis = consent, retention, withdrawal).
  - Every email needs an unsubscribe link. Resend handles this in
    their hosted templates — if we keep inline HTML emails, must
    add the link manually + wire the Resend unsubscribe webhook.
- **Scope estimate:** 1–2 days. Sanity schema add (4 fields + 1 doc
  type) + IntakeForm conditional render + new `<WaitlistForm>`
  component + `/api/waitlist` route + Resend Audience integration
  + 2 email templates (confirmation + welcome) + privacy policy
  copy update.
- **Sequencing:** after PR-F (Mixpanel) + the dev/staging/prod
  separation work. Phase-2 feature, not blocking initial launch.

---

### Apex unpark — Stripe live-mode flip target (captured 2026-05-06 during PR-S1)

Locked here because the dev/staging/prod separation plan deliberately scoped Stripe live-mode out (PR-S1 kept all 3 envs on test mode for now since prod apex is parked). When apex unparks for real customer traffic, this is the exact set of changes needed:

1. **Stripe (Live mode)** — register a live webhook endpoint at `https://withjosephine.com/api/stripe/webhook`, subscribe to the same event set as the existing test-mode webhook. Capture the live signing secret.
2. **Stripe (Live mode)** — create 3 new Payment Links (one per reading: Soul Blueprint $129, Birth Chart $99, Akashic Record $79) with `success_url = https://withjosephine.com/thank-you/{slug}?sessionId={CHECKOUT_SESSION_ID}`. Capture the URLs.
2a. **Stripe (Test mode existing PLs)** — during PR-S1 (2026-05-06) the existing 3 test-mode PL success_urls were pointed at `https://staging.withjosephine.com/thank-you/...` so staging QA works while apex is parked. After live-mode PLs replace them in production Sanity (step 3 below), the test-mode set can stay pointing at staging permanently — staging is the only consumer of the test-mode set going forward.
3. **Sanity production dataset** — update each `reading` doc's `stripePaymentLink` field to the new live-mode URL. Path: `*[_type == "reading" && slug.current == "<slug>"]`. Use Studio Presentation tool or `sanity documents create/replace` CLI mutation. Per the saved fetch-before-edit rule, fetch the live doc first, edit from that base.
4. **Worker production secrets** — `wrangler secret put STRIPE_SECRET_KEY` (paste `sk_live_*`), `wrangler secret put STRIPE_WEBHOOK_SECRET` (paste live signing secret from step 1).
5. **GH Environment production variables** — flip `NEXT_PUBLIC_UNDER_CONSTRUCTION` from `1` → `0`. Redeploy.
6. **Becky-coordination** — only proceed after Becky's reading delivery is complete. Her current booking flow uses the test-mode PLs; flipping mid-flight strands her transaction in test mode while the dataset says live.

Independence from staging-separation: this is fully orthogonal. None of the staging PRs depend on this; this doesn't block any staging PR. Lives in the apex-unpark plan when that's drafted.

---

## How to use this doc

When an item lands, delete it from this file. When a new "we'll defer
this" decision happens during a session, add it here so it doesn't drift
out of memory in a commit message.
