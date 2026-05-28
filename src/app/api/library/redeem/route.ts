import { NextResponse } from "next/server";

import { verifyLibraryToken } from "@/lib/auth/libraryToken";
import { recordLibraryTokenRedemption } from "@/lib/auth/libraryTokenRedemptions";
import {
  AUDIT_EVENT_TYPE,
  buildListenSessionCookieHeader,
  createListenSessionForUser,
  writeAudit,
} from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";

/**
 * POST /api/library/redeem
 *
 * Companion to `src/app/my-readings/welcome/page.tsx` interstitial. Receives
 * the one-tap token in the POST body (never in the URL, which keeps `?t=` off
 * prefetcher GETs and out of referer logs), validates it, claims the
 * single-use slot in the `library_token_redemptions` ledger, opens a normal
 * listen session against the user_id encoded in the token, and redirects to
 * /my-readings?welcome=1.
 *
 * Library tokens are user-id-establishing (unlike listen tokens, which are
 * scoped to a single submission). Verify returns the userId; the redeem
 * route mints the SAME `__Host-listen_session` cookie used everywhere else.
 * The single cookie name is shared by design: a user with a valid library
 * session can already access their listen page; no second cookie needed.
 *
 * Every failure mode (missing token, expired, tampered, already redeemed)
 * responds with the SAME 303 to /my-readings (no cookie set) so a sniffer
 * cannot distinguish failure modes via response shape. The fall-through
 * page renders the existing magic-link form.
 */
function fallThroughResponse(origin: string): NextResponse {
  const response = NextResponse.redirect(new URL(`/my-readings`, origin), { status: 303 });
  response.headers.set("Cache-Control", "private, no-store, no-cache, must-revalidate");
  response.headers.set("Vary", "Cookie");
  return response;
}

function successResponse(args: { origin: string; cookieValue: string }): NextResponse {
  const target = new URL(`/my-readings`, args.origin);
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

export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;

  const form = await request.formData().catch(() => null);
  const token = formString(form, "t");
  if (!token) return fallThroughResponse(origin);

  const verify = await verifyLibraryToken({ token });
  if (!verify.valid) return fallThroughResponse(origin);

  const audit = await getRequestAuditContext(request);
  const now = Date.now();

  const recordResult = await recordLibraryTokenRedemption({
    jti: verify.jti,
    userId: verify.userId,
    redeemedAt: now,
    ipHash: audit.ipHash,
    uaHash: audit.userAgentHash,
    mintSource: verify.mintSource,
  });
  if (!recordResult.ok) return fallThroughResponse(origin);

  const session = await createListenSessionForUser({
    userId: verify.userId,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    now,
  });

  await writeAudit({
    userId: verify.userId,
    eventType: AUDIT_EVENT_TYPE.library_token_redeemed,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    success: true,
    now,
  });

  return successResponse({ origin, cookieValue: session.cookieValue });
}
