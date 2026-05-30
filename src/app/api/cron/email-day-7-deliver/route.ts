import { NextResponse } from "next/server";

import { tryBuildLibraryUrl } from "@/lib/auth/libraryUrl";
import { mintListenToken } from "@/lib/auth/listenToken";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  type DeliverableSubmission,
  fetchDeliverableSubmissions,
} from "@/lib/booking/persistence/sanityDelivery";
import { sendAndRecord } from "@/lib/booking/sendAndRecord";
import {
  buildSubmissionContext,
  findSubmissionById,
  listPaidSubmissionsForEmail,
  markSubmissionDelivered,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { siteOrigin } from "@/lib/env";
import { sendDay7Delivery } from "@/lib/resend";

// Asset existence is the readiness flag (no separate boolean) to avoid TOCTOU.
async function deliverOne(
  d1Submission: SubmissionRecord,
  resolved: DeliverableSubmission,
): Promise<"sent" | "skipped"> {
  if (d1Submission.status !== "paid") return "skipped";

  if (!d1Submission.recipientUserId) {
    console.error(
      `[cron-day-7] missing recipientUserId for ${d1Submission._id}, cannot mint token`,
    );
    return "skipped";
  }

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

  const token = await mintListenToken({
    submissionId: refreshed._id,
    recipientUserId: d1Submission.recipientUserId,
    mintSource: "cron_day7",
  });
  const listenUrl = `${siteOrigin()}/listen/${refreshed._id}?t=${token}`;
  const libraryUrl = await tryBuildLibraryUrl({
    userId: d1Submission.recipientUserId,
    mintSource: "day7_delivery",
    siteContext: `cron-day-7:${refreshed._id}`,
  });
  const context = buildSubmissionContext(refreshed);
  const sendResult = await sendAndRecord({
    submissionId: refreshed._id,
    type: "day7",
    send: () => sendDay7Delivery(context, listenUrl, libraryUrl),
  });
  return sendResult.appended ? "sent" : "skipped";
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

// Process exactly one submission by id, bypassing the paidAt>=7d candidate
// filter. Auth is the same `CRON_SECRET` Bearer; no new auth primitive.
async function runForce(submissionId: string): Promise<{
  processed: number;
  sent: number;
  skipped: number;
  awaitingAssets: number;
  submissionId: string;
}> {
  const submission = await findSubmissionById(submissionId);
  if (!submission) {
    return { processed: 0, sent: 0, skipped: 1, awaitingAssets: 0, submissionId };
  }

  const [resolved] = await fetchDeliverableSubmissions([submissionId]);
  if (!resolved) {
    return {
      processed: 1,
      sent: 0,
      skipped: 1,
      awaitingAssets: 1,
      submissionId,
    };
  }

  try {
    const outcome = await deliverOne(submission, resolved);
    return {
      processed: 1,
      sent: outcome === "sent" ? 1 : 0,
      skipped: outcome === "skipped" ? 1 : 0,
      awaitingAssets: 0,
      submissionId,
    };
  } catch (error) {
    console.error(`[cron-email-day-7-deliver:force] Failed for ${submissionId}`, error);
    return { processed: 1, sent: 0, skipped: 1, awaitingAssets: 0, submissionId };
  }
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!process.env.AUTH_TOKEN_SECRET) {
    return NextResponse.json(
      { error: "AUTH_TOKEN_SECRET missing" },
      { status: 500 },
    );
  }
  const url = new URL(request.url);
  const force = url.searchParams.get("force");
  if (force) {
    const summary = await runForce(force);
    return NextResponse.json(summary);
  }
  const summary = await runCron();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
