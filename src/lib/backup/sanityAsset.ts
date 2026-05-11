/**
 * Sanity CDN URL resolution + asset-binary fetch. Shared between the weekly
 * backup cron (`/api/cron/backup-sanity-dataset`) and the per-upload webhook
 * (`/api/sanity-backup-webhook`).
 *
 * Sanity asset IDs encode kind + hash (+ dimensions for images) + extension.
 * `@sanity/asset-utils.parseAssetId` validates the shape — malformed IDs throw
 * synchronously, which prevents SSRF-via-crafted-ref.
 */

import { buildFileUrl, buildImageUrl, parseAssetId } from "@sanity/asset-utils";

export interface FetchSanityAssetOptions {
  signal?: AbortSignal;
}

export interface SanityAssetFetchResult {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  contentLength: number | null;
}

export function resolveSanityCdnUrl(
  assetId: string,
  projectId: string,
  dataset: string,
): string {
  const parts = parseAssetId(assetId);
  if (parts.type === "file") return buildFileUrl({ ...parts, projectId, dataset });
  return buildImageUrl({ ...parts, projectId, dataset });
}

export async function fetchSanityAssetStream(
  assetId: string,
  projectId: string,
  dataset: string,
  opts: FetchSanityAssetOptions = {},
): Promise<SanityAssetFetchResult> {
  const url = resolveSanityCdnUrl(assetId, projectId, dataset);
  const response = await fetch(url, { signal: opts.signal });
  if (!response.ok) {
    throw new Error(`Sanity CDN fetch failed: ${response.status} ${url}`);
  }
  if (!response.body) {
    throw new Error(`Sanity CDN returned no body: ${url}`);
  }
  const contentLengthHeader = response.headers.get("content-length");
  return {
    body: response.body,
    contentType: response.headers.get("content-type") ?? "application/octet-stream",
    contentLength: contentLengthHeader ? Number.parseInt(contentLengthHeader, 10) : null,
  };
}
