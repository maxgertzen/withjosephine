import "server-only";

import { getClientIp } from "@/lib/request";

import { hashIp, hashUserAgent } from "./listenSession";

export type RequestAuditContext = {
  ipHash: string | null;
  userAgentHash: string | null;
};

// Production trusts cf-connecting-ip only — XFF is client-controllable
// on any non-CF path and would let an attacker spoof the rate-limit key.
function getTrustedClientIp(request: Request): string | null {
  if (process.env.ENVIRONMENT === "production") {
    return request.headers.get("cf-connecting-ip");
  }
  return getClientIp(request);
}

export async function getRequestAuditContext(request: Request): Promise<RequestAuditContext> {
  const secret = process.env.LISTEN_TOKEN_SECRET;
  const ip = getTrustedClientIp(request);
  const ua = request.headers.get("user-agent");
  return {
    ipHash: ip && secret ? await hashIp(ip, secret) : null,
    userAgentHash: ua ? await hashUserAgent(ua) : null,
  };
}

export function getClientIpKey(request: Request): string {
  return getTrustedClientIp(request) ?? "unknown";
}
