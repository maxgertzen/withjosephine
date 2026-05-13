import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { regenerateGiftClaim } from "@/lib/booking/regenerateGiftClaim";
import { requireEnv } from "@/lib/env";
import { timingSafeStringEqual } from "@/lib/hmac";

const ADMIN_TOKEN_HEADER = "x-admin-token";
const REFUSED = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request): Promise<Response> {
  const audit = await getRequestAuditContext(request);

  let expectedToken: string;
  try {
    expectedToken = requireEnv("ADMIN_API_KEY");
  } catch {
    return REFUSED();
  }

  const providedToken = request.headers.get(ADMIN_TOKEN_HEADER);
  if (!providedToken || !timingSafeStringEqual(providedToken, expectedToken)) {
    await writeAudit({
      userId: null,
      eventType: "admin_auth_failed",
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return REFUSED();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return REFUSED();
  }
  const submissionId =
    typeof body === "object" && body !== null && "submissionId" in body
      ? (body as { submissionId: unknown }).submissionId
      : undefined;
  if (typeof submissionId !== "string" || submissionId.length === 0) {
    return REFUSED();
  }

  const result = await regenerateGiftClaim(submissionId);
  if (result.ok) {
    return NextResponse.json({
      outcome: "regenerated",
      to: result.targetEmailRedacted,
      deliveryMethod: result.deliveryMethod,
    });
  }
  return NextResponse.json({ outcome: "refused", reason: result.reason }, { status: 409 });
}
