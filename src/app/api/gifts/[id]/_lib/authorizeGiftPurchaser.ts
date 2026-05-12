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
 */
export async function authorizeGiftPurchaser(
  submissionId: string,
): Promise<AuthorizedPurchaser | PurchaserAuthFailure> {
  const jar = await cookies();
  const sessionCookie = jar.get(COOKIE_NAME)?.value ?? "";
  if (!sessionCookie) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const session = await getActiveSession({ cookieValue: sessionCookie });
  if (!session) {
    return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  const submission = await findSubmissionById(submissionId);
  if (!submission || !submission.isGift || submission.purchaserUserId !== session.userId) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  return { ok: true, session, submission };
}
