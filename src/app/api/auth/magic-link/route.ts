import { NextResponse } from "next/server";

import { isValidAuthEmail } from "@/lib/auth/emailValidation";
import { issueMagicLink } from "@/lib/auth/listenSession";
import { checkRateLimit } from "@/lib/auth/rateLimit";
import { getClientIpKey, getRequestAuditContext } from "@/lib/auth/requestAudit";
import { isListenNext, safeNext } from "@/lib/auth/safeNext";
import { findUserByEmail } from "@/lib/auth/users";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { sendMagicLink } from "@/lib/resend";

// Uniform response across all branches (no enumeration leak); Resend
// send rides runMirror so timing doesn't betray known-vs-unknown.
// Rate-limit is the one exception: it fires before email lookup so any
// input from the throttled IP hits the same throttled response.
export async function POST(request: Request) {
  const { email, next: rawNext } = await readEmailAndNext(request);
  const cleanNext = safeNext(rawNext);
  const contentType = request.headers.get("content-type") ?? "";
  const wantsHtml =
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data");

  const allowed = await checkRateLimit("LISTEN_AUTH_SEND_LIMITER", getClientIpKey(request));
  if (!allowed) {
    if (wantsHtml) return htmlRedirect(request, cleanNext, "throttled");
    return new NextResponse(null, { status: 429 });
  }

  if (isValidAuthEmail(email)) {
    const user = await findUserByEmail(email);
    if (user) {
      const audit = await getRequestAuditContext(request);
      const { token } = await issueMagicLink({ userId: user.id, ipHash: audit.ipHash });
      const origin = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? new URL(request.url).origin;
      const verifyUrl = new URL("/auth/verify", origin);
      verifyUrl.searchParams.set("token", token);
      // /my-readings is the default landing, so don't bother round-tripping it;
      // only listen-page next URLs carry the submissionId that needs preserving.
      if (isListenNext(cleanNext)) verifyUrl.searchParams.set("next", cleanNext);
      runMirror(
        sendMagicLink({ to: user.email, magicLinkUrl: verifyUrl.toString() }).then(() => {}),
      );
    }
  }

  if (wantsHtml) return htmlRedirect(request, cleanNext, "sent");
  return new NextResponse(null, { status: 204 });
}

function htmlRedirect(
  request: Request,
  cleanNext: string,
  outcome: "sent" | "throttled",
): NextResponse {
  const origin = new URL(request.url).origin;
  const target = new URL(cleanNext, origin);
  if (outcome === "throttled") target.searchParams.set("error", "throttled");
  else target.searchParams.set("sent", "1");
  return NextResponse.redirect(target, { status: 303 });
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
