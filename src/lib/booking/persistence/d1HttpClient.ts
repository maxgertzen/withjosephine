import { requireEnv } from "@/lib/env";

import type { SqlClient, SqlValue } from "./sqlClient";

const D1_API_BASE = "https://api.cloudflare.com/client/v4";

type D1Response<T> = {
  success: boolean;
  result: Array<{
    success: boolean;
    results: T[];
    meta: { rows_read?: number; rows_written?: number };
  }>;
  errors?: Array<{ code: number; message: string }>;
};

function getCredentials(): { accountId: string; databaseId: string; apiToken: string } {
  return {
    accountId: requireEnv("D1_ACCOUNT_ID"),
    databaseId: requireEnv("D1_DATABASE_ID"),
    apiToken: requireEnv("D1_API_TOKEN"),
  };
}

async function postQuery<T>(sql: string, params: ReadonlyArray<SqlValue>): Promise<D1Response<T>> {
  const { accountId, databaseId, apiToken } = getCredentials();
  const response = await fetch(
    `${D1_API_BASE}/accounts/${accountId}/d1/database/${databaseId}/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sql, params }),
    },
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`D1 HTTP ${response.status}: ${text}`);
  }
  const data = (await response.json()) as D1Response<T>;
  if (!data.success) {
    const message = data.errors?.[0]?.message ?? "D1 query failed";
    throw new Error(`D1: ${message}`);
  }
  return data;
}

export function createD1HttpClient(): SqlClient {
  return {
    async query(sql, params = []) {
      const data = await postQuery<Record<string, SqlValue>>(sql, params);
      return (data.result[0]?.results ?? []) as never;
    },
    async exec(sql, params = []) {
      const data = await postQuery<never>(sql, params);
      return { rowsWritten: data.result[0]?.meta?.rows_written ?? 0 };
    },
  };
}
