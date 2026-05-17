import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

// Test-only route that wipes booking-flow D1 tables between Playwright specs.
// Defense-in-depth — ALL three gates must pass before the destructive op runs:
//   1. process.env.E2E === "1"                          (build-time signal)
//   2. process.env.ENVIRONMENT !== "production"         (deployed-worker safety —
//       ENVIRONMENT is undefined in `pnpm dev`, "staging" / "production" on
//       deployed workers; we refuse only when explicitly "production")
//   3. request header `x-e2e-reset-token` matches env   (per-run secret)
// Any gate failure returns 404 — indistinguishable from a missing route.

const TABLES_TO_TRUNCATE = [
  "listen_audit",
  "listen_session",
  "listen_magic_link",
  "financial_records",
  "deletion_log",
  "submissions",
  "user",
] as const;

function gatesOpen(request: Request): boolean {
  if (process.env.E2E !== "1") return false;
  if (process.env.ENVIRONMENT === "production") return false;
  const expected = process.env.E2E_RESET_TOKEN;
  if (!expected) return false;
  const got = request.headers.get("x-e2e-reset-token");
  return got === expected;
}

export async function POST(request: Request) {
  if (!gatesOpen(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const db = (env as unknown as { withjosephine_bookings?: D1Database }).withjosephine_bookings;
  if (!db) {
    return NextResponse.json({ error: "D1 binding missing" }, { status: 500 });
  }
  const statements = TABLES_TO_TRUNCATE.map((table) => db.prepare(`DELETE FROM ${table}`));
  await db.batch(statements);
  return NextResponse.json({ ok: true, truncated: TABLES_TO_TRUNCATE });
}

type D1Database = {
  prepare(query: string): D1PreparedStatement;
  batch(statements: readonly D1PreparedStatement[]): Promise<unknown>;
};
type D1PreparedStatement = {
  run(): Promise<unknown>;
};
