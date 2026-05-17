-- Phase 1 P1.6 — record the cooling-off acknowledgment timestamp at submit.
--
-- Phase 1 hardcodes the EU Consumer Rights Directive Art. 16(m) waiver
-- alongside the existing Art. 6 + Art. 9 acknowledgments (see
-- `src/lib/compliance/intakeConsent.ts`). The booking route now requires
-- the cooling-off acknowledgment to be checked before accepting a
-- submission; this column captures the moment that ack happened so the
-- audit trail can prove (per GDPR Art. 5(2) accountability) that the
-- waiver was explicit + contemporaneous with the purchase intent.
--
-- Nullable, no backfill. PRD D-22: prod D1 is wiped before the v1.0.0
-- → main merge (blank-slate cleanup is a launch blocker), so pre-Phase-1
-- rows on staging that never saw the cooling-off render stay NULL — the
-- honest "we don't know" signal.

ALTER TABLE submissions ADD COLUMN cooling_off_acknowledged_at TEXT;
