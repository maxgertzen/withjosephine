import * as Sentry from "@sentry/cloudflare";

import { DELIVER_REQUESTED_PATH } from "@/lib/cron-routes";
import { isStagingEnvironment, optionalEnv, PRODUCTION_ORIGIN } from "@/lib/env";
import { AUTHORIZATION_HEADER, BEARER_PREFIX } from "@/lib/http/headers";

export const PRODUCTION_DELIVER_REQUESTED_URL = `${PRODUCTION_ORIGIN}${DELIVER_REQUESTED_PATH}`;

function reportFailedWake(reason: string): void {
  console.error(`[deliveryWake] production deliver-requested ${reason}`);
  Sentry.captureMessage("Production delivery wake failed", { level: "warning", extra: { reason } });
}

export async function wakeProductionDelivery(): Promise<void> {
  const secret = optionalEnv("DELIVERY_WAKE_SECRET");
  if (!secret || !isStagingEnvironment()) return;
  try {
    const response = await fetch(PRODUCTION_DELIVER_REQUESTED_URL, {
      method: "POST",
      headers: { [AUTHORIZATION_HEADER]: `${BEARER_PREFIX}${secret}` },
    });
    if (!response.ok) reportFailedWake(`answered ${response.status}`);
  } catch {
    reportFailedWake("unreachable");
  }
}
