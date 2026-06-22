import { SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

import { optionalEnv } from "@/lib/env";
import { SANITY_CONTENT_TAG } from "@/lib/sanity/tags";
import {
  MAX_WEBHOOK_BODY_BYTES,
  verifySignedRequest,
} from "@/lib/sanity/webhookVerification";

export async function POST(request: Request): Promise<Response> {
  const secret = optionalEnv("SANITY_WEBHOOK_SECRET");
  if (!secret) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const signatureHeader = request.headers.get(SIGNATURE_HEADER_NAME);
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number.parseInt(contentLength, 10) > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (rawBody.length > MAX_WEBHOOK_BODY_BYTES) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }
  if (!(await verifySignedRequest(rawBody, signatureHeader, secret))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  revalidateTag(SANITY_CONTENT_TAG, "max");
  return NextResponse.json({ revalidated: SANITY_CONTENT_TAG });
}
