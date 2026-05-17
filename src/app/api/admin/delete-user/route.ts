import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { findSubmissionRecipientUserId } from "@/lib/booking/submissions";
import { cascadeDeleteUser } from "@/lib/compliance/cascadeDeleteUser";

/**
 * Admin-triggered GDPR Art. 17 cascade. Called by the Sanity Studio doc
 * action `deleteCustomerData`. Auth is a static `X-Admin-Token` header
 * matched against `ADMIN_API_KEY`; the Studio bundle does NOT carry the
 * token (operator pastes it into the action dialog).
 *
 * Every refusal returns 404 with empty body so a probe can't distinguish
 * "token was valid" from "token was wrong" by body size or shape. Auth-fail
 * paths write an `admin_auth_failed` audit row capturing hashed IP + UA.
 */

const REFUSED = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const submissionId = parseStringField(body, "submissionId");
  if (!submissionId) return REFUSED();

  const context = await findSubmissionRecipientUserId(submissionId);
  if (!context || !context.recipientUserId) {
    return REFUSED();
  }

  const result = await cascadeDeleteUser(context.recipientUserId, {
    performedBy: "studio-admin",
    ipHash: auth.audit.ipHash,
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
