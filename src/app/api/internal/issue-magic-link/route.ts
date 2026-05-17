import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { issueMagicLink } from "@/lib/auth/listenSession";
import { findUserByEmail } from "@/lib/auth/users";

/**
 * Engineering-tool endpoint for the listen round-trip Playwright spec.
 *
 * A narrow seam guarded by `ADMIN_API_KEY` that surfaces a raw magic-link
 * token to the test harness so the spec doesn't have to drive Resend +
 * inbox. Production customer flow is unchanged — this route never fires
 * Resend, never auto-creates users, and mirrors the no-enumeration 404
 * shape of `admin/regenerate-gift-claim`.
 *
 * Hard gate: refuses to operate when `ENVIRONMENT === "production"`,
 * regardless of `ADMIN_API_KEY` being set. Production never has a
 * legitimate caller for this route, so the safest posture is to make it
 * non-existent on the prod worker.
 *
 * Auth: header `x-admin-token`, timing-safe-compared to `ADMIN_API_KEY`.
 * On any auth or input failure return HTTP 404 with an empty body so a
 * probe can't distinguish "wrong token" from "unknown email" from "missing
 * env". Auth-failure paths still write an `admin_auth_failed` audit row.
 */

const REFUSED = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENVIRONMENT === "production") {
    return REFUSED();
  }

  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const email = parseStringField(body, "email");
  if (!email) return REFUSED();

  const user = await findUserByEmail(email);
  if (!user) {
    return REFUSED();
  }

  const { token, expiresAt } = await issueMagicLink({
    userId: user.id,
    ipHash: auth.audit.ipHash,
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
