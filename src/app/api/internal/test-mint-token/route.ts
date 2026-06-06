import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { isValidMintSource, mintListenToken } from "@/lib/auth/listenToken";

/**
 * Engineering-tool endpoint for the listen one-tap round-trip Playwright spec.
 *
 * Mints a listen token on the staging worker using the worker's own
 * `AUTH_TOKEN_SECRET`, so the spec no longer has to import `mintListenToken`
 * in-process and the CI runner no longer has to carry a synced copy of the
 * secret. Replaces the prior pattern documented in the spec preamble.
 *
 * Hard gate: refuses to operate when `ENVIRONMENT === "production"`,
 * regardless of `ADMIN_API_KEY` being set. Production never has a legitimate
 * caller for this route.
 *
 * Auth: header `x-admin-token`, timing-safe-compared to `ADMIN_API_KEY`. On
 * any auth or input failure return HTTP 404 with an empty body so a probe
 * can't distinguish failure modes. Mirrors the silent-404 invariant of
 * `issue-magic-link` and `admin/regenerate-gift-claim`.
 *
 * Body: `{submissionId, recipientUserId, mintSource, ttlMs?}`. `mintSource`
 * must be `"cron_day7"` or `"admin_resend"`. `ttlMs` is forwarded verbatim,
 * including negative values (the spec uses `ttlMs: -1` to drive the
 * expired-token branch of the redeem route).
 */

const REFUSED = () => new NextResponse(null, { status: 404 });

function parseTtlMs(body: unknown): number | undefined {
  if (!body || typeof body !== "object") return undefined;
  const value = (body as Record<string, unknown>).ttlMs;
  if (value === undefined) return undefined;
  return typeof value === "number" && Number.isFinite(value) ? value : NaN;
}

export async function POST(request: Request): Promise<Response> {
  if (process.env.ENVIRONMENT === "production") {
    return REFUSED();
  }

  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const submissionId = parseStringField(body, "submissionId");
  const recipientUserId = parseStringField(body, "recipientUserId");
  const mintSource = parseStringField(body, "mintSource");
  if (!submissionId || !recipientUserId || !mintSource) return REFUSED();
  if (!isValidMintSource(mintSource)) return REFUSED();

  const ttlMs = parseTtlMs(body);
  if (Number.isNaN(ttlMs)) return REFUSED();

  let token: string;
  try {
    token = await mintListenToken({
      submissionId,
      recipientUserId,
      mintSource,
      ttlMs,
    });
  } catch {
    return REFUSED();
  }

  return NextResponse.json({ token });
}
