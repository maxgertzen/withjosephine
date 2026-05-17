-- Phase 4 — financial_records. Separable from `submissions` so reading content
-- (intake, photo, voice note, PDF) can be deleted on a 3-year cycle while
-- transactional records are retained the 6 years HMRC self-assessment requires
-- for a UK sole trader who is not tax-resident. See www/docs/MASTER_PLAN_LISTEN_DASHBOARD_BACKUP_COMPLIANCE.md
-- and Phase 4 PRD `## Decisions`.
--
-- Cascade behavior (Phase 4): cascadeDeleteUser() explicitly skips this table.
-- The customer-facing privacy policy and the Studio doc-action confirmation
-- modal disclose this retention asymmetry verbatim.
--
-- email is denormalized intentionally — the `user` row may be cascade-deleted
-- while this row must survive. Without denormalization the row would orphan.

CREATE TABLE financial_records (
  submission_id        TEXT PRIMARY KEY NOT NULL,
  user_id              TEXT,
  email                TEXT NOT NULL,
  paid_at              TEXT NOT NULL,
  amount_paid_cents    INTEGER NOT NULL,
  amount_paid_currency TEXT NOT NULL,
  country              TEXT,
  stripe_session_id    TEXT NOT NULL,
  retained_until       TEXT NOT NULL
);

CREATE INDEX idx_financial_records_user_id        ON financial_records (user_id);
CREATE INDEX idx_financial_records_retained_until ON financial_records (retained_until);
