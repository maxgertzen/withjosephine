import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";

import { isE2ERouteGateOpen } from "@/lib/e2e/routeGate";

const TABLES_TO_TRUNCATE = [
  "listen_audit",
  "listen_session",
  "listen_magic_link",
  "financial_records",
  "deletion_log",
  "submissions",
  "user",
] as const;

export async function POST(request: Request) {
  if (!isE2ERouteGateOpen(request)) {
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
