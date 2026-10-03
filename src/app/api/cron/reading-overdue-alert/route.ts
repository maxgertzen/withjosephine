import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { findReadingDeliveryEntry } from "@/lib/booking/emailFiredType";
import { fetchUndeliveredSubmissionIds } from "@/lib/booking/persistence/sanityDelivery";
import {
  appendEmailFired,
  buildSubmissionContext,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { sendReadingOverdueAlert } from "@/lib/resend";

const DAYS_PAST_PAID = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

async function alertOne(submission: SubmissionRecord): Promise<"alerted" | "skipped"> {
  if (submission.status !== "paid") return "skipped";
  const context = buildSubmissionContext(submission);
  const result = await sendReadingOverdueAlert(context);
  if (result.kind !== "sent") return "skipped";
  await appendEmailFired(submission._id, {
    type: "reading_overdue_alert",
    sentAt: new Date().toISOString(),
    resendId: result.resendId,
  });
  return "alerted";
}

async function runCron(): Promise<{ processed: number; alerted: number; skipped: number }> {
  const cutoff = new Date(Date.now() - DAYS_PAST_PAID * MS_PER_DAY).toISOString();
  const candidates = await listPaidSubmissionsForEmail("reading_overdue_alert", {
    paidBefore: cutoff,
  });
  if (candidates.length === 0) {
    return { processed: 0, alerted: 0, skipped: 0 };
  }

  const undelivered = await fetchUndeliveredSubmissionIds(candidates.map((c) => c._id));

  let alerted = 0;
  let skipped = 0;
  for (const submission of candidates) {
    if (!undelivered.has(submission._id) || findReadingDeliveryEntry(submission.emailsFired)) {
      skipped += 1;
      continue;
    }
    try {
      const outcome = await alertOne(submission);
      if (outcome === "alerted") alerted += 1;
      else skipped += 1;
    } catch (error) {
      console.error(`[cron-reading-overdue-alert] Failed for ${submission._id}`, error);
      skipped += 1;
    }
  }

  return { processed: candidates.length, alerted, skipped };
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
