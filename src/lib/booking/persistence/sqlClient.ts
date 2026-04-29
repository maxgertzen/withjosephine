/**
 * Driver-agnostic SQL client. The deployed Worker uses the Cloudflare D1
 * HTTP API (no native modules permitted). `next dev`, vitest, and any
 * non-CF environment use better-sqlite3 against a local file or
 * `:memory:` database.
 *
 * Selection: `BOOKING_DB_DRIVER` env var. Defaults to "sqlite" so a
 * fresh checkout works without CF credentials. Production sets it
 * explicitly to "d1" via wrangler vars.
 *
 * Same SQL works on both — D1 is SQLite-on-CF.
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

let cachedClient: Promise<SqlClient> | null = null;

function resolveDriver(): "d1" | "sqlite" {
  const explicit = process.env.BOOKING_DB_DRIVER;
  if (explicit === "d1" || explicit === "sqlite") return explicit;
  return "sqlite";
}

async function buildClient(): Promise<SqlClient> {
  const driver = resolveDriver();
  if (driver === "d1") {
    const { createD1HttpClient } = await import("./d1HttpClient");
    return createD1HttpClient();
  }
  const { createSqliteClient } = await import("./sqliteClient");
  return createSqliteClient();
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

// Test-only: reset the cached client so a fresh stubbed env / driver applies.
export async function __resetSqlClientForTesting(): Promise<void> {
  if (!cachedClient) return;
  const client = await cachedClient.catch(() => null);
  if (client && "close" in client && typeof (client as { close?: () => void }).close === "function") {
    (client as { close: () => void }).close();
  }
  cachedClient = null;
}
