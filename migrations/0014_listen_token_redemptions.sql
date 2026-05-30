-- 0014_listen_token_redemptions
--
-- Single-use ledger for one-tap listen tokens. Phase 1 of the one-tap
-- architectural epic enforces token-jti uniqueness via INSERT OR IGNORE
-- against this table: the first redemption wins, every subsequent attempt
-- with the same jti is rejected (replay defence).
--
-- Spec: MEMORY/WORK/20260526-060559_implement-epic-23ctexvw-phase-1/PRD.md
-- (ISC-17 to ISC-20). Companion to listen_magic_link (0004): that table
-- guards interactive magic links, while this one guards cron-day7 and
-- admin-resend one-tap tokens.

CREATE TABLE IF NOT EXISTS listen_token_redemptions (
  jti TEXT PRIMARY KEY,
  submission_id TEXT NOT NULL,
  recipient_user_id TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL,
  ip_hash TEXT,
  mint_source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_listen_token_redemptions_submission_id
  ON listen_token_redemptions (submission_id);
