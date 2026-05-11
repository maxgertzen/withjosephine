import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import {
  decodeSignatureHeader,
  isValidSignature,
  SIGNATURE_HEADER_NAME,
} from "@sanity/webhook";
import * as Sentry from "@sentry/cloudflare";
import { NextResponse } from "next/server";

import {
  collectAssetRefsFromDoc,
  type SanityFileRef,
} from "@/lib/backup/ndjsonAssets";
import { fetchSanityAssetStream } from "@/lib/backup/sanityAsset";
import type { R2Bucket } from "@/lib/backup/types";
import { isFlagEnabled, optionalEnv, requireEnv } from "@/lib/env";

const REPLAY_WINDOW_MS = 5 * 60 * 1000;
const ASSET_FETCH_TIMEOUT_MS = 30_000;
const LIVE_PREFIX = "backups/live";
// A realistic submission doc is well under 100 KB. 1 MB leaves headroom for
// schema growth without giving unauthenticated callers a cheap memory-pressure
// lever (the body has to be buffered before HMAC verification).
const MAX_WEBHOOK_BODY_BYTES = 1_000_000;

interface WebhookResponseBody {
  docId: string;
  mirrored: number;
  skipped: number;
  failures: number;
}

export async function POST(request: Request): Promise<Response> {
  const secret = optionalEnv("SANITY_BACKUP_WEBHOOK_SECRET");
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

  if (!isFlagEnabled("SANITY_BACKUP_ENABLED")) {
    return NextResponse.json({ skipped: true, reason: "flag_off" as const });
  }

  let payload: { _id?: string; _type?: string } & Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (payload._type !== "submission") {
    return NextResponse.json({ skipped: "non-submission" }, { status: 200 });
  }
  if (!payload._id) {
    return NextResponse.json({ error: "Missing _id in payload" }, { status: 400 });
  }

  const { env } = await getCloudflareContext({ async: true });
  const backupsBucket = env.BACKUPS_BUCKET;
  if (!backupsBucket) {
    Sentry.captureException(new Error("BACKUPS_BUCKET binding missing on webhook"), {
      tags: { route: "sanity-backup-webhook" },
      extra: { docId: payload._id },
    });
    return NextResponse.json(
      { error: "BACKUPS_BUCKET binding missing" },
      { status: 500 },
    );
  }

  const projectId = requireEnv("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const dataset = requireEnv("NEXT_PUBLIC_SANITY_DATASET");

  const refs = collectAssetRefsFromDoc(payload).filter(
    (ref): ref is SanityFileRef => ref.kind === "sanityFile",
  );

  const result = await mirrorAssets({
    docId: payload._id,
    refs,
    backupsBucket,
    projectId,
    dataset,
  });

  console.log(
    `[sanity-backup-webhook] docId=${result.docId} mirrored=${result.mirrored} ` +
      `skipped=${result.skipped} failures=${result.failures}`,
  );

  return NextResponse.json(result);
}

async function verifySignedRequest(
  rawBody: string,
  signatureHeader: string,
  secret: string,
): Promise<boolean> {
  let decoded: { timestamp: number; hashedPayload: string };
  try {
    decoded = decodeSignatureHeader(signatureHeader);
  } catch {
    return false;
  }
  if (!isTimestampFresh(decoded.timestamp)) return false;
  return isValidSignature(rawBody, signatureHeader, secret);
}

function isTimestampFresh(timestampMs: number, now: number = Date.now()): boolean {
  return Number.isFinite(timestampMs) && Math.abs(now - timestampMs) <= REPLAY_WINDOW_MS;
}

interface MirrorAssetsArgs {
  docId: string;
  refs: SanityFileRef[];
  backupsBucket: R2Bucket;
  projectId: string;
  dataset: string;
}

async function mirrorAssets(args: MirrorAssetsArgs): Promise<WebhookResponseBody> {
  let mirrored = 0;
  let skipped = 0;
  let failures = 0;

  for (const ref of args.refs) {
    const key = `${LIVE_PREFIX}/${ref.id}`;
    try {
      const existing = await args.backupsBucket.head(key);
      if (existing) {
        skipped += 1;
        continue;
      }
      await mirrorOneAsset({ ref, key, ...args });
      mirrored += 1;
    } catch (error) {
      failures += 1;
      Sentry.captureException(error, {
        tags: { route: "sanity-backup-webhook", stage: "mirror" },
        extra: { docId: args.docId, ref },
      });
    }
  }
  return { docId: args.docId, mirrored, skipped, failures };
}

async function mirrorOneAsset(args: {
  ref: SanityFileRef;
  key: string;
  backupsBucket: R2Bucket;
  projectId: string;
  dataset: string;
}): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    const { body, contentType } = await fetchSanityAssetStream(
      args.ref.id,
      args.projectId,
      args.dataset,
      { signal: controller.signal },
    );
    await args.backupsBucket.put(args.key, body, {
      httpMetadata: { contentType },
    });
  } finally {
    clearTimeout(timer);
  }
}
