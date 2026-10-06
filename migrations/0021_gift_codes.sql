CREATE TABLE IF NOT EXISTS gift_codes (
  id                          TEXT PRIMARY KEY NOT NULL,
  lookup_hash                 TEXT NOT NULL UNIQUE,
  reading_slug                TEXT NOT NULL,
  status                      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'expired', 'active', 'redeemed', 'cancelled')),
  buyer_first_name            TEXT NOT NULL,
  buyer_email                 TEXT,
  note                        TEXT,
  cooling_off_acknowledged_at TEXT NOT NULL,
  consent_label               TEXT NOT NULL,
  consent_ip_address          TEXT,
  stripe_session_id           TEXT UNIQUE,
  created_at                  TEXT NOT NULL,
  activated_at                TEXT,
  buyer_email_claimed_at      TEXT,
  recipient_name              TEXT,
  recipient_email             TEXT,
  send_count                  INTEGER NOT NULL DEFAULT 0,
  last_sent_at                TEXT,
  redeemed_submission_id      TEXT UNIQUE,
  redeemed_at                 TEXT,
  expired_at                  TEXT,
  updated_at                  TEXT NOT NULL,
  emails_fired_json           TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS gift_codes_status_created_at ON gift_codes(status, created_at);

ALTER TABLE submissions ADD COLUMN gift_code_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_submissions_gift_code_id
  ON submissions (gift_code_id)
  WHERE gift_code_id IS NOT NULL;
