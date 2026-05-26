-- 0015_library_token_redemptions
--
-- Single-use ledger for one-tap library tokens. Phase 2 of the one-tap
-- architectural epic enforces token-jti uniqueness via INSERT OR IGNORE
-- against this table: the first redemption wins, every subsequent attempt
-- with the same jti is rejected (replay defence).
--
-- Companion to listen_token_redemptions (0014): that ledger guards listen
-- page one-tap tokens, this one guards library one-tap tokens minted by
-- the four purchaser-facing email surfaces plus admin resend.

CREATE TABLE IF NOT EXISTS library_token_redemptions (
  jti TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  redeemed_at INTEGER NOT NULL,
  ip_hash TEXT,
  mint_source TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_library_token_redemptions_user_id
  ON library_token_redemptions (user_id);
