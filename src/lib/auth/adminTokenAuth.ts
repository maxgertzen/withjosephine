import "server-only";

import { AUDIT_EVENT_TYPE } from "@/lib/audit/eventTypes";
import { writeAudit } from "@/lib/auth/listenSession";
import { getRequestAuditContext, type RequestAuditContext } from "@/lib/auth/requestAudit";
import { requireEnv } from "@/lib/env";
import { timingSafeStringEqual } from "@/lib/hmac";
import { ADMIN_TOKEN_HEADER } from "@/lib/http/headers";

export type AdminAuthOutcome =
  | { authorized: true; audit: RequestAuditContext }
  | { authorized: false; audit: RequestAuditContext };

/**
 * Shared auth gate for `x-admin-token`-protected admin/internal routes.
 *
 * Auth-failure paths intentionally produce identical observable state: no
 * body, no header difference, and the same `admin_auth_failed` audit row.
 * Callers should respond with a silent 404 on `!authorized` so a probe can't
 * distinguish "wrong token" from "unconfigured ADMIN_API_KEY" from
 * "missing header".
 */
export async function authorizeAdminToken(request: Request): Promise<AdminAuthOutcome> {
  const audit = await getRequestAuditContext(request);

  let expectedToken: string;
  try {
    expectedToken = requireEnv("ADMIN_API_KEY");
  } catch {
    return { authorized: false, audit };
  }

  const providedToken = request.headers.get(ADMIN_TOKEN_HEADER);
  if (!providedToken || !timingSafeStringEqual(providedToken, expectedToken)) {
    await writeAudit({
      userId: null,
      eventType: AUDIT_EVENT_TYPE.admin_auth_failed,
      ipHash: audit.ipHash,
      userAgentHash: audit.userAgentHash,
      success: false,
    });
    return { authorized: false, audit };
  }

  return { authorized: true, audit };
}
