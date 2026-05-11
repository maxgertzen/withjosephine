import { NextResponse } from "next/server";

import { COOKIE_NAME, redeemMagicLink, SESSION_TTL_MS } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { isListenNext, safeNext } from "@/lib/auth/safeNext";

// Same surface for every failure mode — no information leak. Listen-next stays
// in-context so the re-issue CTA keeps the submissionId.
function restedRedirect(origin: string, next: string, token: string): NextResponse {
  if (isListenNext(next)) {
    const url = new URL(next, origin);
    url.searchParams.set("error", "rested");
    return NextResponse.redirect(url, { status: 303 });
  }
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

  const form = await request.formData().catch(() => null);
  const token = formString(form, "token");
  const email = formString(form, "email");
  const next = safeNext(formString(form, "next") || null);

  const allowed = await checkRateLimit("LISTEN_AUTH_VERIFY_LIMITER", getClientIpKey(request));
  if (!allowed) return restedRedirect(origin, next, "");

  if (!token || !email) return restedRedirect(origin, next, token);

  const audit = await getRequestAuditContext(request);
  const result = await redeemMagicLink({
    token,
    claimedEmail: email,
    ipHash: audit.ipHash,
    userAgentHash: audit.userAgentHash,
  });

  if (!result.ok) return restedRedirect(origin, next, "");

  // `__Host-` requires Secure + Path=/ + no Domain — always on, even in dev.
  const cookieAttrs = [
    `${COOKIE_NAME}=${result.cookieValue}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${Math.floor(SESSION_TTL_MS / 1000)}`,
  ];

  const target = new URL(next, origin);
  if (isListenNext(next)) target.searchParams.set("welcome", "1");
  const response = NextResponse.redirect(target, { status: 303 });
  response.headers.append("Set-Cookie", cookieAttrs.join("; "));
  return response;
}
