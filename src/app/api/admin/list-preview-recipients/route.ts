import "server-only";

import { NextResponse } from "next/server";

import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { readAllowedPreviewRecipients } from "@/lib/emails/previewRecipients";

const REFUSED = () => new NextResponse(null, { status: 404 });

/**
 * Returns the ALLOWED_PREVIEW_RECIPIENTS env-var list so the Studio
 * send-to-test dialog can populate its dropdown without ever exposing the
 * raw env var to the Studio bundle.
 *
 * Auth: x-admin-token. Auth failure returns 404 with no body (matches the
 * fail-silently posture of every other admin route).
 *
 * Unset env var returns 503 — the Studio dialog uses this signal to show
 * "Send-to-test is not configured on this environment" rather than rendering
 * an empty dropdown.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const recipients = readAllowedPreviewRecipients();
  if (recipients.length === 0) {
    return NextResponse.json(
      { error: "ALLOWED_PREVIEW_RECIPIENTS env var is not configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ recipients });
}
