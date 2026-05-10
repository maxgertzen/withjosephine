import { NextResponse } from "next/server";

import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { issueMagicLink } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { findUserByEmail } from "@/lib/auth/users";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { sendMagicLink } from "@/lib/resend";

const SAFE_NEXT = /^\/(listen\/[A-Za-z0-9_-]+|my-readings)\/?$/;

// Uniform response across all branches (no enumeration leak); Resend
// send rides runMirror so timing doesn't betray known-vs-unknown.
export async function POST(request: Request) {
  const { email, next } = await readEmailAndNext(request);
  const contentType = request.headers.get("content-type") ?? "";
  const wantsHtml =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  const allowed = await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", getClientIpKey(request));
  if (allowed && isValidAuthEmail(email)) {
    const user = await findUserByEmail(email);
    if (user) {
      const audit = await getRequestAuditContext(request);
      const { token } = await issueMagicLink({ userId: user.id, ipHash: audit.ipHash });
      const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? new URL(request.url).origin;
      const verifyUrl = new URL("/auth/verify", origin);
      verifyUrl.searchParams.set("token", token);
      const cleanNext = next && SAFE_NEXT.test(next) ? next : null;
      if (cleanNext) verifyUrl.searchParams.set("next", cleanNext);
      runMirror(
        sendMagicLink({ to: user.email, magicLinkUrl: verifyUrl.toString() }).then(() => {}),
      );
    }
  }

  if (wantsHtml) {
    const origin = new URL(request.url).origin;
    return NextResponse.redirect(new URL("/my-readings?sent=1", origin), { status: 303 });
  }
  return new NextResponse(null, { status: 204 });
}

function formString(form: FormData | null, key: string): string {
  const value = form?.get(key);
  return typeof value === "string" ? value : "";
}

async function readEmailAndNext(
  request: Request,
): Promise<{ email: string; next: string | null }> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as
      | { email?: unknown; next?: unknown }
      | null;
    return {
      email: typeof body?.email === "string" ? body.email : "",
      next: typeof body?.next === "string" ? body.next : null,
    };
  }
  const form = await request.formData().catch(() => null);
  return { email: formString(form, "email"), next: formString(form, "next") || null };
}
