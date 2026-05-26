import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { COOKIE_NAME, getActiveSession } from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { verifyStepUpOtp } from "@/lib/auth/stepUpOtp";
import { CONTACT_EMAIL } from "@/lib/constants";

/**
 * POST /api/auth/step-up/verify
 *
 * Verifies a submitted 6-digit code against the live OTP row for the
 * active session's user. On success, sets `listen_session.elevated_at`
 * atomically so subsequent calls to `requireElevation` pass for the next
 * 10 minutes.
 *
 * Responses:
 *   200 { elevatedAt } on success
 *   400 { error: "Invalid body" } when body is missing/not JSON or code
 *     is not exactly 6 numeric digits
 *   401 { error: "Unauthorized" } when no active session cookie
 *   422 { error: "Step-up failed", reason, contactMailto } on every other
 *     OTP failure (no_pending, expired, already_consumed, mismatch, poisoned)
 *
 * 422 (not 401) for OTP failure is intentional: 401 would be ambiguous
 * with "your session is bad," and the UI needs a discriminator to route
 * the user to the contact-form fallback per Council 2's "no dead-end
 * Unauthorized" rule.
 */

const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=Step-up%20help`;
const CODE_PATTERN = /^[0-9]{6}$/;

type VerifyBody = { code: string };

function parseBody(value: unknown): VerifyBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.code !== "string") return null;
  if (!CODE_PATTERN.test(v.code)) return null;
  return { code: v.code };
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

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const audit = await getRequestAuditContext(request);
  const result = await verifyStepUpOtp({
    code: body.code,
    userId: session.userId,
    sessionId: session.sessionId,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        error: "Step-up failed",
        reason: result.reason,
        contactMailto: CONTACT_MAILTO,
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ elevatedAt: result.elevatedAt });
}
