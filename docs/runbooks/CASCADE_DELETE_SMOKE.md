# Cascade Delete Smoke

GDPR Art. 17 cascade-delete operation. **IRREVERSIBLE** — use a test submission only. Maintainer-only.

## What this exercises

The full Phase 4 cascade:
- Sanity Studio doc action ("Delete customer data")
- Admin endpoint auth (`ADMIN_API_KEY`)
- R2 photo delete
- Sanity doc + assets delete
- D1 row delete
- Stripe Redaction Job creation
- Mixpanel data-deletion API call
- `deletion_log` audit rows (started + completed pair)

Brevo deletion is part of the same cascade in production; it returns "not configured" on staging while `BREVO_API_KEY` is unset (expected).

## Pre-requisites

- `ADMIN_API_KEY` + `MIXPANEL_SERVICE_ACCOUNT_USERNAME` + `MIXPANEL_SERVICE_ACCOUNT_SECRET` set on the target worker:
  ```sh
  cd www
  wrangler secret put ADMIN_API_KEY --env staging
  wrangler secret put MIXPANEL_SERVICE_ACCOUNT_USERNAME --env staging
  wrangler secret put MIXPANEL_SERVICE_ACCOUNT_SECRET --env staging
  ```
  (Generate `ADMIN_API_KEY` first via `openssl rand -base64 32`; save to password manager.) Drop `--env staging` for production.
- A test submission you don't mind losing forever — easiest path is to run Journey 1 of [`MANUAL_SMOKE_TEST.md`](../MANUAL_SMOKE_TEST.md) and use the resulting submission.

## Steps

1. Open Sanity Studio on the target dataset → 📬 Submissions → open the test submission.
2. Click the "..." menu in the top-right → confirm **"Delete customer data"** action is visible (red icon).
3. Click "Delete customer data" → a branded dialog opens.
4. Read the modal copy — confirms it explains Stripe **redaction** (not deletion) + 6yr tax retention.
5. Type `DELETE` in the confirmation field.
6. Paste the admin token into the admin-token field.
7. Click **Run cascade delete**.
8. Toast appears within ~5–15s — should say "Customer data cascade complete" (success) or list partial failures.
   - **Expected on staging:** `brevo-contact: not configured`, `brevo-smtp-log: not configured` (BREVO_API_KEY absent).
   - On production these should NOT appear.
9. Verify in Studio: the submission doc is gone (vanished from the list).
10. Query D1 for the audit rows:
    ```sh
    wrangler d1 execute withjosephine_bookings --env staging \
      --command "SELECT * FROM deletion_log ORDER BY started_at DESC LIMIT 5"
    ```
    Expect **2 rows** for the user_id: `action=started` + `action=completed`. The completed row has `stripe_redaction_job_id` non-null, `mixpanel_task_id` non-null, and `partial_failures_json` matching the toast.
11. Verify in Mixpanel: Project Settings → Data Deletion Requests → the request appears with state `pending` or `processing` (vendor SLA up to 30 days).
12. Verify in Stripe (test-mode dashboard for staging; live-mode for production): Settings → Privacy → Redaction Jobs → the job appears with status `validating`.
13. Re-trigger the cascade on the same (now-deleted) submission → toast should say "Submission has no recipient user" — idempotency check, the admin endpoint drops to the "find returned null" path with an empty-body 404.

## Pass criteria

- All 13 steps complete.
- `deletion_log` shows the started/completed pair with non-null Stripe + Mixpanel job ids.
- Mixpanel + Stripe vendor dashboards confirm the deletion is queued.
- Re-trigger returns 404 (idempotent refusal).

## Common failures

- **Admin token mismatch.** Re-paste from the password manager; whitespace or extra chars break the timing-safe compare.
- **Mixpanel auth shape wrong.** `wrangler tail` shows the per-step partial-failure string; check `MIXPANEL_SERVICE_ACCOUNT_USERNAME` includes the project-id suffix per Mixpanel's docs.
- **Studio doc action missing.** Studio cache; hard-refresh + reopen the submission.
