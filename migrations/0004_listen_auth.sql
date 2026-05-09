-- Phase 1 — Magic-link listen auth tables.
-- See www/MEMORY/WORK/20260509-202915_phase1-magic-link-listen/PRD.md.
--
-- Three tables, all keyed to submission_id (no user-account model).
-- All token values stored as SHA-256 hashes — raw tokens never persist.

CREATE TABLE listen_magic_link (
  id            TEXT    PRIMARY KEY,
  submission_id TEXT    NOT NULL,
  token_hash    TEXT    NOT NULL UNIQUE,
  expires_at    INTEGER NOT NULL,
  consumed_at   INTEGER,
  created_at    INTEGER NOT NULL,
  ip_hash       TEXT
);

CREATE INDEX idx_listen_magic_link_submission ON listen_magic_link (submission_id);
CREATE INDEX idx_listen_magic_link_expires   ON listen_magic_link (expires_at);

CREATE TABLE listen_session (
  id              TEXT    PRIMARY KEY,
  submission_id   TEXT    NOT NULL,
  token_hash      TEXT    NOT NULL UNIQUE,
  expires_at      INTEGER NOT NULL,
  created_at      INTEGER NOT NULL,
  revoked_at      INTEGER,
  ip_hash         TEXT,
  user_agent_hash TEXT
);

CREATE INDEX idx_listen_session_submission ON listen_session (submission_id);
CREATE INDEX idx_listen_session_expires   ON listen_session (expires_at);

CREATE TABLE listen_audit (
  id              TEXT    PRIMARY KEY,
  submission_id   TEXT    NOT NULL,
  event_type      TEXT    NOT NULL,
  timestamp       INTEGER NOT NULL,
  ip_hash         TEXT,
  user_agent_hash TEXT,
  success         INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX idx_listen_audit_submission ON listen_audit (submission_id);
CREATE INDEX idx_listen_audit_timestamp  ON listen_audit (timestamp);
