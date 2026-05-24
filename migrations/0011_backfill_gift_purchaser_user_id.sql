-- Backfills `submissions.purchaser_user_id` for gifts created before the
-- 2026-05-18 fix (`src/app/api/booking/gift/route.ts` hardcoded `null` at
-- creation; `/my-gifts` queries by purchaser_user_id and never matched).
-- Idempotent: matches gifts by purchaser email to existing user rows; rows
-- with no matching user (purchaser never authenticated) stay NULL until the
-- next time they sign in.

UPDATE submissions
SET purchaser_user_id = (
  SELECT user.id FROM user WHERE user.email = submissions.email
)
WHERE is_gift = 1
  AND purchaser_user_id IS NULL
  AND email IS NOT NULL
  AND EXISTS (SELECT 1 FROM user WHERE user.email = submissions.email);
