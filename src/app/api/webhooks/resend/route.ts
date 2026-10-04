import * as Sentry from "@sentry/cloudflare";
import { NextResponse } from "next/server";
import type { WebhookEventPayload } from "resend";

import { handleResendWebhookEvent } from "@/lib/booking/resendWebhook";
import { optionalEnv } from "@/lib/env";
import { verifyResendWebhook } from "@/lib/resend";

const MAX_WEBHOOK_BODY_BYTES = 1_000_000;

function verify(payload: string, request: Request, webhookSecret: string): WebhookEventPayload | null {
  try {
    return verifyResendWebhook({
      payload,
      headers: {
        id: request.headers.get("svix-id") ?? "",
        timestamp: request.headers.get("svix-timestamp") ?? "",
        signature: request.headers.get("svix-signature") ?? "",
      },
      webhookSecret,
    });
  } catch {
    return null;
  }
}

export async function POST(request: Request): Promise<Response> {
  const webhookSecret = optionalEnv("RESEND_WEBHOOK_SECRET");
  if (!webhookSecret) return new NextResponse("Not Found", { status: 404 });

  const contentLength = Number.parseInt(request.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const payload = await request.text();
  if (payload.length > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  const event = verify(payload, request, webhookSecret);
  if (!event) return NextResponse.json({ error: "Invalid signature" }, { status: 400 });

  try {
    const outcome = await handleResendWebhookEvent(event);
    return NextResponse.json({ outcome });
  } catch (error) {
    console.error(`[resend-webhook] ${event.type} handling failed`, error);
    Sentry.captureException(error, { tags: { resend_event: event.type } });
    return NextResponse.json({ outcome: "error" });
  }
}
