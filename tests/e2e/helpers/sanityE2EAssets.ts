/**
 * Sanity-write helpers for the listen-roundtrip Playwright spec. The spec
 * needs to flip a fresh paid submission to "delivered" state (voiceNote +
 * readingPdf + deliveredAt) so the day-7-deliver cron force-mode can mirror
 * Sanity → D1 and the listen page can render the delivered surface.
 *
 * Auth: `SANITY_WRITE_TOKEN` (already provisioned per `.env.staging`).
 * Sanity dedupes assets by SHA-1, so committing the dummy fixtures means N
 * spec runs share a single underlying asset doc.
 */

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createClient, type SanityClient } from "@sanity/client";

import { accessHeaders, requireStagingEnv, STAGING_URL } from "./stagingApi";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);

let cachedWriteClient: SanityClient | null = null;

function getWriteClient(): SanityClient {
  if (cachedWriteClient) return cachedWriteClient;
  cachedWriteClient = createClient({
    projectId: requireStagingEnv("NEXT_PUBLIC_SANITY_PROJECT_ID"),
    dataset: requireStagingEnv("NEXT_PUBLIC_SANITY_DATASET"),
    apiVersion: "2025-01-01",
    token: requireStagingEnv("SANITY_WRITE_TOKEN"),
    useCdn: false,
  });
  return cachedWriteClient;
}

/**
 * Uploads the committed dummy fixtures (audio + PDF) to Sanity as `file`
 * assets, then patches the named submission with both asset refs and a
 * `deliveredAt` timestamp. Idempotent: Sanity dedupes by hash, the patch
 * is a plain `set`.
 */
export async function uploadDummyVoiceAndPdf(
  submissionId: string,
): Promise<{
  voiceAssetId: string;
  pdfAssetId: string;
  deliveredAt: string;
}> {
  const client = getWriteClient();
  const audioBuf = readFileSync(resolve(FIXTURES_DIR, "dummy-audio.wav"));
  const pdfBuf = readFileSync(resolve(FIXTURES_DIR, "dummy-reading.pdf"));

  const [voiceAsset, pdfAsset] = await Promise.all([
    client.assets.upload("file", audioBuf, {
      contentType: "audio/wav",
      filename: "dummy-audio.wav",
    }),
    client.assets.upload("file", pdfBuf, {
      contentType: "application/pdf",
      filename: "dummy-reading.pdf",
    }),
  ]);

  const deliveredAt = new Date().toISOString();

  await client
    .patch(submissionId)
    .set({
      voiceNote: { _type: "file", asset: { _type: "reference", _ref: voiceAsset._id } },
      readingPdf: { _type: "file", asset: { _type: "reference", _ref: pdfAsset._id } },
      deliveredAt,
    })
    .commit();

  return {
    voiceAssetId: voiceAsset._id,
    pdfAssetId: pdfAsset._id,
    deliveredAt,
  };
}

/**
 * Wraps the `GET /api/cron/email-day-7-deliver?force=<id>` engineering seam.
 * Authenticates with `CRON_SECRET` Bearer. Returns the parsed JSON summary
 * so the spec can assert that the named submission was actually mirrored.
 */
export async function forceD1Mirror(submissionId: string): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  awaitingAssets: number;
  submissionId: string;
}> {
  const cronSecret = requireStagingEnv("CRON_SECRET");
  const url = `${STAGING_URL}/api/cron/email-day-7-deliver?force=${encodeURIComponent(submissionId)}`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${cronSecret}`,
      ...accessHeaders(),
    },
  });
  if (!response.ok) {
    throw new Error(
      `[sanityE2EAssets.forceD1Mirror] ${response.status} ${response.statusText} for ${submissionId}`,
    );
  }
  return (await response.json()) as {
    processed: number;
    sent: number;
    skipped: number;
    awaitingAssets: number;
    submissionId: string;
  };
}
