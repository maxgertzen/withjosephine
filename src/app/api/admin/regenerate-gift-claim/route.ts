import "server-only";

import { NextResponse } from "next/server";

import { parseStringField } from "@/lib/api/parseBody";
import { authorizeAdminToken } from "@/lib/auth/adminTokenAuth";
import { regenerateGiftClaim } from "@/lib/booking/regenerateGiftClaim";

const REFUSED = () => new NextResponse(null, { status: 404 });

export async function POST(request: Request): Promise<Response> {
  const auth = await authorizeAdminToken(request);
  if (!auth.authorized) return REFUSED();

  const body = await request.json().catch(() => null);
  const submissionId = parseStringField(body, "submissionId");
  if (!submissionId) return REFUSED();

  const result = await regenerateGiftClaim(submissionId);
  if (result.ok) {
    return NextResponse.json({
      outcome: "regenerated",
      to: result.targetEmailRedacted,
      deliveryMethod: result.deliveryMethod,
    });
  }
  return NextResponse.json({ outcome: "refused", reason: result.reason }, { status: 409 });
}
