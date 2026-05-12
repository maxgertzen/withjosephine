import { NextResponse } from "next/server";

import { dispatchGiftClaim } from "@/lib/booking/giftClaimDispatch";

import { isDispatchSecretAuthorized } from "../_lib/headerSecretAuth";

type Body = {
  submissionId: string;
  retryCount: number;
};

function parseBody(value: unknown): Body | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const submissionId = record.submissionId;
  const retryCount = record.retryCount;
  if (typeof submissionId !== "string" || submissionId.length === 0) return null;
  if (typeof retryCount !== "number" || !Number.isInteger(retryCount) || retryCount < 0) {
    return null;
  }
  return { submissionId, retryCount };
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

  const result = await dispatchGiftClaim({
    submissionId: body.submissionId,
    retryCount: body.retryCount,
    nowMs: Date.now(),
  });

  return NextResponse.json(result);
}
