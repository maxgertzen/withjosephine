-- Initial schema for booking-form submissions in D1 (CF SQLite).
-- See ADR-001 for context. D1 mirrors the Sanity `submission` doc; both
-- stores are written by every code path in src/lib/booking/submissions.ts.

CREATE TABLE submissions (
  id                            TEXT PRIMARY KEY NOT NULL,
  email                         TEXT NOT NULL,
  status                        TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'expired')),
  reading_slug                  TEXT NOT NULL,
  reading_name                  TEXT,
  reading_price_display         TEXT,
  responses_json                TEXT NOT NULL,
  consent_label                 TEXT,
  photo_r2_key                  TEXT,
  stripe_event_id               TEXT,
  stripe_session_id             TEXT,
  client_reference_id           TEXT,
  created_at                    TEXT NOT NULL,
  paid_at                       TEXT,
  expired_at                    TEXT,
  delivered_at                  TEXT,
  voice_note_url                TEXT,
  pdf_url                       TEXT,
  emails_fired_json             TEXT NOT NULL DEFAULT '[]',
  abandonment_recovery_fired_at TEXT
);

CREATE INDEX submissions_status_paid_at    ON submissions(status, paid_at);
CREATE INDEX submissions_status_created_at ON submissions(status, created_at);
CREATE INDEX submissions_status_delivered_at ON submissions(status, delivered_at);
