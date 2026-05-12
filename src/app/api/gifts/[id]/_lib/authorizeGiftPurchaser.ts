import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import type { SubmissionRecord } from "@/lib/booking/submissions";
import { findSubmissionById } from "@/lib/booking/submissions";

export type AuthorizedPurchaser = {
  ok: true;
  session: { userId: string; sessionId: string };
  submission: SubmissionRecord;
};

export type PurchaserAuthFailure = {
  ok: false;
  response: Response;
};

/**
 * Shared auth + lookup preamble for purchaser-scoped gift mutation routes.
 * Returns the session + submission on success, or a fully-formed `Response`
 * the route can return directly. Collapses cross-user 404 + unknown-id 404
 * to the same response shape so an attacker can't enumerate gift IDs.
 *
 * Phase 5 Session 4b — B6.23. Timing parity: the 401 paths (no cookie / no
 * active session) issue a `findSubmissionById` lookup before returning
 * 401, so a remote attacker can't distinguish "you're unauthenticated"
 * from "your session was valid but the row doesn't exist or isn't yours"
 * by response time alone.
 */
const TIMING_PLACEHOLDER_ID = "__authz_timing_placeholder__";

export async function authorizeGiftPurchaser(
  submissionId: string,
): Promise<AuthorizedPurchaser | PurchaserAuthFailure> {
  const jar = await cookies();
  const sessionCookie = jar.get(COOKIE_NAME)?.value ?? "";
  if (!sessionCookie) {
    // Timing parity: issue the same DB lookup the success path would.
    try {
      await findSubmissionById(TIMING_PLACEHOLDER_ID);
    } catch {
      /* swallow — this is a timing pad, not a real lookup */
    }
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const session = await getActiveSession({ cookieValue: sessionCookie });
  if (!session) {
    // Timing parity: issue the same DB lookup the success path would.
    try {
      await findSubmissionById(TIMING_PLACEHOLDER_ID);
    } catch {
      /* swallow — this is a timing pad, not a real lookup */
    }
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const submission = await findSubmissionById(submissionId);
  if (!submission || !submission.isGift || submission.purchaserUserId !== session.userId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, session, submission };
}
