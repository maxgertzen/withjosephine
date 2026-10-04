import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  diffSubmission,
  giftRecordDiffers,
  type GiftRecordSnapshot,
  type SanityMirrorSnapshot,
} from "@/lib/booking/persistence/reconcileMirror";
import { listSubmissionsCreatedAfter } from "@/lib/booking/persistence/repository";
import {
  mirrorAppendEmailFired,
  mirrorSubmissionPatch,
} from "@/lib/booking/persistence/sanityMirror";
import { mirrorGiftRecord, projectGiftRecordWithReading } from "@/lib/gift/giftRecordMirror";
import { listGiftsUpdatedAfter } from "@/lib/gift/gifts";
import { getSanityWriteClient } from "@/lib/sanity/client";

const LOOKBACK_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type SubmissionSummary = {
  checked: number;
  skipped: number;
  patched: number;
  missing: number;
};

type GiftSummary = {
  giftsChecked: number;
  giftsWritten: number;
};

async function reconcileSubmissions(cutoff: string): Promise<SubmissionSummary> {
  const d1Rows = await listSubmissionsCreatedAfter(cutoff);
  if (d1Rows.length === 0) {
    return { checked: 0, skipped: 0, patched: 0, missing: 0 };
  }

  const ids = d1Rows.map((row) => row._id);
  const sanity = await getSanityWriteClient();
  const sanityDocs = await sanity.fetch<SanityMirrorSnapshot[]>(
    `*[_type == "submission" && _id in $ids]{
      _id, status, paidAt, expiredAt,
      amountPaidCents, amountPaidCurrency, emailsFired, emailFailures
    }`,
    { ids },
  );
  const sanityById = new Map(sanityDocs.map((doc) => [doc._id, doc]));

  let skipped = 0;
  let patched = 0;
  let missing = 0;

  for (const row of d1Rows) {
    const action = diffSubmission(row, sanityById.get(row._id) ?? null);
    if (action.kind === "skip") {
      skipped += 1;
      continue;
    }
    if (action.kind === "create") {
      // Consent snapshot (acknowledgedAt + IP) lives only on the Sanity doc,
      // so we can't faithfully reconstruct it from D1 — surface in cron
      // telemetry for admin recovery rather than auto-recreate.
      console.warn(
        `[reconcile-mirror] missing Sanity doc for ${row._id} — recreate path is admin-only`,
      );
      missing += 1;
      continue;
    }
    if (Object.keys(action.patch).length > 0) {
      await mirrorSubmissionPatch(row._id, action.patch);
    }
    for (const entry of action.missingEmails) {
      await mirrorAppendEmailFired(row._id, entry);
    }
    patched += 1;
  }

  return { checked: d1Rows.length, skipped, patched, missing };
}

async function reconcileGiftRecords(cutoff: string): Promise<GiftSummary> {
  const giftRows = await listGiftsUpdatedAfter(cutoff);
  if (giftRows.length === 0) return { giftsChecked: 0, giftsWritten: 0 };

  const sanity = await getSanityWriteClient();
  const giftDocs = await sanity.fetch<GiftRecordSnapshot[]>(
    `*[_type == "giftRecord" && _id in $ids]{
      _id, reading, status, buyerFirstName, createdAt, paidAt, sentAt,
      resendUsed, openedAt, hasNote, submission
    }`,
    { ids: giftRows.map((row) => row.id) },
  );
  const docById = new Map(giftDocs.map((doc) => [doc._id, doc]));

  let giftsWritten = 0;
  for (const row of giftRows) {
    const projected = await projectGiftRecordWithReading(sanity, row);
    if (!giftRecordDiffers(projected, docById.get(row.id) ?? null)) continue;
    await mirrorGiftRecord(row.id);
    giftsWritten += 1;
  }
  return { giftsChecked: giftRows.length, giftsWritten };
}

async function reconcileMirror(): Promise<SubmissionSummary & GiftSummary> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString();
  const submissions = await reconcileSubmissions(cutoff);
  const gifts = await reconcileGiftRecords(cutoff);
  return { ...submissions, ...gifts };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await reconcileMirror();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
