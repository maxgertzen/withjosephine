import "server-only";

import { NextResponse } from "next/server";

import { readAllowedPreviewRecipients } from "@/lib/emails/previewRecipients";

// Populates the Studio send-to-test dropdown without exposing the env var to
// the Studio bundle. No admin token (matches the sibling send-preview POST):
// this only reveals the fixed internal allowlist, and sends stay bounded by it.
// 503 + reason matches the sibling POST shape. Locked 2026-06-16.
export async function GET(): Promise<Response> {
  const recipients = readAllowedPreviewRecipients();
  if (recipients.length === 0) {
    return NextResponse.json(
      { outcome: "refused", reason: "preview-not-configured" },
      { status: 503 },
    );
  }
  return NextResponse.json({ recipients });
}
