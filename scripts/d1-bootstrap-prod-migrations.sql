-- One-time bootstrap to mark migrations 0001 and 0002 as already applied
-- on the production D1. Required because both migration files were applied
-- manually via `wrangler d1 execute --file=...` before the migrations system
-- was engaged. Running `wrangler d1 migrations apply` on production would
-- otherwise fail at 0002 because `ALTER TABLE ... ADD COLUMN` is not
-- idempotent in SQLite.
--
-- Safe to re-run: `INSERT OR IGNORE` de-dupes if rows already exist.
-- Safe in CI / local: `CREATE TABLE IF NOT EXISTS` is no-op when present.
--
-- See www/docs/OPERATIONS.md ("D1 Migrations" section) for the full
-- rationale and the run-this-once command.

CREATE TABLE IF NOT EXISTS d1_migrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0001_submissions.sql');
INSERT OR IGNORE INTO d1_migrations (name) VALUES ('0002_amount_paid.sql');
