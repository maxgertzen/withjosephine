import "server-only";

import { NextResponse } from "next/server";

import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { readAllowedPreviewRecipients } from "@/lib/emails/previewRecipients";

const REFUSED = () => new NextResponse(null, { status: 404 });

// Populates the Studio send-to-test dropdown without exposing the env var
// to the Studio bundle. 503 + reason matches the sibling POST shape.
export async function GET(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const recipients = readAllowedPreviewRecipients();
  if (recipients.length === 0) {
    return NextResponse.json(
      { outcome: "refused", reason: "preview-not-configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ recipients });
}
