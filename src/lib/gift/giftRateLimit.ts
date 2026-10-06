import "server-only";

import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey } from "@/lib/auth/requestAudit";

export async function checkGiftRateLimit(headers: Headers): Promise<boolean> {
  return checkRateLimit("GIFT_CODE_LIMITER", getClientIpKey({ headers }), { failClosed: true });
}
