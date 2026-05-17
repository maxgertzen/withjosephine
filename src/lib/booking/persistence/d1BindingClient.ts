import { getCloudflareContext } from "@opennextjs/cloudflare";

import { taintServerObject } from "@/lib/taint";

import type { SqlClient, SqlValue } from "./sqlClient";

const BOOKINGS_BINDING_NAME = "withjosephine_bookings" as const;

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
  bind(...values: readonly SqlValue[]): D1PreparedStatement;
  all<T = Record<string, SqlValue>>(): Promise<D1AllResult<T>>;
  run(): Promise<D1RunResult>;
};

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: readonly D1PreparedStatement[]): Promise<readonly D1RunResult[]>;
};

declare global {
  interface CloudflareEnv {
    [BOOKINGS_BINDING_NAME]: D1Database;
  }
}

async function getDb(): Promise<D1Database> {
  const { env } = await getCloudflareContext({ async: true });
  const db = env[BOOKINGS_BINDING_NAME];
  if (!db) {
    throw new Error(
      `D1 binding \`${BOOKINGS_BINDING_NAME}\` not present on env. ` +
        "Verify wrangler.jsonc d1_databases stanza is deployed.",
    );
  }
  return db;
}

export function createD1BindingClient(): SqlClient {
  const client: SqlClient = {
    async query(sql, params = []) {
      const db = await getDb();
      const result = await db.prepare(sql).bind(...params).all();
      return result.results as never;
    },
    async exec(sql, params = []) {
      const db = await getDb();
      const result = await db.prepare(sql).bind(...params).run();
      return { rowsWritten: result.meta?.rows_written ?? result.meta?.changes ?? 0 };
    },
    async batch(statements) {
      const db = await getDb();
      const prepared = statements.map((s) =>
        db.prepare(s.sql).bind(...((s.params ?? []) as readonly SqlValue[])),
      );
      await db.batch(prepared);
    },
  };
  taintServerObject(
    "D1 SQL client exposes raw query/exec; do not pass to client components.",
    client,
  );
  return client;
}
