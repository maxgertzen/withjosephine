import { NextResponse } from "next/server";

import {
  AUDIT_EVENT_TYPE,
  buildListenSessionCookieHeader,
  createListenSessionForUser,
  writeAudit,
} from "@/lib/auth/listenSession";
import { verifyListenToken } from "@/lib/auth/listenToken";
import { recordListenTokenRedemption } from "@/lib/auth/listenTokenRedemptions";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findSubmissionById } from "@/lib/booking/submissions";

/**
 * POST /api/listen/[id]/redeem
 *
 * Companion to `src/app/listen/[id]/page.tsx` interstitial. Receives the
 * one-tap token in the POST body (never in the URL, which keeps `?t=` off prefetcher
 * GETs and out of referer logs), validates it, claims the single-use slot in
 * the `listen_token_redemptions` ledger, opens a normal listen session, and
 * redirects to /listen/[id]?welcome=1.
 *
 * Every failure mode (missing token, expired, tampered, recipient_changed,
 * mismatched submissionId, already redeemed) responds with the SAME 303 to
 * /listen/[id] (no cookie set) so a sniffer cannot distinguish "wrong token"
 * from "right token, already used" via response shape. The fall-through page
 * renders the existing magic-link form (see ListenView's signIn state).
 *
 * Cookie attributes come from `buildListenSessionCookieHeader` so this route
 * and the magic-link verify route can't drift on auth-cookie shape.
 */
function fallThroughResponse(origin: string, id: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/listen/${id}`, origin), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function successResponse(args: {
  origin: string;
  id: string;
  cookieValue: string;
}): NextResponse {
  const target = new URL(`/listen/${args.id}`, args.origin);
  target.searchParams.set("welcome", "1");
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.append("Set-Cookie", buildListenSessionCookieHeader(args.cookieValue));
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function formString(form: FormData | null, key: string): string {
  const value = form?.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;
  const origin = new URL(request.url).origin;

  const form = await request.formData().catch(() => null);
  const token = formString(form, "t");
  if (!token) return fallThroughResponse(origin, id);

  const submission = await findSubmissionById(id);
  if (!submission?.recipientUserId) return fallThroughResponse(origin, id);

  const verify = await verifyListenToken({
    token,
    currentRecipientUserId: submission.recipientUserId,
  });
  if (!verify.valid) return fallThroughResponse(origin, id);

  // Mismatched-id check: signature is valid but the token was minted for a
  // different submission. Emit forensic audit so cross-submission token reuse
  // is traceable, then fall through silently.
  if (verify.submissionId !== id) {
    const audit = await getRequestAuditContext(request);
    await writeAudit({
      userId: submission.recipientUserId,
      submissionId: id,
      eventType: AUDIT_EVENT_TYPE.listen_token_id_mismatch,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return fallThroughResponse(origin, id);
  }

  const audit = await getRequestAuditContext(request);
  const now = Date.now();

  // Atomic single-use: INSERT OR IGNORE in listen_token_redemptions. First
  // caller wins; concurrent redeems on the same jti can't both observe ok=true.
  const recordResult = await recordListenTokenRedemption({
    jti: verify.jti,
    submissionId: id,
    recipientUserId: submission.recipientUserId,
    redeemedAt: now,
    ipHash: audit.ipHash,
    mintSource: verify.mintSource,
  });
  if (!recordResult.ok) return fallThroughResponse(origin, id);

  const session = await createListenSessionForUser({
    userId: submission.recipientUserId,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    now,
  });

  // Forensic audit for the happy path. `token_mint_ms` is derived from the
  // verified expMs minus the default TTL. Admin_resend tokens with capped
  // TTL will under-report mint time by the cap amount, but `jti` is the
  // load-bearing forensic key (single-use ledger row carries the truth).
  await writeAudit({
    userId: submission.recipientUserId,
    submissionId: id,
    eventType: AUDIT_EVENT_TYPE.listen_token_redeemed,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    success: true,
    now,
  });

  return successResponse({ origin, id, cookieValue: session.cookieValue });
}
