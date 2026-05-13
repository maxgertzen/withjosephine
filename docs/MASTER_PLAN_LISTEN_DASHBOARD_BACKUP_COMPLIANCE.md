# Master Plan — Listen + Dashboard + Backup + Compliance + Gifting

**Status:** locked 2026-05-09 via 4-vantage developer council (Senior Backend Dev, UX Engineer, System Architect, Privacy/Compliance Counsel) with Explore + Research subagents. Source PRD: `www/MEMORY/WORK/20260509-202915_master-plan-4-phase-prds/PRD.md`.

**REVISION 2026-05-09 (post-spike):** Phase 1 expanded from per-submission scope → **user-model auth** after Max-questioning revealed the per-submission scope was over-strict for the repeat-buyer + gift-recipient cases. New **Phase 5 — Gifting feature** added for "Alice buys reading, schedules delivery, Bob fills intake + listens."

**Sequencing:** 1 → 2 → 3 → 4 → 5. Each phase has its own PRD so a future session can pick up cold without drift.

| Phase | Title | PRD | Effort |
|-------|-------|-----|--------|
| 1 | Magic-link listen page + proxied file delivery + **user-model auth** | `MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md` | ~2.5 sessions |
| 2 | #4b dashboard restructure + listened tracking | `MEMORY/WORK/20260509-202915_phase2-dashboard-listened-tracking/PRD.md` | ~1 session |
| 3 | Sanity dataset backup cron + retention purge | `MEMORY/WORK/20260509-202915_phase3-sanity-backup-cron/PRD.md` | ~1 session |
| 4 | Compliance hardening — cascade-by-user, Art. 9 consent, Art. 20 export | `MEMORY/WORK/20260509-202915_phase4-compliance-hardening/PRD.md` | ~1 session |
| 5 | **Gifting feature — recipient-fills-intake + purchaser-scheduled delivery** | `MEMORY/WORK/20260509-202915_phase5-gifting/PRD.md` (TBD) | ~2.5 sessions |

Brevo Phase 1 (newsletter) is **parallel-safe** with all of these — see `www/MEMORY/WORK/20260509-181221_emailcrm-stack-rediscussion/PRD.md`.

---

## Cross-phase decisions (locked — every phase respects these)

### Authentication (Phase 1 establishes; Phases 2 + 4 + 5 consume)

- **Library: NONE — hand-rolled magic-link.** Spike resolved 2026-05-09 with NO-GO on Better Auth. Reasons recorded in `MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md → Decisions → Spike resolution`. Hand-rolled implementation: ~150 LOC, Workers Web Crypto + D1 sessions table + `__Host-`-prefixed signed cookie.
- **Identity model: USER-LEVEL (revised 2026-05-09).** Email = identity. Same email → same user → access to all their readings. Privacy policy must declare this linkage. Repeat-buyer UX wins; per-submission scope was over-strict. Created server-side on first booking — no signup form, no login form, no password, no account dashboard required at launch (just a listen page that may show sibling readings).
- **Surface contract:** `requireListenSession(submissionId)` helper resolves submission → recipient_user_id → checks active session.user_id matches. Cross-user denial enforced.
- **Day-7 email** addresses the recipient (gift recipient OR self-purchaser, depending on submission). Magic-link click → user.id session. Click again later from another device → re-auth via email-match.
- **Cookie: `__Host-`-prefixed, HttpOnly, Secure, SameSite=Lax, Path=/, max-age 7 days.** Scope = JWT claim with `sub: submissionId, exp: 7d` — explicitly **per-submissionId** to avoid Art. 9 cross-booking linkability.
- **Magic-link: 24h expiry, single-use** (`allowedAttempts: 1`). Customer-friendly window (lunch-to-dinner click pattern) + load-bearing single-use enforcement.
- **No IP binding.** UA-fingerprint hash audit-log instead.
- **Rate limits via Cloudflare Rate Limiting binding (NOT hand-rolled D1 counters):**
  - `POST /api/auth/magic-link` — 3/IP/15min, 5/email/hour
  - `GET /api/auth/magic-link/verify` — 10/IP/min
  - `GET /listen/[id]/audio` — 60/IP/min (post-auth)
- **Existing HMAC token system: dropped.** Site is not yet live; no migration needed. Rip `src/lib/listenToken.ts` + `src/app/listen/[token]/page.tsx`. Keep `src/lib/hmac.ts` (cron-auth still uses it).

### File delivery (Phase 1 establishes)

- **Pattern: passthrough Response.** `new Response(upstream.body, { status, headers: filtered(upstream.headers) })`. No buffering. CPU stays low. Streams scale to multi-MB voice notes without hitting 128MB Workers memory cap.
- **Range request handling: full passthrough.** Worker reads incoming `Range`, forwards to Sanity CDN, returns Sanity's `Accept-Ranges` + `Content-Range` headers. Audio scrubbing works.
- **Sanity asset URLs never reach the browser.** Customer hits `/listen/[id]/audio` and `/listen/[id]/pdf` only.
- **Headers per route:**
  - Audio: `Content-Disposition: inline`
  - PDF: `Content-Disposition: attachment; filename="reading.pdf"`

