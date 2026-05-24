import { NextResponse } from "next/server";

import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";
import { isE2ERouteGateOpen } from "@/lib/e2e/routeGate";

export async function POST(request: Request): Promise<Response> {
  if (!isE2ERouteGateOpen(request)) {
    return new NextResponse("Not Found", { status: 404 });
  }
  const body = (await request.json().catch(() => null)) as { submissionId?: unknown };
  const submissionId = typeof body?.submissionId === "string" ? body.submissionId : null;
  if (!submissionId) {
    return NextResponse.json({ error: "submissionId required" }, { status: 400 });
  }
  await setGiftClaimCookie(submissionId);
  return NextResponse.json({ ok: true });
}
