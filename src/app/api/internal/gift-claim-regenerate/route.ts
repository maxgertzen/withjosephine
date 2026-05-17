import { NextResponse } from "next/server";

import {
  type GiftClaimRegenerateRefusalReason,
  regenerateGiftClaim,
} from "@/lib/booking/regenerateGiftClaim";

import { isDispatchSecretAuthorized } from "../_lib/headerSecretAuth";

const REFUSED = () => new NextResponse(null, { status: 404 });

type RefusalResponse = { error: string; status: number };

const REFUSAL_RESPONSES: Record<GiftClaimRegenerateRefusalReason, RefusalResponse> = {
  not_found: { error: "Submission not found", status: 404 },
  not_a_gift: { error: "Submission is not a gift", status: 409 },
  claimed: { error: "Gift already claimed", status: 409 },
  cancelled: { error: "Gift cancelled", status: 409 },
  cooldown: { error: "Cooldown active — wait 5 minutes between regenerations", status: 429 },
  missing_target_email: { error: "No target email on submission", status: 409 },
};

function parseBody(value: unknown): { submissionId: string } | null {
  if (!value || typeof value !== "object") return null;
  const submissionId = (value as Record<string, unknown>).submissionId;
  if (typeof submissionId !== "string" || submissionId.length === 0) return null;
  return { submissionId };
}

export async function POST(request: Request): Promise<Response> {
  if (!isDispatchSecretAuthorized(request)) return REFUSED();

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
      claimUrl: result.claimUrl,
    });
  }

  if (result.reason !== "send_failed") {
    const refusal = REFUSAL_RESPONSES[result.reason];
    return NextResponse.json({ error: refusal.error }, { status: refusal.status });
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
