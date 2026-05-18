import { NextResponse } from "next/server";

import { setGiftClaimCookie } from "@/lib/booking/giftClaimSession";

function gatesOpen(request: Request): boolean {
  if (process.env.E2E !== "1") return false;
  if (process.env.ENVIRONMENT === "production") return false;
  const expected = process.env.E2E_RESET_TOKEN;
  if (!expected) return false;
  return request.headers.get("x-e2e-reset-token") === expected;
}

export async function POST(request: Request): Promise<Response> {
  if (!gatesOpen(request)) {
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
