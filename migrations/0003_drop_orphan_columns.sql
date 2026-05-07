-- Drops columns whose writers were removed in chore/bundle-1-cron-booking-cleanup.
--   client_reference_id        always equaled the `id` PK; Stripe's webhook
--                              reads `session.client_reference_id` directly
--                              from Stripe, never from D1.
--   abandonment_recovery_fired_at  leftover from the abandonment-recovery
--                              feature dropped in PR-E.

ALTER TABLE submissions DROP COLUMN client_reference_id;
ALTER TABLE submissions DROP COLUMN abandonment_recovery_fired_at;
