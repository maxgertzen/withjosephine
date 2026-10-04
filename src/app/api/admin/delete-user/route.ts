import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { findUserByEmail, getOrCreateUser, normalizeEmail } from "@/lib/auth/users";
import { findSubmissionRecipientUserId } from "@/lib/booking/submissions";
import { cascadeDeleteUser } from "@/lib/compliance/cascadeDeleteUser";
import { listGiftsBoughtBy } from "@/lib/gift/persistence/repository";

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

async function findUserIdBySubmission(submissionId: string): Promise<string | null> {
  const context = await findSubmissionRecipientUserId(submissionId);
  return context?.recipientUserId ?? null;
}

async function findUserIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const user = await findUserByEmail(normalized);
  if (user) return user.id;
  const giftsBought = await listGiftsBoughtBy(normalized);
  if (giftsBought.length === 0) return null;
  const { userId } = await getOrCreateUser({ email: normalized });
  return userId;
}

async function findUserIdToDelete(body: unknown): Promise<string | null> {
  const submissionId = parseStringField(body, "submissionId");
  if (submissionId) return findUserIdBySubmission(submissionId);
  const email = parseStringField(body, "email");
  return email ? findUserIdByEmail(email) : null;
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const userId = await findUserIdToDelete(body);
  if (!userId) return REFUSED();

  const result = await cascadeDeleteUser(userId, {
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
