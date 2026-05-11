# Launch Smoke Test Plan

Per-stage smoke tests that need to run BEFORE `feat/listen-redesign-and-gifting` merges to `main`. The vitest suite (1094 tests) + Pentester pass + `/simplify` pass cover the code-quality and unit-integration layer. These smoke tests cover the gap they don't reach: actual behavior in a browser / against real vendor APIs.

Run them in the order below. Each section is independent — failing one doesn't block running the others. Track results in a checklist as you go.

---

## Stage A — Run NOW (already deployable; staging is current with parent branch HEAD)

### A-1. Privacy page visual check — PRODUCTION (verifies migrate-privacy-retention.ts landed cleanly)

**What it covers.** The retention migration ran 2026-05-11 against the production Sanity dataset (verified at script run time: 4 blocks landed, `lastUpdated` bumped to 2026-05-11). Visual check confirms the content renders correctly to a customer browser, not just that the Sanity doc has the blocks.

**Steps:**
1. Open `https://withjosephine.com/privacy` in an incognito window.
2. Scroll to the bottom of the privacy policy.
3. Confirm an H2 reading **"Retention and your rights"** appears.
4. Confirm 3 paragraphs immediately under that H2:
   - "When you book a reading we collect your name, email…"
   - "Your reading content (intake answers, photo, voice note, PDF) is retained for **3 years**… Your transactional record… is retained for **6 years** to satisfy UK HMRC…"
   - "You have the right to access, correct, port, or delete your data… Email **hello@withjosephine.com** with the subject 'Privacy request'…"
5. Confirm any `Last updated:` indicator shows `2026-05-11`.

**Pass.** All 4 visible + retention years render as "3 years" / "6 years" / email address visible.
**Fail.** Open Sanity Studio production → legalPage `privacy` doc → check the body array. The 4 block keys are `priv-retention-2026-05-{h2,p1,p2,p3}`. Re-run the script if any are missing.

---

## Stage B — Run BEFORE main-merge (requires staging secrets set)

These tests run on staging against the `feat/listen-redesign-and-gifting` deployment. They need the 3 staging secrets set first:

```bash
cd www
wrangler secret put ADMIN_API_KEY --env staging
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_USERNAME --env staging
wrangler secret put MIXPANEL_SERVICE_ACCOUNT_SECRET --env staging
```

(Generate `ADMIN_API_KEY` first via `openssl rand -base64 32`, save to password manager.)

### B-1. Booking flow end-to-end smoke (staging)

**What it covers.** The actual customer-facing booking flow — entry page → intake form → consent checkboxes → payment redirect → thank-you page → Stripe webhook → emails. Vitest covers each component; this verifies they integrate against real Sanity + real Stripe sandbox + real Resend.

**Pre-requisites.**
- Staging worker is current with parent branch HEAD (auto-deploys on push).
- Stripe is in test mode for staging.
- `RESEND_DRY_RUN` should be unset on staging (so emails actually send to your inbox).

**Steps:**
1. Open `https://staging.withjosephine.com` in an incognito window.
2. Click **Book a Reading** → pick **Soul Blueprint** ($179).
3. Click through the vellum-letter entry page CTA.
4. Fill out the intake form on each page (use your own email + DOB; use a real-looking but fake name).
5. On the consent page (final step), confirm you see **5 checkboxes**: entertainment disclaimer + cooling-off + Terms/Privacy + **Art. 6** + **Art. 9**. Check all required (4 — newsletter is optional).
6. Click **Continue to payment** → you redirect to Stripe Checkout.
7. Pay with the Stripe test card `4242 4242 4242 4242` (any future expiry, any 3-digit CVC, any postal).
8. Stripe redirects you back to `https://staging.withjosephine.com/thank-you/{submissionId}` — confirm the per-reading thank-you copy renders.
9. Within ~30s, check the email you used: **Order Confirmation** + **Notification to Josephine** should arrive.
10. Open Sanity Studio staging → 📬 Submissions → confirm the new submission appears with status `paid`, your name as the title, the photo preview if uploaded, the intake answers, consentSnapshot.art6Consent + art9Consent both populated.

**Pass.** All 10 steps complete; the Sanity submission has BOTH consent records + paid_at populated.
**Fail anywhere.** Check Worker logs (`wrangler tail --env staging`) and Sanity Studio for the submission state.

### B-2. Magic-link + listen-flow smoke (staging)

**What it covers.** Phase 1 auth — magic link request, email delivery, verify route, session cookie, listen page rendering, audio/PDF proxy auth gate.

**Pre-requisites.** B-1 completed (you have a paid submission in staging). For now, Josephine hasn't delivered a real voice note + PDF for the test submission — so use one that already has voiceNote + readingPdf populated in staging, OR upload mock files via Studio.

