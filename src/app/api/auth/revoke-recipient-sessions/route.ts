import { NextResponse } from "next/server";

import {
  AUDIT_EVENT_TYPE,
  writeAudit,
} from "@/lib/auth/listenSession";
import {
  revokeAllSessionsForUser,
  verifyNewDeviceRevokeToken,
} from "@/lib/auth/newDeviceNotice";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findSubmissionById } from "@/lib/booking/submissions";
import { sendNewDeviceRevokeAdminAlert } from "@/lib/resend";

const SUCCESS_PATH = "/auth/revoked";
const ERROR_PATH = "/auth/revoked-error";

async function handle(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const url = new URL(request.url);
  let token = url.searchParams.get("t") ?? "";
  if (!token && request.method === "POST") {
    const form = await request.formData().catch(() => null);
    const value = form?.get("t");
    if (typeof value === "string") token = value;
  }

  const audit = await getRequestAuditContext(request);
  if (!token) {
    await writeAudit({
      userId: null,
      eventType: AUDIT_EVENT_TYPE.recipient_sessions_revoke_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return NextResponse.redirect(new URL(ERROR_PATH, origin), { status: 303 });
  }

  const verify = await verifyNewDeviceRevokeToken({ token });
  if (!verify.valid) {
    await writeAudit({
      userId: null,
      eventType: AUDIT_EVENT_TYPE.recipient_sessions_revoke_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return NextResponse.redirect(new URL(ERROR_PATH, origin), { status: 303 });
  }

  const submission = await findSubmissionById(verify.submissionId);
  if (!submission || submission.recipientUserId !== verify.recipientUserId) {
    await writeAudit({
      userId: verify.recipientUserId,
      submissionId: verify.submissionId,
      eventType: AUDIT_EVENT_TYPE.recipient_sessions_revoke_invalid,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return NextResponse.redirect(new URL(ERROR_PATH, origin), { status: 303 });
  }

  const { revokedCount } = await revokeAllSessionsForUser({
    userId: verify.recipientUserId,
  });

  await writeAudit({
    userId: verify.recipientUserId,
    submissionId: verify.submissionId,
    eventType: AUDIT_EVENT_TYPE.recipient_sessions_revoked,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
    success: true,
  });

  void sendNewDeviceRevokeAdminAlert({
    submissionId: verify.submissionId,
    revokedCount,
  }).catch((err) => {
    console.error("[revoke-recipient-sessions] admin alert send failed", err);
  });

  return NextResponse.redirect(new URL(SUCCESS_PATH, origin), { status: 303 });
}

export async function GET(request: Request): Promise<Response> {
  return handle(request);
}

export async function POST(request: Request): Promise<Response> {
  return handle(request);
}
