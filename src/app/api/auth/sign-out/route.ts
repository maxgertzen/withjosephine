import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  buildClearedListenSessionCookieHeader,
  COOKIE_NAME,
  getActiveSession,
  revokeSession,
} from "@/lib/auth/listenSession";
import { getRequestAuditContext } from "@/lib/auth/requestAudit";

// Library-owner sign-out. Revokes the current session row (single device, not
// every device) and clears the session cookie, then 303s home. Idempotent: a
// missing or already-invalid cookie still clears and redirects.
export async function POST(request: Request): Promise<Response> {
  const origin = new URL(request.url).origin;
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(COOKIE_NAME)?.value ?? "";

  if (cookieValue) {
    const session = await getActiveSession({ cookieValue });
    if (session) {
      const audit = await getRequestAuditContext(request);
      await revokeSession({
        sessionId: session.sessionId,
        userId: session.userId,
        ipHash: audit.ipHash,
        userAgentHash: audit.userAgentHash,
      });
    }
  }

  const response = NextResponse.redirect(new URL("/", origin), { status: 303 });
  response.headers.append("Set-Cookie", buildClearedListenSessionCookieHeader());
  return response;
}