**Steps:**
1. In Studio staging, open the test submission → set `voiceNote` to any audio file + `readingPdf` to any PDF + `deliveredAt` to "now".
2. Open `https://staging.withjosephine.com/listen/{submissionId}` in a fresh incognito window.
3. Confirm the `signIn` state renders (no session cookie yet).
4. Enter the email you booked under → click **Send magic link**.
5. Confirm the `checkEmail` state renders.
6. Check your inbox — magic link email arrives within ~30s.
7. Click the link → you land on `/auth/verify` → redirected to `/listen/{submissionId}?welcome=1` with a welcome ribbon.
8. Audio player + PDF preview both render. Click play on the audio → it starts. Open the PDF → it renders.
9. Open Studio → confirm `listenedAt` on the submission populated within ~10s of clicking play (fire-and-forget Sanity mirror).

**Pass.** All 9 steps complete; `listenedAt` populated.
**Fail.** Most likely Worker log issue or Sanity write permission. Check `wrangler tail --env staging`.

### B-3. Art. 20 export endpoint smoke (staging)

**What it covers.** Phase 4 export endpoint — cookie-gated, throttle, idempotency, ZIP build, R2 upload, signed URL, Resend email.

**Pre-requisites.** B-2 completed (you have a session cookie on staging).

**Steps:**
1. In the same browser as B-2 (with valid session cookie), open DevTools → Network tab → enable "preserve log".
2. Run in the browser console:
   ```js
   await fetch('https://staging.withjosephine.com/api/privacy/export', { method: 'POST' });
   ```
3. Expect a 202 response with `{ submissionCount: 1, expiresInSeconds: 604800 }`.
4. Within ~30s, check your inbox — **"Your Josephine data export"** email arrives.
5. Open the link in the email — it 200s with a ZIP download. Download it.
6. Unzip locally → confirm structure: `README.txt` + `{submissionId}/intake.json` + `consent.json` (with Sanity consentSnapshot inlined, Art. 6 + Art. 9 visible) + `transaction.json` + `delivery.json` + `photo.*` + `voice-note.*` + `reading.pdf`.
7. Re-fire the same fetch immediately → expect **429** + body mentions `Export already requested recently`. Confirms 5-min throttle.

**Pass.** Steps 1–7 all complete; ZIP contains the full layout; re-fire returns 429.
**Fail on 403.** Session cookie expired or absent — repeat B-2 first.
**Fail on 500.** R2 upload or ZIP build — check `wrangler tail`.

### B-4. Cascade delete smoke (staging) — IRREVERSIBLE — use a test submission only

**What it covers.** Phase 4 cascade — the Sanity Studio doc action, admin endpoint auth, R2 photo delete, Sanity doc + assets delete, D1 row delete, Stripe Redaction Job creation, Mixpanel data-deletion call, `deletion_log` audit rows.

**Pre-requisites.**
- ADMIN_API_KEY + MIXPANEL_SERVICE_ACCOUNT_USERNAME + MIXPANEL_SERVICE_ACCOUNT_SECRET all set on staging (see top of Stage B).
- A test submission you don't mind losing forever (use the B-1 submission or create another).

**Steps:**
1. Open Sanity Studio staging → 📬 Submissions → open the test submission.
2. Click the "..." menu in the top-right → confirm "Delete customer data" action is visible (red icon).
3. Click "Delete customer data" → a branded dialog opens.
4. Read the modal copy — confirms it explains Stripe redaction (not deletion) + 6yr tax retention.
5. Type `DELETE` in the confirmation field.
6. Paste the admin token (from your password manager) into the admin-token field.
7. Click **Run cascade delete**.
8. Toast appears within ~5–15s — should say "Customer data cascade complete" (success) OR list partial failures. **Expected partial-failures during this test (because BREVO_API_KEY not set on staging):** `brevo-contact: not configured`, `brevo-smtp-log: not configured`. Everything else should be clean.
9. Verify in Studio: the submission doc is gone (vanished from the list).
10. Query staging D1 for the audit rows:
    ```bash
    wrangler d1 execute withjosephine_bookings --env staging \
      --command "SELECT * FROM deletion_log ORDER BY started_at DESC LIMIT 5"
    ```
    Expect **2 rows** for the user_id: action=`started` + action=`completed`. The completed row has `stripe_redaction_job_id` non-null + `mixpanel_task_id` non-null + `partial_failures_json` includes Brevo "not configured".
11. Verify in Mixpanel: Project Settings → Data Deletion Requests → the request appears with state `pending` or `processing` (vendor SLA up to 30 days).
12. Verify in Stripe (test-mode dashboard): Settings → Privacy → Redaction Jobs → the job appears with status `validating`.
13. Re-trigger the cascade on the same (now-deleted) submission → Studio toast should say something like "Submission has no recipient user" (idempotency holds — refusal is empty-body 404; admin endpoint dropped to "find returned null" path).

**Pass.** All 13 steps; deletion_log shows the 2-row pair; vendor dashboards confirm.
**Fail.** Most likely admin token mismatch or Mixpanel auth shape. `wrangler tail` shows the cascade's per-step partial failure strings.

### B-5. Stripe sandbox round-trip — extra coverage (staging)

