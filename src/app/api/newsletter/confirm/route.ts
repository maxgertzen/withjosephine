import { NextResponse } from "next/server";

import type { NewsletterConfirmStatus } from "@/app/newsletter/confirm/NewsletterConfirmView";
import { NEWSLETTER_CONFIRM_ROUTE } from "@/lib/http/routes";
import { confirmNewsletterSignup } from "@/lib/signup/confirmNewsletterSignup";

function resultPage(request: Request, status: NewsletterConfirmStatus): Response {
  const url = new URL(NEWSLETTER_CONFIRM_ROUTE, request.url);
  url.searchParams.set("status", status);
  return NextResponse.redirect(url, 303);
}

export async function POST(request: Request): Promise<Response> {
  const form = await request.formData().catch(() => null);
  const token = form?.get("token");
  if (typeof token !== "string" || !token) return resultPage(request, "failed");
  try {
    return resultPage(request, (await confirmNewsletterSignup(token)) ? "confirmed" : "failed");
  } catch (error) {
    console.error("[newsletter] confirm failed", error instanceof Error ? error.name : "unknown");
    return resultPage(request, "failed");
  }
}
