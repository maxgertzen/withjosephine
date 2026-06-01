import { spawnSync } from "node:child_process";

export const D1_DATABASE_BY_ENV = {
  staging: "withjosephine-bookings-staging",
  production: "withjosephine-bookings",
} as const;

export type D1Env = keyof typeof D1_DATABASE_BY_ENV;

export function quoteSql(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Fail-closed guard for wrangler-backed D1 execution. Triggers under vitest
 * (VITEST=true or NODE_ENV=test) unless the dev sets ALLOW_REAL_D1_IN_TESTS=1.
 * See feedback_wrangler_oauth_test_footgun.md.
 */
export function assertNotInTestMode(): void {
  const inTestMode =
    process.env.VITEST === "true" || process.env.NODE_ENV === "test";
  const allowOverride = process.env.ALLOW_REAL_D1_IN_TESTS === "1";
  if (inTestMode && !allowOverride) {
    throw new Error(
      "Real execD1 invoked under vitest without ALLOW_REAL_D1_IN_TESTS=1. " +
        "Tests must inject a Deps fake — see feedback_wrangler_oauth_test_footgun.md.",
    );
  }
}

export type ExecD1Options = {
  env: D1Env;
  sql: string;
};

/**
 * Execute a SQL statement against the chosen D1 database via wrangler.
 * Fail-closed under vitest — callers MUST dependency-inject a fake in tests.
 */
export function realExecD1<T>(options: ExecD1Options): T[] {
  assertNotInTestMode();
  const dbName = D1_DATABASE_BY_ENV[options.env];
  const envFlags = options.env === "staging" ? ["--env", "staging"] : [];
  const wranglerArgs = [
    "exec",
    "wrangler",
    "d1",
    "execute",
    dbName,
    ...envFlags,
    "--remote",
    "--json",
    "--command",
    options.sql,
  ];
  const result = spawnSync("pnpm", wranglerArgs, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(
      `wrangler d1 execute failed against ${options.env}: ${result.stderr}`,
    );
  }
  const parsed = JSON.parse(result.stdout) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}
