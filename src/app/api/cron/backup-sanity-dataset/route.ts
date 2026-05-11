import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";
import { buildFileUrl, buildImageUrl, parseAssetId } from "@sanity/asset-utils";
import * as Sentry from "@sentry/cloudflare";
import { NextResponse } from "next/server";

import { type AssetRef,extractAssetRefs } from "@/lib/backup/ndjsonAssets";
import {
  type BackupPeriod,
  backupPeriodPrefix,
  resolveBackupPeriod,
} from "@/lib/backup/period";
import { isValidPhotoR2Key } from "@/lib/backup/photoKeyValidation";
import { streamToR2Multipart } from "@/lib/backup/r2Multipart";
import {
  fetchSanityExportStream,
  SanityExportError,
} from "@/lib/backup/sanityExport";
import type { R2Bucket } from "@/lib/backup/types";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { isFlagEnabled, requireEnv } from "@/lib/env";

const ASSET_FETCH_TIMEOUT_MS = 30_000;
const ASSET_CONCURRENCY = 6;

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isFlagEnabled("SANITY_BACKUP_ENABLED")) {
    return NextResponse.json({ skipped: true, reason: "flag_off" as const });
  }

  const startedAt = Date.now();
  const backupId = crypto.randomUUID();

  try {
    const result = await runBackup({ backupId, startedAt });
    console.log(
      `[backup] dataset=${result.datasetName} period=${result.periodKind}/${result.periodLabel} ` +
        `ndjsonBytes=${result.ndjsonBytes} records=${result.recordCount} ` +
        `assets=${result.assetCount - result.assetFailures}/${result.assetCount} ` +
        `durationMs=${result.durationMs}`,
    );
    return NextResponse.json(result);
  } catch (error) {
    const stage = error instanceof SanityExportError ? "sanity-export" : "top-level";
    Sentry.captureException(error, {
      tags: { cron: "backup-sanity-dataset", stage },
      extra: { backupId },
    });
    const message =
      error instanceof SanityExportError
        ? `Sanity export failed: HTTP ${error.status}`
        : error instanceof Error
          ? error.message
          : "backup failed";
    return NextResponse.json(
      { success: false, partial: false, error: message, backupId },
      { status: 500 },
    );
  }
}

interface BackupContext {
  backupId: string;
  backupsBucket: R2Bucket;
  bookingPhotos: R2Bucket | undefined;
  sanityProjectId: string;
  sanityDataset: string;
  periodPrefix: string;
}

interface RunBackupResult {
  backupId: string;
  datasetName: string;
  periodLabel: string;
  periodKind: BackupPeriod["kind"];
  durationMs: number;
  ndjsonBytes: number;
  recordCount: number;
  assetCount: number;
  assetFailures: number;
  assetBytes: number;
  totalBytes: number;
  success: true;
  partial: boolean;
}

async function runBackup(args: {
  backupId: string;
  startedAt: number;
}): Promise<RunBackupResult> {
  const { env } = await getCloudflareContext({ async: true });
  const backupsBucket = env.BACKUPS_BUCKET;
  if (!backupsBucket) {
    throw new Error("BACKUPS_BUCKET binding missing — backup cron cannot run");
  }

  const sanityProjectId = requireEnv("NEXT_PUBLIC_SANITY_PROJECT_ID");
  const sanityDataset = requireEnv("NEXT_PUBLIC_SANITY_DATASET");
  const token = requireEnv("SANITY_EXPORT_TOKEN");

  const period = resolveBackupPeriod(new Date(args.startedAt));
  const periodPrefix = backupPeriodPrefix(period);
  const ndjsonKey = `backups/${periodPrefix}/dataset.ndjson`;

  const { body } = await fetchSanityExportStream({
    projectId: sanityProjectId,
    dataset: sanityDataset,
    token,
  });
  const ndjsonResult = await streamToR2Multipart({
    bucket: backupsBucket,
    key: ndjsonKey,
    source: body,
    httpMetadata: { contentType: "application/x-ndjson" },
  });

  // Re-reading the just-written NDJSON from R2 avoids buffering it in
  // Worker memory between upload and asset-walk. The alternative — tee()
  // on the Sanity stream — has unbounded queueing if R2 upload throughput
  // lags the Sanity download rate, which would breach Workers' 128 MiB
  // request-memory ceiling at projected scale.
  const stored = await backupsBucket.get(ndjsonKey);
  if (!stored?.body) {
    throw new Error(`Backup NDJSON missing after upload: ${ndjsonKey}`);
  }
  const { refs, recordCount } = await extractAssetRefs(stored.body);

  const ctx: BackupContext = {
    backupId: args.backupId,
    backupsBucket,
    bookingPhotos: env.BOOKING_PHOTOS,
    sanityProjectId,
    sanityDataset,
    periodPrefix,
  };
  const assetResult = await uploadAssets(ctx, refs);

  return {
    backupId: args.backupId,
    datasetName: sanityDataset,
    periodLabel: period.label,
    periodKind: period.kind,
    durationMs: Date.now() - args.startedAt,
    ndjsonBytes: ndjsonResult.bytesUploaded,
    recordCount,
    assetCount: refs.length,
    assetFailures: assetResult.failures,
    assetBytes: assetResult.bytesUploaded,
    totalBytes: ndjsonResult.bytesUploaded + assetResult.bytesUploaded,
    success: true,
    partial: assetResult.failures > 0,
  };
}

