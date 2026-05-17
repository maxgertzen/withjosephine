import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

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
  return request.headers.get("x-e2e-reset-token") === expected;
}

export async function POST(request: Request) {
  if (!gatesOpen(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const { env } = await getCloudflareContext({ async: true });
  const db = env.withjosephine_bookings;
  if (!db) {
    return NextResponse.json({ error: "D1 binding missing" }, { status: 500 });
  }
  await db.batch(TABLES_TO_TRUNCATE.map((table) => db.prepare(`DELETE FROM ${table}`)));
  return NextResponse.json({ ok: true, truncated: TABLES_TO_TRUNCATE });
}
