-- 0016_step_up_otp
--
-- Phase 3 of the one-tap epic: step-up OTP auth for high-risk gift mutations.
-- Adds elevation timestamp on listen_session (set by successful OTP verify),
-- and the step_up_otp ledger (single-use, hashed, throttle-aware).

ALTER TABLE listen_session ADD COLUMN elevated_at INTEGER;

CREATE TABLE IF NOT EXISTS step_up_otp (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  consumed_at INTEGER,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  ip_hash TEXT,
  user_agent_hash TEXT
);

CREATE INDEX IF NOT EXISTS idx_step_up_otp_user_lookup
  ON step_up_otp (user_id, expires_at);
