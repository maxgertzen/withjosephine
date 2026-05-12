import { NextResponse } from "next/server";

import { regenerateGiftClaim } from "@/lib/booking/regenerateGiftClaim";

import { isDispatchSecretAuthorized } from "../_lib/headerSecretAuth";

function parseBody(value: unknown): { submissionId: string } | null {
  if (!value || typeof value !== "object") return null;
  const submissionId = (value as Record<string, unknown>).submissionId;
  if (typeof submissionId !== "string" || submissionId.length === 0) return null;
  return { submissionId };
}

export async function POST(request: Request): Promise<Response> {
  if (!isDispatchSecretAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const result = await regenerateGiftClaim(body.submissionId);

  if (result.ok) {
    return NextResponse.json({
      outcome: "regenerated",
      to: result.targetEmailRedacted,
      deliveryMethod: result.deliveryMethod,
      resendDispatched: true,
    });
  }

  if (result.reason === "not_found") {
    return NextResponse.json({ error: "Submission not found" }, { status: 404 });
  }
  if (result.reason === "not_a_gift") {
    return NextResponse.json({ error: "Submission is not a gift" }, { status: 409 });
  }
  if (result.reason === "claimed") {
    return NextResponse.json({ error: "Gift already claimed" }, { status: 409 });
  }
  if (result.reason === "cancelled") {
    return NextResponse.json({ error: "Gift cancelled" }, { status: 409 });
  }
  if (result.reason === "cooldown") {
    return NextResponse.json(
      { error: "Cooldown active — wait 5 minutes between regenerations" },
      { status: 429 },
    );
  }
  if (result.reason === "missing_target_email") {
    return NextResponse.json({ error: "No target email on submission" }, { status: 409 });
  }
  return NextResponse.json(
    {
      outcome: "send_failed",
      to: result.targetEmailRedacted,
      deliveryMethod: result.deliveryMethod,
      resendDispatched: false,
    },
    { status: 502 },
  );
}
