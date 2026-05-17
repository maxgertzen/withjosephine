// Sanity-write helpers for the listen-roundtrip spec: flips a paid submission
// to "delivered" (voiceNote + readingPdf + deliveredAt) and force-fires the
// day-7-deliver cron's Sanity→D1 mirror for one row.

import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  accessHeaders,
  getStagingSanityClient,
  requireStagingEnv,
  STAGING_URL,
} from "./stagingApi";

const FIXTURES_DIR = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "fixtures",
);

export async function uploadDummyVoiceAndPdf(
  submissionId: string,
): Promise<{
  voiceAssetId: string;
  pdfAssetId: string;
  deliveredAt: string;
}> {
  const client = getStagingSanityClient("write");
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
