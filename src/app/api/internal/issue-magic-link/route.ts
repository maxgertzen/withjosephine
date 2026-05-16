import "server-only";

import { NextResponse } from "next/server";

import {
  issueMagicLink,
  writeAudit,
} from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findUserByEmail } from "@/lib/auth/users";
import { requireEnv } from "@/lib/env";
import { timingSafeStringEqual } from "@/lib/hmac";

/**
 * Engineering-tool endpoint for the listen round-trip Playwright spec.
 *
 * Same posture as the existing stripe-roundtrip spec: a narrow seam guarded by
 * `ADMIN_API_KEY` that surfaces a raw magic-link token to the test harness so
 * the spec doesn't have to drive Resend + inbox. Production customer flow is
 * unchanged — this route never fires Resend, never auto-creates users, and
 * mirrors the no-enumeration 404 shape of `admin/regenerate-gift-claim`.
 *
 * Auth: header `x-admin-token`, timing-safe-compared to `ADMIN_API_KEY`.
 * On any auth or input failure return HTTP 404 with an empty body so a
 * probe can't distinguish "wrong token" from "unknown email" from "missing
 * env". Auth-failure paths still write an `admin_auth_failed` audit row.
 */

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
  const email =
    typeof body === "object" && body !== null && "email" in body
      ? (body as { email: unknown }).email
      : undefined;
  if (typeof email !== "string" || email.length === 0) {
    return REFUSED();
  }

  // No auto-create. Unknown email collapses to the same 404 shape as auth
  // failure so an attacker can't enumerate registered emails through this
  // endpoint either.
  const user = await findUserByEmail(email);
  if (!user) {
    return REFUSED();
  }

  const { token, expiresAt } = await issueMagicLink({
    userId: user.id,
    ipHash: audit.ipHash,
  });

  const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? new URL(request.url).origin;
  const verifyUrl = new URL("/auth/verify", origin);
  verifyUrl.searchParams.set("token", token);

  return NextResponse.json({
    token,
    verifyUrl: verifyUrl.toString(),
    expiresAt,
  });
}
