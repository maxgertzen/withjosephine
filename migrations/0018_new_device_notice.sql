-- ua_hash columns are nullable so pre-migration redemptions read as
-- baseline=NULL and the detection logic skips silently.

ALTER TABLE listen_token_redemptions ADD COLUMN ua_hash TEXT;
ALTER TABLE library_token_redemptions ADD COLUMN ua_hash TEXT;

CREATE TABLE IF NOT EXISTS listen_device_notifications (
  submission_id TEXT NOT NULL,
  ua_hash TEXT NOT NULL,
  notified_at INTEGER NOT NULL,
  PRIMARY KEY (submission_id, ua_hash)
);

CREATE INDEX IF NOT EXISTS idx_listen_device_notifications_submission
  ON listen_device_notifications (submission_id);