async function uploadAssets(
  ctx: BackupContext,
  refs: AssetRef[],
): Promise<{ bytesUploaded: number; failures: number }> {
  let bytesUploaded = 0;
  let failures = 0;
  for (let i = 0; i < refs.length; i += ASSET_CONCURRENCY) {
    const batch = refs.slice(i, i + ASSET_CONCURRENCY);
    const results = await Promise.allSettled(batch.map((ref) => uploadOneAsset(ctx, ref)));
    for (const result of results) {
      if (result.status === "fulfilled") {
        bytesUploaded += result.value.bytesUploaded;
      } else {
        failures += 1;
      }
    }
  }
  return { bytesUploaded, failures };
}

async function uploadOneAsset(
  ctx: BackupContext,
  ref: AssetRef,
): Promise<{ bytesUploaded: number }> {
  try {
    const body =
      ref.kind === "sanityFile"
        ? await fetchSanityAssetStream(ref.id, ctx.sanityProjectId, ctx.sanityDataset)
        : await fetchR2PhotoStream(ref.key, ctx.bookingPhotos);
    const key = buildAssetKey(ctx.periodPrefix, ref);
    const result = await streamToR2Multipart({ bucket: ctx.backupsBucket, key, source: body });
    return { bytesUploaded: result.bytesUploaded };
  } catch (error) {
    Sentry.captureException(error, {
      tags: { cron: "backup-sanity-dataset", stage: "asset-walk" },
      extra: { backupId: ctx.backupId, ref },
    });
    throw error;
  }
}

async function fetchSanityAssetStream(
  assetId: string,
  projectId: string,
  dataset: string,
): Promise<ReadableStream<Uint8Array>> {
  const url = resolveSanityCdnUrl(assetId, projectId, dataset);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ASSET_FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Sanity CDN fetch failed: ${response.status} ${url}`);
    }
    if (!response.body) throw new Error(`Sanity CDN returned no body: ${url}`);
    return response.body;
  } finally {
    clearTimeout(timer);
  }
}

async function fetchR2PhotoStream(
  photoKey: string,
  bookingPhotos: R2Bucket | undefined,
): Promise<ReadableStream<Uint8Array>> {
  if (!isValidPhotoR2Key(photoKey)) {
    throw new Error(`Rejected photoR2Key (failed prefix validation): ${photoKey}`);
  }
  if (!bookingPhotos) {
    throw new Error("BOOKING_PHOTOS binding missing — cannot back up R2 photo");
  }
  const object = await bookingPhotos.get(photoKey);
  if (!object?.body) {
    throw new Error(`Photo missing in R2: ${photoKey}`);
  }
  return object.body;
}

function buildAssetKey(periodPrefix: string, ref: AssetRef): string {
  if (ref.kind === "sanityFile") {
    return `backups/${periodPrefix}/assets/sanity/${ref.id}`;
  }
  return `backups/${periodPrefix}/assets/r2/${ref.key}`;
}

function resolveSanityCdnUrl(assetId: string, projectId: string, dataset: string): string {
  const parts = parseAssetId(assetId);
  if (parts.type === "file") return buildFileUrl({ ...parts, projectId, dataset });
  return buildImageUrl({ ...parts, projectId, dataset });
}

export const POST = handle;
export const GET = handle;
