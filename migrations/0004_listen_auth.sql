-- Phase 1 — Magic-link listen auth, user-keyed (iter 2).
-- See www/MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md.
--
-- Identity model: email = user. A repeat customer + a gift recipient share
-- one user record across all their submissions. listen_session cookies are
-- scoped to user.id; submission-scope is enforced at the route layer via
-- requireListenSession() resolving submission.recipient_user_id and
-- comparing to session.user_id.
--
-- All token values stored as SHA-256 hashes — raw tokens never persist.
-- IP + UA hashed with a daily-rotating salt (see listenSession.ts).
--
-- Foreign keys are NOT declared as constraints; D1 doesn't enforce them
-- and the local sqlite test client uses literal id strings without seeding
-- referenced rows. The relationships are documented here in column names.

CREATE TABLE user (
  id         TEXT    PRIMARY KEY,
  email      TEXT    NOT NULL,
  name       TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX idx_user_email ON user (email);

CREATE TABLE listen_magic_link (
  id              TEXT    PRIMARY KEY,
  user_id         TEXT    NOT NULL,
  token_hash      TEXT    NOT NULL UNIQUE,
  expires_at      INTEGER NOT NULL,
  consumed_at     INTEGER,
  -- Counts wrong-email attempts at redeem time. Reaching MISMATCH_LIMIT
  -- (default 5) poisons the link by setting consumed_at, killing the
  -- 24h-unlimited-guess brute-force oracle. See listenSession.ts.
  mismatch_count  INTEGER NOT NULL DEFAULT 0,
  created_at      INTEGER NOT NULL,
  ip_hash         TEXT
);

CREATE INDEX idx_listen_magic_link_user    ON listen_magic_link (user_id);
CREATE INDEX idx_listen_magic_link_expires ON listen_magic_link (expires_at);

CREATE TABLE listen_session (
  id              TEXT    PRIMARY KEY,
  user_id         TEXT    NOT NULL,
  token_hash      TEXT    NOT NULL UNIQUE,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  revoked_at      INTEGER,
  ip_hash         TEXT,
  user_agent_hash TEXT
);

CREATE INDEX idx_listen_session_user    ON listen_session (user_id);
CREATE INDEX idx_listen_session_expires ON listen_session (expires_at);

-- listen_audit keeps both user_id (the actor — who performed the event)
-- and submission_id (the affected reading where applicable, nullable for
-- pre-auth events like an invalid token at redeem time).
CREATE TABLE listen_audit (
  id              TEXT    PRIMARY KEY,
  user_id         TEXT,
  submission_id   TEXT,
  event_type      TEXT    NOT NULL,
  timestamp       INTEGER NOT NULL,
  ip_hash         TEXT,
  user_agent_hash TEXT,
  success         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_listen_audit_user       ON listen_audit (user_id);
CREATE INDEX idx_listen_audit_submission ON listen_audit (submission_id);
CREATE INDEX idx_listen_audit_timestamp  ON listen_audit (timestamp);

-- Recipient-of-the-reading user. Nullable because legacy rows pre-date
-- this column and the Stripe webhook backfills on payment success. For
-- gift purchases (Phase 5), recipient ≠ purchaser; that distinction
-- arrives later — for now this is just "the user who can listen".
ALTER TABLE submissions ADD COLUMN recipient_user_id TEXT;

CREATE INDEX idx_submissions_recipient_user ON submissions (recipient_user_id);
