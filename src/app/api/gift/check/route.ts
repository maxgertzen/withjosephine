import { NextResponse } from "next/server";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { isFlagEnabled } from "@/lib/env";
import { auditInvalidGiftLink } from "@/lib/gift/giftAudit";
import type { GiftCheckRequest, GiftCheckResponse } from "@/lib/gift/giftCheck";
import { giftPath, normalizeGiftCode } from "@/lib/gift/giftCodeFormat";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { findGiftByCode, resolveGiftState } from "@/lib/gift/gifts";
import { resolveReadingName } from "@/lib/readingSummary";
import { fetchReading } from "@/lib/sanity/fetch";

function isGiftCheckRequest(body: unknown): body is GiftCheckRequest {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return typeof candidate.code === "string" && typeof candidate.readingSlug === "string";
}

function respond(body: GiftCheckResponse, status = 200): Response {
  return NextResponse.json(body, { status });
}

export async function POST(request: Request): Promise<Response> {
  if (!isFlagEnabled("GIFTS_ENABLED")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (!isGiftCheckRequest(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!(await checkGiftRateLimit(request.headers))) {
    return respond({ result: "rate_limited" }, 429);
  }

  const gift = await findGiftByCode(parsedBody.code);
  const state = resolveGiftState(gift);
  const code = normalizeGiftCode(parsedBody.code);
  if (!gift || !code || (state !== "active" && state !== "redeemed")) {
    await auditInvalidGiftLink(request, AUDIT_EVENT_TYPE.gift_code_invalid);
    return respond({ result: "not_found" });
  }

  const path = giftPath(code);
  if (gift.readingSlug === parsedBody.readingSlug) return respond({ result: "valid", path });
  return respond({
    result: "other_reading",
    readingSlug: gift.readingSlug,
    readingName: await resolveReadingName(gift.readingSlug, fetchReading),
    path,
  });
}
