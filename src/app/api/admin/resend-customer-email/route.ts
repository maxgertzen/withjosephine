import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import {
  RESENDABLE_EMAIL_TYPES,
  type ResendableEmailType,
  resendCustomerEmail,
} from "@/lib/booking/resendCustomerEmail";

const REFUSED = () => new NextResponse(null, { status: 404 });

function isResendableEmailType(value: string): value is ResendableEmailType {
  return (RESENDABLE_EMAIL_TYPES as readonly string[]).includes(value);
}

export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const submissionId = parseStringField(body, "submissionId");
  const emailType = parseStringField(body, "emailType");
  if (!submissionId || !emailType) return REFUSED();
  if (!isResendableEmailType(emailType)) return REFUSED();

  const result = await resendCustomerEmail(submissionId, emailType);
  if (result.ok) {
    return NextResponse.json({
      outcome: "resent",
      to: result.targetEmailRedacted,
      emailType: result.emailType,
    });
  }
  return NextResponse.json({ outcome: "refused", reason: result.reason }, { status: 409 });
}
