CREATE TABLE IF NOT EXISTS email_signups (
  id                 TEXT PRIMARY KEY NOT NULL,
  email              TEXT NOT NULL,
  source             TEXT NOT NULL,
  wants_newsletter   INTEGER NOT NULL CHECK (wants_newsletter IN (0, 1)),
  consent_text       TEXT,
  created_at         TEXT NOT NULL,
  confirmed_at       TEXT,
  provider_synced_at TEXT
);

CREATE INDEX IF NOT EXISTS email_signups_email ON email_signups(email);
CREATE INDEX IF NOT EXISTS email_signups_created_at ON email_signups(created_at);
