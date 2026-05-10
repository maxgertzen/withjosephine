import { NextResponse } from "next/server";

import { COOKIE_NAME, redeemMagicLink, SESSION_TTL_MS } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { safeNext } from "@/lib/auth/safeNext";

// All failures redirect to /auth/verify?error=rested — same copy for
// every failure mode, no information leak.
function restedRedirect(origin: string, token: string): NextResponse {
  const url = new URL("/auth/verify", origin);
  url.searchParams.set("error", "rested");
  if (token) url.searchParams.set("token", token);
  return NextResponse.redirect(url, { status: 303 });
}

function formString(form: FormData | null, key: string): string {
  const value = form?.get(key);
  return typeof value === "string" ? value : "";
}

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;

  const allowed = await checkRateLimit("LISTEN_AUTH_VERIFY_LIMITER", getClientIpKey(request));
  if (!allowed) return restedRedirect(origin, "");

  const form = await request.formData().catch(() => null);
  const token = formString(form, "token");
  const email = formString(form, "email");
  const next = safeNext(formString(form, "next") || null);

  if (!token || !email) return restedRedirect(origin, token);

  const audit = await getRequestAuditContext(request);
  const result = await redeemMagicLink({
    token,
    claimedEmail: email,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
  });

  if (!result.ok) return restedRedirect(origin, "");

  // `__Host-` requires Secure + Path=/ + no Domain — always on, even in dev.
  const cookieAttrs = [
    `${COOKIE_NAME}=${result.cookieValue}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  const response = NextResponse.redirect(new URL(next, origin), { status: 303 });
  response.headers.append("Set-Cookie", cookieAttrs.join("; "));
  return response;
}
