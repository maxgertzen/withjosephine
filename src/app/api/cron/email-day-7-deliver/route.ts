import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import {
  appendEmailFired,
  buildSubmissionContext,
  listPaidSubmissionsForEmail,
  markSubmissionDelivered,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendDay7Delivery } from "@/lib/resend";

const SITE_ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://withjosephine.com";

/**
 * Sources D1 candidates → filters via Sanity readiness GROQ → mirrors state
 * to D1 → sends email. Asset existence is the readiness flag (no separate
 * boolean), avoiding the TOCTOU class.
 */

async function deliverOne(
  d1Submission: SubmissionRecord,
  resolved: DeliverableSubmission,
): Promise<"sent" | "skipped"> {
  if (d1Submission.status !== "paid") return "skipped";

  await markSubmissionDelivered(d1Submission._id, {
    deliveredAt: resolved.deliveredAt,
    voiceNoteUrl: resolved.voiceNoteUrl,
    pdfUrl: resolved.pdfUrl,
  });
  const refreshed: SubmissionRecord = {
    ...d1Submission,
    deliveredAt: resolved.deliveredAt,
    voiceNoteUrl: resolved.voiceNoteUrl,
    pdfUrl: resolved.pdfUrl,
  };

  const listenUrl = `${SITE_ORIGIN}/listen/${refreshed._id}`;
  const context = buildSubmissionContext(refreshed);
  const result = await sendDay7Delivery(context, listenUrl);
  if (!result.resendId) return "skipped";

  await appendEmailFired(refreshed._id, {
    type: "day7",
    sentAt: new Date().toISOString(),
    resendId: result.resendId,
  });
  return "sent";
}

async function runCron(): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  awaitingAssets: number;
}> {
  const candidates = await listPaidSubmissionsForEmail("day7", {});
  if (candidates.length === 0) {
    return { processed: 0, sent: 0, skipped: 0, awaitingAssets: 0 };
  }

  const deliverable = await fetchDeliverableSubmissions(candidates.map((c) => c._id));
  const deliverableById = new Map(deliverable.map((d) => [d._id, d]));

  let sent = 0;
  let skipped = 0;
  for (const candidate of candidates) {
    const resolved = deliverableById.get(candidate._id);
    if (!resolved) {
      skipped += 1;
      continue;
    }
    try {
      const outcome = await deliverOne(candidate, resolved);
      if (outcome === "sent") sent += 1;
      else skipped += 1;
    } catch (error) {
      console.error(`[cron-email-day-7-deliver] Failed for ${candidate._id}`, error);
      skipped += 1;
    }
  }

  return {
    processed: candidates.length,
    sent,
    skipped,
    awaitingAssets: candidates.length - deliverable.length,
  };
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await runCron();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
