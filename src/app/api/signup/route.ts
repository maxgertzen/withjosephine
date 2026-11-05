import { NextResponse } from "next/server";

import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey } from "@/lib/auth/requestAudit";
import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { getClientIp } from "@/lib/request";
import { registerSignup } from "@/lib/signup/registerSignup";
import { parseSignupRequest } from "@/lib/signup/signupRequest";
import { verifyTurnstileToken } from "@/lib/turnstile";

const rejected = (status: number) => NextResponse.json({ success: false }, { status });

export async function POST(request: Request): Promise<Response> {
  const body = parseSignupRequest(await request.json().catch(() => null));
  if (!body || body[HONEYPOT_FIELD]) return rejected(400);
  if (!isValidAuthEmail(body.email)) return rejected(400);

  if (!(await checkRateLimit("SIGNUP_LIMITER", getClientIpKey(request), { failClosed: true }))) {
    return rejected(429);
  }
  if (!(await verifyTurnstileToken(body.turnstileToken, getClientIp(request) ?? undefined))) {
    return rejected(400);
  }

  try {
    const outcome = await registerSignup(body);
    if (outcome === "not_offered") return rejected(400);
    if (outcome === "email_failed") return rejected(502);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[signup] failed", error instanceof Error ? error.name : "unknown");
    return rejected(500);
  }
}
