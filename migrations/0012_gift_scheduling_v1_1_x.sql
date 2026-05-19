-- Phase 3 v1.1.x scheduling features. Single migration for D-10 (send-now)
-- and D-11 (cancel-scheduled) columns to minimise prod-drift — one apply
-- prepares the schema for both upcoming sub-PRs even if their routes ship
-- separately. Locked 2026-05-19.
--
-- D-10 audit trail (purchaser hits "send now" on a scheduled gift):
--   * sent_now_at      — when the route succeeded (ISO timestamp)
--   * sent_now_actor   — which purchaser-session triggered it (email)
--   * prior_alarm_at   — the gift_claim_alarm_at that was cancelled, so a
--                        Becky-side recovery can re-schedule it back
--
-- D-11 audit trail (purchaser cancels a scheduled gift):
--   * cancelled_by     — purchaser email at the moment of cancel
--   * cancelled_reason — short code (e.g. "purchaser-request"); free-form
--                        for future ops-side cancels too.
--
-- UNIQUE partial index on sent_now_at:
--   Defends against a double-click sending the claim email twice. The
--   route's WHERE-guarded UPDATE is the primary gate; the index is the
--   belt-and-suspenders fallback (any second UPDATE attempting to set
--   sent_now_at while a prior value persists raises UNIQUE constraint).
--   `WHERE gift_claim_sent_now_at IS NOT NULL` keeps non-sent-now gifts
--   out of the index entirely.

ALTER TABLE submissions ADD COLUMN gift_claim_sent_now_at    TEXT;
ALTER TABLE submissions ADD COLUMN gift_claim_sent_now_actor TEXT;
ALTER TABLE submissions ADD COLUMN gift_claim_prior_alarm_at TEXT;
ALTER TABLE submissions ADD COLUMN gift_cancelled_by         TEXT;
ALTER TABLE submissions ADD COLUMN gift_cancelled_reason     TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_gift_sent_now_once
  ON submissions (id)
  WHERE gift_claim_sent_now_at IS NOT NULL;
