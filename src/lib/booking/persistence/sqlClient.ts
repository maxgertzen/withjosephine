/**
 * Driver-agnostic SQL client. Production (Cloudflare Worker) uses the
 * Cloudflare D1 HTTPS REST API — no native modules permitted, no extra
 * runtime in the bundle.
 *
 * For tests, the SQLite driver is registered at setup time via
 * `__registerSqliteFactory` from vitest.setup.ts. Doing it through a
 * registry instead of a static dynamic import keeps `better-sqlite3` and
 * its 12 MiB of native binaries entirely out of the production bundle —
 * webpack and Next's NFT tracer never see a reference to the package
 * from anything inside `src/lib`. (See ADR-001.)
 *
 * Selection: `BOOKING_DB_DRIVER` env var. Defaults to "d1" so the
 * deployed Worker works with no extra config; tests stub it to "sqlite"
 * and register a factory.
 */

export type SqlValue = string | number | null;

export type SqlClient = {
  query<T extends Record<string, SqlValue> = Record<string, SqlValue>>(
    sql: string,
    params?: ReadonlyArray<SqlValue>,
  ): Promise<T[]>;
  exec(
    sql: string,
    params?: ReadonlyArray<SqlValue>,
  ): Promise<{ rowsWritten: number }>;
};

type ClientFactory = () => SqlClient | Promise<SqlClient>;

let cachedClient: Promise<SqlClient> | null = null;
let sqliteFactory: ClientFactory | null = null;

function resolveDriver(): "d1" | "sqlite" {
  const explicit = process.env.BOOKING_DB_DRIVER;
  if (explicit === "d1" || explicit === "sqlite") return explicit;
  return "d1";
}

async function buildClient(): Promise<SqlClient> {
  const driver = resolveDriver();
  if (driver === "d1") {
    const { createD1HttpClient } = await import("./d1HttpClient");
    return createD1HttpClient();
  }
  if (!sqliteFactory) {
    throw new Error(
      "BOOKING_DB_DRIVER=sqlite but no SQLite factory registered. " +
        "Tests should call __registerSqliteFactory() in setup. " +
        "Production should set BOOKING_DB_DRIVER=d1.",
    );
  }
  return sqliteFactory();
}

function getClient(): Promise<SqlClient> {
  if (cachedClient) return cachedClient;
  cachedClient = buildClient();
  return cachedClient;
}

export async function dbQuery<T extends Record<string, SqlValue> = Record<string, SqlValue>>(
  sql: string,
  params: ReadonlyArray<SqlValue> = [],
): Promise<T[]> {
  const client = await getClient();
  return client.query<T>(sql, params);
}

export async function dbExec(
  sql: string,
  params: ReadonlyArray<SqlValue> = [],
): Promise<{ rowsWritten: number }> {
  const client = await getClient();
  return client.exec(sql, params);
}

/**
 * Register the SQLite factory. Called from vitest.setup.ts so the
 * `better-sqlite3` import lives in test-only code paths and never enters
 * the production bundle.
 */
export function __registerSqliteFactory(factory: ClientFactory): void {
  sqliteFactory = factory;
}

// Test-only: reset the cached client so a fresh stubbed env / driver applies.
export async function __resetSqlClientForTesting(): Promise<void> {
  if (!cachedClient) {
    return;
  }
  const client = await cachedClient.catch(() => null);
  if (client && "close" in client && typeof (client as { close?: () => void }).close === "function") {
    (client as { close: () => void }).close();
  }
  cachedClient = null;
}
