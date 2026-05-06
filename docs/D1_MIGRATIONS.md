# D1 Migrations

Migration workflow for the `withjosephine_bookings` D1 database. This is a thin
wrapper around `wrangler d1 migrations` — it just standardises the binding
name + environment flags so commands stay consistent across machines and CI.

The migrations directory is `www/migrations/`. Each migration is a numbered
SQL file (`NNNN_short_slug.sql`). Wrangler tracks applied migrations in a
`d1_migrations` table on each database, scoped per environment.

## One-time bootstrap (production — already done)

The first two migrations (`0001_submissions.sql`, `0002_amount_paid.sql`) were
applied to the production D1 manually via `wrangler d1 execute --file=…`
**before** the migrations system was engaged. As a result, the production D1
has the schema but no `d1_migrations` tracking table.

If you run `pnpm migrate:apply:prod` on a database in this state, wrangler
creates the tracking table and tries to apply both migrations from scratch.
`0001` is idempotent (`CREATE TABLE IF NOT EXISTS`), but `0002` is not —
`ALTER TABLE … ADD COLUMN` has no `IF NOT EXISTS` form in SQLite, so it
errors with "duplicate column name".

The bootstrap SQL at `scripts/d1-bootstrap-prod-migrations.sql` creates the
tracking table and inserts the two migration names with
`INSERT OR IGNORE`. Run **once** against production:

```sh
pnpm exec wrangler d1 execute withjosephine_bookings --remote \
  --file=scripts/d1-bootstrap-prod-migrations.sql
```

Then verify both migrations show as applied:

```sh
pnpm migrate:list:prod
```

You should see `0001_submissions.sql` and `0002_amount_paid.sql` in the
"applied" section.

The bootstrap is **not** needed on staging or local — both will apply the
migration set fresh against an empty database, which works without any
duplicate-column issue.

## Day-to-day workflow

### Create a new migration

```sh
pnpm migrate:create <short_slug>
```

Wrangler creates `migrations/NNNN_<short_slug>.sql` with the next number.
Edit the file. Prefer idempotent SQL where SQLite allows it
(`CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`); know that
`ALTER TABLE` is the unavoidable exception.

### Apply against local

```sh
pnpm migrate:apply:local
```

Hits the miniflare-emulated local D1 (under `.wrangler/state/v3/d1/`). Run
this whenever you pull a branch with new migration files.

### Apply against staging

```sh
pnpm migrate:apply:staging
```

Reads the `[env.staging]` block in `wrangler.jsonc`. Only works once that
block exists (lands in PR-S2 of the dev/staging/prod separation work).

### Apply against production

```sh
pnpm migrate:apply:prod
```

No `--env` flag = top-level (production) config. **Run after staging** —
staging is the canary.

### List applied migrations

```sh
pnpm migrate:list:prod
pnpm migrate:list:staging
pnpm migrate:list:local
```

Wrangler reports applied vs. pending per environment.

## Why a tracking table per environment

Each D1 database has its own `d1_migrations` table. Production and staging
stay independent — applying a migration to staging does not change
production state, and vice versa. The tracking column is unique on `name`,
so re-running `pnpm migrate:apply:*` is safe (already-applied migrations
are skipped).

## SQLite gotchas

- `ALTER TABLE … ADD COLUMN` has no `IF NOT EXISTS`. Either: live with the
  one-shot nature, OR detect-and-skip via `PRAGMA table_info` in a
  pre-migration check (more code, less common).
- Renaming columns is supported only on SQLite 3.25+ (`ALTER TABLE …
  RENAME COLUMN`). D1 supports it, but be deliberate — the rename is
  irreversible without another migration.
- Dropping columns requires a full table rebuild (D1 doesn't support
  `ALTER TABLE … DROP COLUMN` directly). Plan accordingly.
- `CHECK` constraints are evaluated on insert/update — adding a stricter
  check to an existing column on a populated table will break inserts
  for any row that violates. Prefer adding constraints at table-creation
  time.