### Schema additions (Phase 1 + Phase 2 land together; Phase 4 reads)

D1 tables added:
- `listen_audit (submissionId, eventType[link_issued|link_redeemed|link_expired|listen_session|export_request|deletion_request], timestamp, ipHash, userAgentHash, success)` — 12-month retention
- `deletion_log (submissionId, requestedAt, completedAt, performedBy, stripeRedactionJobId)` — append-only, indefinite retention (compliance audit)
- Better Auth's session/user tables (or hand-rolled equivalents): scoped per-submissionId, no global account model

Sanity submission schema additions:
- `listenedAt: datetime` (Phase 2) — first successful audio-Range request to `/api/listen/[id]/audio` writes via `setIfMissing`; null until then. **Trigger updated 2026-05-10 from "magic-link verify" to "audio-range" per Max's PM-decision D-3** (audio-range = actual play signal; session-create only proves access intent). See `MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md` → `## Decisions → Session 2/3 design decisions`.

### File-system + R2 architecture (Phase 3 establishes)

- **Backup bucket:** new R2 bucket `josephine-backups` (separate from `josephine-photos` and `josephine-photos-staging`)
- **Bucket Locks enabled** — write-once retention, takes precedence over lifecycle (defends against API-token-compromise shortening retention)
- **Lifecycle rules:**
  - `backups/weekly/<YYYY-WW>/` — purge after 90 days
  - `backups/monthly/<YYYY-MM>/` — purge after 3 years (matches reading-content retention floor)
