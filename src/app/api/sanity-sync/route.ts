import { NextResponse } from "next/server";

import { optionalEnv } from "@/lib/env";
import { base64UrlDecodeToBytes, verifyHmacSha256 } from "@/lib/hmac";
import { getSanityWriteClient } from "@/lib/sanity/client";

/**
 * Sanity → staging dataset auto-sync.
 *
 * Receives webhooks from the production Sanity dataset (configured manually
 * in Project Settings → API → Webhooks) and mirrors the change into the
 * staging dataset. The staging worker's NEXT_PUBLIC_SANITY_DATASET=staging
 * makes `getSanityWriteClient()` resolve to the staging dataset.
 *
 * Drafts (`drafts.<id>`) are first-class — when "Trigger webhook when drafts
 * are modified" is enabled in the Sanity webhook UI, draft changes sync too.
 * That's what makes Presentation tool work post-sunset (the staging worker
 * in draft mode reads `drafts.<id>` from staging and shows the in-flight
 * edit).
 *
 * Auth: HMAC SHA-256 signature in the `sanity-webhook-signature` header,
 * format `t=<unix-ms>,v1=<base64url-hmac>`, signed payload is
 * `${timestamp}.${rawBody}`. Verified against `SANITY_WEBHOOK_SECRET` via
 * `crypto.subtle.verify` (timing-safe). Endpoint returns 404 when the
 * secret is unset (so the prod worker silently rejects sync attempts even
 * though the route exists in the bundle — kept as plain text 404 to look
 * like a real Next 404 rather than advertising the route's existence).
 *
 * Replay defense: signatures with a timestamp more than 5 minutes off from
 * `Date.now()` are rejected. Sanity's signing timestamp is unix-ms so the
 * window is symmetric (covers both stale captures and clock-skewed
 * forward-replay).
 *
 * Required Sanity webhook config (UI):
 *   - URL: https://staging.withjosephine.com/api/sanity-sync
 *   - Dataset: production
 *   - Trigger on: Create, Update, Delete (all 3)
 *   - HTTP method: POST
 *   - Drafts: enabled (Advanced settings → "Trigger webhook when drafts are modified")
 *   - Filter: _type != "sanity.imageAsset" && _type != "sanity.fileAsset"
 *   - Projection (required — must set this exactly):
 *       {
 *         _id,
 *         _type,
 *         ...,
 *         "_operation": delta::operation()
 *       }
 *   - Secret: <SANITY_WEBHOOK_SECRET> value (must match the worker secret)
 */

const ASSET_TYPES = new Set(["sanity.imageAsset", "sanity.fileAsset"]);
const REPLAY_WINDOW_MS = 5 * 60 * 1000;

type SanityOperation = "create" | "update" | "delete";

function isSanityOperation(value: unknown): value is SanityOperation {
  return value === "create" || value === "update" || value === "delete";
}

function parseSignatureHeader(header: string): { timestamp: string; signature: string } | null {
  const parts = header.split(",").map((part) => part.trim());
  let timestamp: string | null = null;
  let signature: string | null = null;
  for (const part of parts) {
    if (part.startsWith("t=")) timestamp = part.slice(2);
    else if (part.startsWith("v1=")) signature = part.slice(3);
  }
  if (!timestamp || !signature) return null;
  return { timestamp, signature };
}

function isTimestampFresh(timestamp: string, now: number = Date.now()): boolean {
  const ts = Number.parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(now - ts) <= REPLAY_WINDOW_MS;
}

async function verifySignature(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  const parsed = parseSignatureHeader(signatureHeader);
  if (!parsed) return false;
  if (!isTimestampFresh(parsed.timestamp)) return false;
  const sigBytes = base64UrlDecodeToBytes(parsed.signature);
  if (!sigBytes) return false;
  return verifyHmacSha256(secret, `${parsed.timestamp}.${rawBody}`, sigBytes);
}

export async function POST(request: Request): Promise<Response> {
  const secret = optionalEnv("SANITY_WEBHOOK_SECRET");
  if (!secret) {
    // Plain text 404 so an unconfigured prod worker looks like a normal Next
    // not-found, not "this route exists, you're just unauthorized".
    return new NextResponse("Not Found", { status: 404 });
  }

  const signatureHeader = request.headers.get("sanity-webhook-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  const rawBody = await request.text();
  if (!(await verifySignature(rawBody, signatureHeader, secret))) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { _id?: string; _type?: string; _operation?: string } & Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const operation = payload._operation;
  if (!isSanityOperation(operation)) {
    return NextResponse.json(
      { error: "Missing or invalid _operation in payload (Sanity projection must include `\"_operation\": delta::operation()`)" },
      { status: 400 },
    );
  }

  const docId = payload._id;
  if (!docId) {
    return NextResponse.json({ error: "Missing _id in payload" }, { status: 400 });
  }

  if (payload._type && ASSET_TYPES.has(payload._type)) {
    return NextResponse.json({ skipped: "asset type" }, { status: 200 });
  }

  const writeClient = getSanityWriteClient();

  if (operation === "delete") {
    await writeClient.delete(docId);
    return NextResponse.json({ synced: docId, op: "delete" }, { status: 200 });
  }

  const docType = payload._type;
  if (!docType) {
    return NextResponse.json({ error: "Missing _type for create/update" }, { status: 400 });
  }

  // Strip the synthetic `_operation` field before writing — Sanity projections
  // injected it for us; it shouldn't land in the synced doc.
  const docFields: Record<string, unknown> = { ...payload };
  delete docFields._operation;

  await writeClient.createOrReplace({
    ...docFields,
    _id: docId,
    _type: docType,
  });

  return NextResponse.json({ synced: docId, op: operation }, { status: 200 });
}
