-- Phase 5 — Gifting feature, Session 1.
-- See www/MEMORY/WORK/20260509-202915_phase5-gifting/PRD.md.
--
-- Adds the columns that let Alice purchase a reading as a gift for Bob and
-- schedule the recipient claim email. Bob's user record is NOT created here;
-- he becomes a user (and gets recipient_user_id wired) at claim time in
-- Session 2.
--
-- Conventions:
--   * Timestamps are TEXT (ISO-8601) to match the existing `submissions`
--     table convention. Token hashes are SHA-256 hex; raw tokens never land
--     in this table (same pattern as listen_magic_link in 0004).
--   * purchaser_user_id mirrors recipient_user_id (from 0004) in being
--     nullable so the Stripe webhook can backfill on payment success without
--     blocking on a chicken-and-egg user-row insert.
--   * For self-purchase: is_gift = 0 and recipient_user_id = purchaser_user_id.
--   * For gift: is_gift = 1, recipient_user_id stays NULL until Bob claims.

ALTER TABLE submissions ADD COLUMN is_gift                   INTEGER NOT NULL DEFAULT 0;
ALTER TABLE submissions ADD COLUMN purchaser_user_id         TEXT;
ALTER TABLE submissions ADD COLUMN recipient_email           TEXT;
ALTER TABLE submissions ADD COLUMN gift_delivery_method      TEXT;
ALTER TABLE submissions ADD COLUMN gift_send_at              TEXT;
ALTER TABLE submissions ADD COLUMN gift_message              TEXT;
ALTER TABLE submissions ADD COLUMN gift_claim_token_hash     TEXT;
ALTER TABLE submissions ADD COLUMN gift_claim_email_fired_at TEXT;
ALTER TABLE submissions ADD COLUMN gift_claimed_at           TEXT;
ALTER TABLE submissions ADD COLUMN gift_cancelled_at         TEXT;

-- gift_delivery_method values:
--   * NULL          for self-purchases (is_gift = 0)
--   * 'self_send'   purchaser receives a shareable claim URL, forwards manually
--   * 'scheduled'   we fire the claim email at gift_send_at (cron, Session 2)

-- Session 2 cron query: pending unclaimed gifts whose send-at is due.
CREATE INDEX idx_submissions_gift_pending
  ON submissions (is_gift, gift_send_at, gift_claim_email_fired_at);

-- Session 3 Alice's /my-readings page.
CREATE INDEX idx_submissions_purchaser_user
  ON submissions (purchaser_user_id);
