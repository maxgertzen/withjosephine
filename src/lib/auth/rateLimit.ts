import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

// Bindings declared in wrangler.jsonc. Platform constrains period to 10s
// or 60s; longer windows (15min, 1h) live at the WAF dashboard layer.
export type RateLimitBindingName =
  | "LISTEN_AUTH_SEND_LIMITER"
  | "LISTEN_AUTH_VERIFY_LIMITER"
  | "LISTEN_ASSET_LIMITER"
  | "GIFT_CODE_LIMITER";

type RateLimiter = {
  limit: (args: { key: string }) => Promise<{ success: boolean }>;
};

declare global {
  interface CloudflareEnv {
    LISTEN_AUTH_SEND_LIMITER?: RateLimiter;
    LISTEN_AUTH_VERIFY_LIMITER?: RateLimiter;
    LISTEN_ASSET_LIMITER?: RateLimiter;
    GIFT_CODE_LIMITER?: RateLimiter;
  }
}

// Fail-open in dev/test (no attacker, no binding); fail-closed in
// production so a dropped binding can't silently run unlimited.
export async function checkRateLimit(
  binding: RateLimitBindingName,
  key: string,
  options?: { failClosed?: boolean },
): Promise<boolean> {
  let limiter: RateLimiter | undefined;
  try {
    const { env } = await getCloudflareContext({ async: true });
    limiter = env[binding];
  } catch {
    if (options?.failClosed && process.env.ENVIRONMENT === "production") {
      console.error(`[rateLimit] context unavailable for ${binding}, failing closed`);
      return false;
    }
    return true;
  }
  if (!limiter) {
    if (process.env.ENVIRONMENT === "production") {
      console.error(`[rateLimit] binding ${binding} missing on env — failing closed`);
      return false;
    }
    return true;
  }
  const result = await limiter.limit({ key });
  return result.success;
}
