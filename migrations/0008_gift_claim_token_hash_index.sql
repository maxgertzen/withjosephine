-- Phase 5 — partial index on the gift claim token hash.
-- The claim flow looks up submissions by `gift_claim_token_hash` on every
-- recipient click of the claim link. Without this index that's a full table
-- scan. Partial-index on rows that actually carry a hash keeps it tiny.

CREATE INDEX IF NOT EXISTS idx_submissions_gift_claim_token_hash
  ON submissions (gift_claim_token_hash)
  WHERE gift_claim_token_hash IS NOT NULL;
