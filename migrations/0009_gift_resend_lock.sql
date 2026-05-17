-- Phase 5 Session 4b — B6.20 atomic lock for `/api/gifts/:id/resend-link`.
--
-- Closes a TOCTOU window where two concurrent POSTs both read the same
-- `emails_fired_json` rate-limit state, both pass the in-memory check, and
-- both regenerate tokens / fire emails. The fix: acquire an atomic lock via
-- a conditional UPDATE before the send. `gift_resend_lock_until` carries
-- the unix-ms timestamp until which the lock is held; the first writer
-- wins via `WHERE (gift_resend_lock_until IS NULL OR gift_resend_lock_until < ?)`,
-- and the second concurrent caller's `rowsWritten === 0` triggers a 429.
--
-- We use a short TTL (60s) so a crashed in-flight resend doesn't permanently
-- block subsequent retries. The TTL is also long enough to span the worst-
-- case Resend latency.

ALTER TABLE submissions ADD COLUMN gift_resend_lock_until INTEGER;
