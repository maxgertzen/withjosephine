import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { issueStepUpOtp } from "@/lib/auth/stepUpOtp";
import { sendStepUpOtpEmail } from "@/lib/auth/stepUpOtpEmail";
import { findUserById } from "@/lib/auth/users";

/**
 * POST /api/auth/step-up/request
 *
 * Issues a fresh 6-digit OTP for the active session's user and emails it
 * to the user's stored address. Throttled (30s gap + 3 per 30-min cap) so
 * a stolen cookie can't email-bomb the inbox.
 *
 * Responses:
 *   200 {} on success (with { devCode } when dry-run / sandbox skips so
 *     e2e specs can read the code without polling a mailbox)
 *   401 { error: "Unauthorized" } when no active session cookie
 *   404 { error: "User not found" } + clear-cookie when session.userId
 *     no longer maps to a user row (GDPR erasure case)
 *   429 { error: "Throttled", reason, retryAfterSec } on either throttle
 *
 * Dry-run protocol mirrors the rest of resend.tsx: requests carrying
 * `X-E2E-Resend-DryRun` (validated by the worker's `RESEND_E2E_DRY_RUN_SECRET`
 * inside the email sender) get the OTP code echoed back so e2e specs can
 * verify without polling a real mailbox.
 */

function clearCookieHeader(): string {
  return [
    `${COOKIE_NAME}=`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    "Max-Age=0",
  ].join("; ");
}

export async function POST(request: Request): Promise<Response> {
  const jar = await cookies();
  const sessionCookie = jar.get(COOKIE_NAME)?.value ?? "";
  if (!sessionCookie) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const session = await getActiveSession({ cookieValue: sessionCookie });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await findUserById(session.userId);
  if (!user) {
    // GDPR erasure case: cookie maps to a session whose user row was
    // deleted. Clear the cookie so the next request goes through the
    // magic-link flow instead of looping on this 404. Use a plain Response
    // (not NextResponse.json) because the jsdom test runtime strips
    // Set-Cookie from NextResponse.json headers under undici polyfill;
    // raw Response.headers.set survives.
    const res = new Response(JSON.stringify({ error: "User not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
    res.headers.set("Set-Cookie", clearCookieHeader());
    return res;
  }

  const audit = await getRequestAuditContext(request);

  const issueResult = await issueStepUpOtp({
    userId: session.userId,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
  });

  if (!issueResult.ok) {
    return NextResponse.json(
      {
        error: "Throttled",
        reason: issueResult.reason,
        retryAfterSec: issueResult.retryAfterSec,
      },
      {
        status: 429,
        headers: { "Retry-After": String(issueResult.retryAfterSec) },
      },
    );
  }

  const dryRunHeader = request.headers.get("x-e2e-resend-dry-run");
  const send = await sendStepUpOtpEmail({
    code: issueResult.code,
    toEmail: user.email,
    ipHash: audit.ipHash,
    dryRunHeader,
  });

  // When the email path skipped (sandbox prefix, missing API key, dry-run
  // flag) OR a dry-run header was provided, surface the OTP code back to
  // the test runner. Production never falls into this branch because the
  // header is gated by a worker secret inside the sender.
  if (send.kind === "skipped" || send.kind === "dry_run" || dryRunHeader) {
    return NextResponse.json({ devCode: issueResult.code });
  }

  return NextResponse.json({});
}
