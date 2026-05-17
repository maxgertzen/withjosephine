-- Phase 4 — deletion_log. Append-only audit trail of every GDPR Art. 17
-- cascade. Retained indefinitely (compliance trail) — does NOT age out with
-- the 90-day backup window. See Phase 4 PRD `## Decisions`.
--
-- Cascade is async on three vendor surfaces (Stripe Redaction Jobs, Brevo
-- SMTP-log delete, Mixpanel data-deletions/v3.0). Tracking IDs let a future
-- reconciliation cron poll vendor status and update completed_at when all
-- three confirm. Phase 4 itself sets completed_at when all four async submits
-- return 2xx — vendor confirmation is a follow-up.
--
-- email_hash is SHA-256(email) at deletion time — survives `user` row removal
-- so an audit query "did Bob's data get deleted?" still resolves.
--
-- ip_hash uses the same daily-rotating salt as listen_audit (Phase 1). Per
-- PRD ISC-A4, raw IP MUST NOT land in this table.

CREATE TABLE deletion_log (
  id                       TEXT PRIMARY KEY NOT NULL,
  user_id                  TEXT NOT NULL,
  email_hash               TEXT NOT NULL,
  performed_by             TEXT NOT NULL,
  action                   TEXT NOT NULL CHECK (action IN ('started', 'completed', 'failed')),
  started_at               INTEGER NOT NULL,
  completed_at             INTEGER,
  submission_ids_json      TEXT NOT NULL DEFAULT '[]',
  partial_failures_json    TEXT NOT NULL DEFAULT '[]',
  stripe_redaction_job_id  TEXT,
  brevo_smtp_process_id    TEXT,
  mixpanel_task_id         TEXT,
  ip_hash                  TEXT
);

CREATE INDEX idx_deletion_log_user_id    ON deletion_log (user_id);
CREATE INDEX idx_deletion_log_started_at ON deletion_log (started_at);