**What it covers.** A repeat of B-1's Stripe path but with explicit attention to: webhook idempotency, `financial_records` row creation, country extraction, atomic dbBatch.

**Steps:**
1. Run B-1 again with a different email + name.
2. Wait for the webhook to fire (~5s after Stripe redirect).
3. Query staging D1:
    ```bash
    wrangler d1 execute withjosephine_bookings --env staging \
      --command "SELECT submission_id, paid_at, amount_paid_cents, amount_paid_currency, country, retained_until FROM financial_records ORDER BY paid_at DESC LIMIT 3"
    ```
    Expect a row with `amount_paid_cents = 17900` (Soul Blueprint $179), `amount_paid_currency = 'usd'`, `country = 'US'` (if you used the test card with US billing), `retained_until` = `paid_at + 6 years`.
4. Confirm idempotency: replay the webhook (Stripe Dashboard → Events → resend) → no duplicate financial_records row (PRIMARY KEY on submission_id + INSERT OR IGNORE).

**Pass.** Row exists with correct values; replay doesn't duplicate.

---

## Stage C — Run AFTER main-merge (production)

### C-1. Privacy page visual check — production

Repeat A-1 but on the production URL. Already done if A-1 ran (production was the dataset A-1 targeted).

### C-2. Production cascade smoke-test — use a throwaway test customer ONLY

**Pre-requisites.**
- Production secrets set (per `POST_LAUNCH_BACKLOG.md` → "Phase 4 — production secrets + R2 lifecycle runbook"):
  ```bash
  wrangler secret put ADMIN_API_KEY
  wrangler secret put MIXPANEL_SERVICE_ACCOUNT_USERNAME
  wrangler secret put MIXPANEL_SERVICE_ACCOUNT_SECRET
  ```
- A throwaway test submission in production. **DO NOT run against a real customer.** Easiest path: book a test reading at production using a personal email + Stripe test card (Stripe is in test mode until apex-unpark; webhooks still fire).

**Steps:** Repeat B-4 but against `withjosephine.sanity.studio/production` and production D1.

### C-3. Production Stripe sandbox round-trip

Repeat B-5 against production. Stripe live mode hasn't flipped yet, so this still uses test cards.

### C-4. Holding page / apex lockdown verification

**What it covers.** Confirm the soft-launch hold gate is intact — apex serves the holding page, `/book/*` paths require allowlisted email.

**Steps:**
1. Open `https://withjosephine.com` in incognito — expect the holding page (not the homepage).
2. Try `https://withjosephine.com/book/soul-blueprint` — expect a 403 or redirect to holding (depends on the middleware behavior).
3. Add `?preview=<allowlist-token>` (per the existing `feedback_private_launch_default_closed` memory) → expect the booking page renders.

**Pass.** Holding page on apex; preview tokens unlock; no anonymous access to booking.

---

## Stage D — Operational, separate from launch (when each ships)

- **D-1. Newsletter signup smoke** — when Brevo Phase 1 ships OR a different provider is wired. Form lives at TBD; smoke = subscribe with own email, confirm double-opt-in email arrives, click confirm, confirm contact appears in vendor dashboard.
- **D-2. Phase 5 gifting flow smoke** — when Phase 5 lands. Will cover purchaser → recipient flow + claim email + 3-tier refund cliffs.
- **D-3. GDPR consent banner audit visual check** — after the consent-banner sub-processor audit PR lands (separate work). Confirms the banner copy lists all current sub-processors (Mixpanel + Clarity at minimum).
- **D-4. F-10 Resend domain verification** — DNS check via `dig` for SPF/DKIM/DMARC records; send a test email from the Resend dashboard before opening to real traffic.

---

## Quick reference — what's actually launch-blocking

| Test | Required before main-merge? | Why |
|---|---|---|
| A-1 (privacy page visual) | YES | Already ran the migration — visual confirms it rendered |
| B-1 (booking E2E) | YES | Core commerce path |
| B-2 (magic-link + listen) | YES | Core Phase 1 auth + delivery path |
| B-3 (Art. 20 export) | YES | Compliance feature; needs to actually work |
| B-4 (cascade delete) | YES | Compliance feature; auth-sensitive surface |
| B-5 (Stripe round-trip extra) | RECOMMENDED | Catches financial_records / atomic-write regressions |
| C-1 (privacy page prod) | Already done as A-1 | n/a |
| C-2 (production cascade) | YES | Verify production secrets set correctly |
| C-3 (Stripe production round-trip) | YES | Verify webhook works in production with real secrets |
| C-4 (apex lockdown) | YES | Verify soft-launch posture intact |
| D-1 (newsletter) | NO | Parallel-safe; ship when ready |
| D-2 (gifting) | When Phase 5 ships | Part of Phase 5 acceptance |
| D-3 (consent banner) | When that PR ships | Part of that PR's acceptance |
| D-4 (Resend DNS) | YES | F-10 is the original Max-action — still launch-blocking |
