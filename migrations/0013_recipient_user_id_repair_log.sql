-- 0013_recipient_user_id_repair_log
--
-- Purpose-built audit table for the recipient_user_id repair script
-- (scripts/repair-recipient-user-id.mts). One row per repair attempt.
--
-- Why not re-use deletion_log: its `action` column carries a CHECK
-- constraint limited to ('started', 'completed', 'failed') — semantic
-- overload would lose the operation identity. Repairs and deletions are
-- separate workflows that benefit from independent indexes and queries.
--
-- Schema mirrors the deletion_log shape where it makes sense
-- (id + started_at + completed_at lifecycle + per-row failure isolation).

CREATE TABLE recipient_user_id_repair_log (
  id                       TEXT PRIMARY KEY NOT NULL,
  submission_id            TEXT NOT NULL,
  recipient_email_hash     TEXT NOT NULL,
  old_recipient_user_id    TEXT,
  new_recipient_user_id    TEXT NOT NULL,
  proposed_action          TEXT NOT NULL CHECK (proposed_action IN ('update', 'create-then-update')),
  status                   TEXT NOT NULL CHECK (status IN ('pending', 'completed', 'mirror-failed', 'failed')),
  failure_reason           TEXT,
  performed_by             TEXT NOT NULL,
  started_at               INTEGER NOT NULL,
  completed_at             INTEGER
);

CREATE INDEX idx_repair_log_submission_id ON recipient_user_id_repair_log (submission_id);
CREATE INDEX idx_repair_log_started_at    ON recipient_user_id_repair_log (started_at);

-- Recovery query for orphaned `pending` rows (process killed between
-- insertAuditPending and the subsequent D1/Sanity writes — leaves a
-- pending audit row with no completed_at). Run hourly during apply windows:
--
--   SELECT * FROM recipient_user_id_repair_log
--   WHERE status='pending'
--     AND started_at < (strftime('%s','now') * 1000) - 3600000;
--
-- For each result: verify against `submissions.recipient_user_id` to see
-- whether the D1 update landed; mark `failed` or re-derive `completed`.