- **Encryption:** R2 default at-rest + bucket-level distinct KMS key (cheap; defends against primary-key compromise leaking cold copies)
- **Cross-region replication:** NOT included (R2 doesn't support natively; would need app-layer S3-sync to a secondary). Out of scope for soft-launch.

### Observability (every phase contributes)

New Mixpanel events (extend existing `server-events.ts`):
- `magic_link_requested` — `{ submission_id, source: "delivery_email" | "re_auth_form" }`
- `magic_link_verified` — `{ submission_id, link_age_seconds }`
- `listen_session_started` — `{ submission_id, ua_hash }`
- `delivery_listened` — already exists; fires from auth event now (not page-load)
- `backup_completed` — `{ backup_type: "weekly" | "monthly", duration_ms, asset_count, ndjson_bytes, total_bytes }`
- `deletion_requested` — `{ submission_id, performed_by, completed: bool }`
- `data_export_requested` — `{ submission_id, completed: bool }`

Sentry:
- 5xx errors on auth verify or backup cron page
- NOT on rate-limit hits (4xx, expected)

### Compliance (Phase 4 ships; every phase pre-respects)

- **Tax retention: 6 years.** UK sole trader, not tax resident → HMRC self-assessment retention floor 5y + 1y buffer = 6y. Applies to `financial_records` table only (amount, date, country, stripe_session_id, paid_at) — separable from reading content.
- **Reading content retention: 3 years.** Voice note + PDF + intake responses + photo + consentSnapshot.
- **Brevo audience retention: until unsubscribe** (separate consent base).
- **Audit log retention: 12 months** (security record, Art. 5(c) minimization).
- **Deletion log retention: indefinite** (compliance trail).
- **Two-checkbox consent at intake**: separate Art. 6 (ordinary processing) and Art. 9 (special-category, explicit) — non-negotiable per ICO guidance for spiritual/religious-belief data.
- **Backup beyond-use posture:** Deletion takes effect on live systems immediately; backups age out within 90 days; restoration runbook includes a "post-restore deletion replay" step.
- **Stripe deletion = anonymization, not hard-delete.** Use Redaction Jobs API (not just `customer.delete`). Financial metadata stays per Stripe's own retention.

---

## Phase 5 — Gifting feature (specification)

**Decision (locked 2026-05-09):**
- **Recipient fills the intake.** Privacy-respecting (purchaser doesn't see recipient's birth answers). Two-step flow: Alice pays + schedules → Bob receives claim email at scheduled time → Bob does intake → 7-day clock starts from Bob's submission → Bob receives delivery email.
- **Purchaser schedules delivery.** Alice picks "send now" or a future `gift_send_at` date (e.g., Bob's birthday). Cron checks pending gifts; fires recipient claim email at the scheduled moment.
- **Refund policy:** full refund if Alice cancels BEFORE recipient claim email fires. After Bob has been notified (anonymity broken), no refund. After Bob completes intake (Becky may have started work), absolutely no refund.

**Schema additions (Phase 5):**
- `submission` gains: `is_gift` (boolean), `purchaser_user_id` (FK to user, the buyer), `recipient_user_id` (FK to user, the listener — populated when Bob claims), `gift_send_at` (datetime, when claim email fires), `gift_message` (text, optional Alice→Bob note), `gift_claim_token_hash` (single-use token for Bob's claim flow), `gift_claimed_at` (datetime).
- For self-purchase: `is_gift = false`, `purchaser_user_id = recipient_user_id`.
- For gift: distinct user IDs.

**New flows:**
- Booking entry adds "For me / This is a gift" toggle. Gift path adds: recipient name, recipient email, gift message (optional), send-at picker (now / scheduled).
- Stripe webhook creates submission with `recipient_user_id = NULL` (pending claim) + `purchaser_user_id` set.
- New cron `/api/cron/gift-send-claim-emails` checks `is_gift = true AND gift_send_at <= now AND gift_claim_email_fired_at IS NULL`. Fires claim email. Marks fired.
- Claim email contains a magic link to a CLAIM page (different from listen page): "Alice gifted you a reading — claim it." Click → Bob authenticates → user record created → intake form → submission updated with `recipient_user_id = bob.id`, `gift_claimed_at = now`.
- After Bob completes intake, day-7 clock starts (existing crons handle delivery).
- Alice's confirmation: "Your gift will be sent to Bob on <date>" + status updates ("Bob hasn't claimed yet" / "Bob is preparing their reading" / "Bob's reading was delivered").

**Privacy disclosures (Phase 5 + Phase 4):**
- Privacy policy section on gifting: purchaser sees ONLY status (claimed / not claimed / delivered). Purchaser does NOT see intake content, voice note, or PDF.
- Gift recipient knows who gifted them (purchaser's name in the claim email).
- Listened-status: purchaser MAY see a generic "Bob received their reading" indicator. Confirm with Privacy Counsel at PRD time.

## Inter-phase dependencies (the graph)

```
Phase 1 (user-model auth) ──provides──▶ requireListenSession() ──used-by──▶ Phase 4 (cascade), Phase 5 (claim flow)
Phase 1 (audio route) ──provides──▶ /api/listen/[id]/audio Range handler ──used-by──▶ Phase 2 (listenedAt write fires here, NOT signIn — D-3)
Phase 1 (user table) ──provides──▶ user.id ──used-by──▶ Phase 5 (purchaser_user_id, recipient_user_id)
Phase 2 (schema) ──provides──▶ listenedAt field ──used-by──▶ Phase 3 (backed-up), Phase 4 (cascade target)
Phase 3 (backup) ──provides──▶ deletion-replay hook ──used-by──▶ Phase 4 (deletion log)
Phase 4 (audit log) ──provides──▶ listen_audit table ──used-by──▶ Phase 1 (audit writes)
Phase 5 (gift schema) ──extends──▶ submission table; depends on Phase 1's user table
```

**Phase 4 has a circular dependency with Phase 1** (Phase 1 needs the audit table; Phase 4 designs it). Resolution: **Phase 1 ships its OWN minimal `listen_audit` schema in its migration**; Phase 4 extends it if needed. Document this in both PRDs.

**Phase 2 listenedAt depends on Phase 1's audio-range route handler** (session 2 of Phase 1's 3-session plan). Trigger is `/api/listen/[id]/audio` first-Range response per submission, NOT session-create / magic-link redeem (decision D-3 locked 2026-05-10). Locked sequencing 1→2→3→4→5 avoids out-of-order shipping. Phase 2 PRD ISC-15 + ISC-16 + ISC-A3 reflect this trigger.

---

## Open questions (deferred — won't block PRDs from locking)

1. **Becky's admin email separate from `hello@`** — Phase 4 detail. Privacy Counsel flagged it as an audit-trail liability if Becky and Josephine share `hello@` credentials. Decide before Phase 4 admin actions ship.
2. **Self-service deletion trigger** — admin-only for soft-launch; revisit at ~50 bookings/month per Privacy Counsel. Phase 4 PRD documents the trigger condition.
3. **Re-auth email subject line** — UX Engineer suggested "Welcome back to your reading" vs reusing "Your {readingName} is ready." Cosmetic; default to UX recommendation, Max can override at PRD-execution time.
4. **Tax retention 6yr ↔ 7yr buffer** — locked at 6 years. If Josephine's accountant wants 7, change one constant in Phase 4 PRD. Cheap to flex later.

---

## Council debate transcript

Full council outputs preserved in `www/MEMORY/WORK/20260509-202915_master-plan-4-phase-prds/PRD.md` under `## Decisions`. Includes:
- Backend Dev verifications (Better Auth + Workers + D1 feasibility, file-streaming pattern, Sanity HTTP Export API)
- UX Engineer verbatim Day-7 email copy + 5 listen-page UX states + privacy policy paragraphs
- System Architect Stripe Redaction Jobs API + R2 bucket-locks research
- Privacy Counsel Art. 9 templates + two-checkbox consent + HMRC retention floor

---

## Brevo Phase 1 — parallel-safe non-blocker

Brevo newsletter (separate phase from these 4) can run in parallel. It touches:
- A new `news.withjosephine.com` subdomain (separate DKIM/SPF — does not affect transactional sender)
- A new Brevo audience (separate from any future paid-customer audience)
- A new opt-in form on the site

It does NOT touch any of the 4 phases above. Code work for Brevo is gated on Max-side ops (Brevo signup + DNS + Becky editor account + API key).
