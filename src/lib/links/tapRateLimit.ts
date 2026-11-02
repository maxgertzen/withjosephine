import "server-only";

import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey } from "@/lib/auth/requestAudit";

export async function checkTapRateLimit(headers: Headers, purpose: "tap" | "stats"): Promise<boolean> {
  return checkRateLimit("TT_TAP_LIMITER", `${purpose}:${getClientIpKey({ headers })}`, { failClosed: true });
}
