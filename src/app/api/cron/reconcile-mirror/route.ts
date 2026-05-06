import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  diffSubmission,
  type SanityMirrorSnapshot,
} from "@/lib/booking/persistence/reconcileMirror";
import { listSubmissionsCreatedAfter } from "@/lib/booking/persistence/repository";
import {
  mirrorAppendEmailFired,
  mirrorSubmissionPatch,
} from "@/lib/booking/persistence/sanityMirror";
import { getSanityWriteClient } from "@/lib/sanity/client";

const LOOKBACK_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

type Summary = {
  checked: number;
  skipped: number;
  patched: number;
  missing: number;
};

async function reconcileMirror(): Promise<Summary> {
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * MS_PER_DAY).toISOString();
  const d1Rows = await listSubmissionsCreatedAfter(cutoff);
  if (d1Rows.length === 0) {
    return { checked: 0, skipped: 0, patched: 0, missing: 0 };
  }

  const ids = d1Rows.map((row) => row._id);
  const sanity = getSanityWriteClient();
  const sanityDocs = await sanity.fetch<SanityMirrorSnapshot[]>(
    `*[_type == "submission" && _id in $ids]{
      _id, status, paidAt, expiredAt, deliveredAt, voiceNoteUrl, pdfUrl,
      amountPaidCents, amountPaidCurrency, emailsFired
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
      // The original create write was lost; we can't faithfully reconstruct
      // the consent snapshot (acknowledgedAt + IP) from D1 alone — those live
      // only on the Sanity doc. Log and surface in the summary so it shows
      // up in cron telemetry; recovery requires a separate Studio admin
      // action (item #3 in the operational-completeness plan).
      console.warn(`[reconcile-mirror] missing Sanity doc for ${row._id} — recreate path is admin-only`);
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

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await reconcileMirror();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
