import "server-only";

import { NextResponse } from "next/server";

import { writeAudit } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findSubmissionRecipientUserId } from "@/lib/booking/submissions";
import { cascadeDeleteUser } from "@/lib/compliance/cascadeDeleteUser";
import { requireEnv } from "@/lib/env";
import { timingSafeStringEqual } from "@/lib/hmac";

/**
 * Admin-triggered GDPR Art. 17 cascade. Called by the Sanity Studio doc
 * action `deleteCustomerData`. Auth is a static `X-Admin-Token` header
 * matched against `ADMIN_API_KEY`; the Studio bundle does NOT carry the
 * token (operator pastes it into the action dialog per PRD ISC-22).
 *
 * Every failure path that touches `ADMIN_API_KEY` writes an `admin_auth_failed`
 * audit row capturing hashed IP + UA, so brute-force attempts leave a
 * forensic trail. Endpoint returns 404 with EMPTY body on every refusal
 * shape (auth-fail, missing-token, no-recipient, malformed-body) so a
 * probe can't distinguish "token was valid" from "token was wrong" by body
 * size or shape.
 */

const ADMIN_TOKEN_HEADER = "x-admin-token";
const REFUSED = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request): Promise<Response> {
  const audit = await getRequestAuditContext(request);

  let expectedToken: string;
  try {
    expectedToken = requireEnv("ADMIN_API_KEY");
  } catch {
    // 404 instead of 500 so an unconfigured admin endpoint doesn't advertise.
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

  const context = await findSubmissionRecipientUserId(submissionId);
  if (!context || !context.recipientUserId) {
    return REFUSED();
  }

  const result = await cascadeDeleteUser(context.recipientUserId, {
    performedBy: "studio-admin",
    ipHash: audit.ipHash,
  });

  return NextResponse.json({
    userId: result.userId,
    submissionIds: result.submissionIds,
    partialFailures: result.partialFailures,
    stripeRedactionJobId: result.stripeRedactionJobId,
    brevoSmtpProcessId: result.brevoSmtpProcessId,
    mixpanelTaskId: result.mixpanelTaskId,
  });
}
