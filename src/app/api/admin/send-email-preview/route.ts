import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { writeAudit } from "@/lib/auth/listenSession";
import {
  isAllowedPreviewRecipient,
  readAllowedPreviewRecipients,
} from "@/lib/emails/previewRecipients";
import { isPreviewTemplateKey } from "@/lib/emails/render-preview";
import { sendEmailPreview } from "@/lib/emails/sendEmailPreview";

const REFUSED = () => new NextResponse(null, { status: 404 });

// Allowlist lives in Worker env vars (not Sanity) so a Studio compromise
// can't widen it; rotating recipients = deploy. Locked 2026-05-24.
export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  if (readAllowedPreviewRecipients().length === 0) {
    return NextResponse.json(
      { outcome: "refused", reason: "preview-not-configured" },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const template = parseStringField(body, "template");
  const recipient = parseStringField(body, "recipient");
  if (!template || !recipient) return REFUSED();
  if (!isPreviewTemplateKey(template)) return REFUSED();
  if (!isAllowedPreviewRecipient(recipient)) {
    return NextResponse.json(
      { outcome: "refused", reason: "recipient-not-allowlisted" },
      { status: 403 },
    );
  }

  const result = await sendEmailPreview({ template, recipient });

  await writeAudit({
    userId: null,
    eventType: AUDIT_EVENT_TYPE.admin_email_preview_sent,
    ipHash: auth.audit.ipHash,
    userAgentHash: auth.audit.userAgentHash,
    success: result.kind === "sent" || result.kind === "dry_run",
  });

  if (result.kind === "sent") {
    return NextResponse.json({ outcome: "sent", template, recipient });
  }
  if (result.kind === "dry_run") {
    return NextResponse.json({ outcome: "dry_run", template, recipient });
  }
  if (result.kind === "skipped") {
    return NextResponse.json(
      { outcome: "skipped", reason: result.reason },
      { status: 503 },
    );
  }
  return NextResponse.json(
    { outcome: "failed", reason: result.error },
    { status: 500 },
  );
}
