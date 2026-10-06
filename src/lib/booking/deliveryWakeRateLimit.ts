import "server-only";

import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey } from "@/lib/auth/requestAudit";

export async function checkDeliveryWakeRateLimit(headers: Headers): Promise<boolean> {
  return checkRateLimit("DELIVERY_WAKE_LIMITER", getClientIpKey({ headers }), { failClosed: true });
}
