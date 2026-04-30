import { getCloudflareContext } from "@opennextjs/cloudflare";

import type { SqlClient, SqlValue } from "./sqlClient";

type D1RunResult = {
  success: boolean;
  meta?: {
    changes?: number;
    rows_written?: number;
  };
};

type D1AllResult<T> = {
  results: T[];
  success: boolean;
  meta?: Record<string, unknown>;
};

type D1PreparedStatement = {
  bind(...values: SqlValue[]): D1PreparedStatement;
  all<T = Record<string, SqlValue>>(): Promise<D1AllResult<T>>;
  run(): Promise<D1RunResult>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
};

type EnvWithBookingsDb = {
  withjosephine_bookings: D1Database;
};

async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as EnvWithBookingsDb).withjosephine_bookings;
  if (!db) {
    throw new Error(
      "D1 binding `withjosephine_bookings` not present on env. " +
        "Verify wrangler.jsonc d1_databases stanza is deployed.",
    );
  }
  return db;
}

export function createD1BindingClient(): SqlClient {
  return {
    async query(sql, params = []) {
      const db = await getDb();
      const result = await db
        .prepare(sql)
        .bind(...(params as SqlValue[]))
        .all();
      return (result.results ?? []) as never;
    },
    async exec(sql, params = []) {
      const db = await getDb();
      const result = await db
        .prepare(sql)
        .bind(...(params as SqlValue[]))
        .run();
      return { rowsWritten: result.meta?.rows_written ?? result.meta?.changes ?? 0 };
    },
  };
}
