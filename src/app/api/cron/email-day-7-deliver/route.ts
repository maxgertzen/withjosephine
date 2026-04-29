import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  appendEmailFired,
  buildSubmissionContext,
  listPaidSubmissionsForEmail,
  type SubmissionRecord,
} from "@/lib/booking/submissions";
import { signListenToken } from "@/lib/listenToken";
import { sendDay7Delivery } from "@/lib/resend";

const SITE_ORIGIN = "https://withjosephine.com";

async function deliverOne(submission: SubmissionRecord): Promise<"sent" | "skipped"> {
  if (submission.status !== "paid") return "skipped";
  if (!submission.deliveredAt) return "skipped";
  const token = await signListenToken(submission._id);
  const listenUrl = `${SITE_ORIGIN}/listen/${token}`;
  const context = buildSubmissionContext(submission);
  const result = await sendDay7Delivery(context, listenUrl);
  if (!result.resendId) return "skipped";
  await appendEmailFired(submission._id, {
    type: "day7",
    sentAt: new Date().toISOString(),
    resendId: result.resendId,
  });
  return "sent";
}

async function runCron(): Promise<{ processed: number; sent: number; skipped: number }> {
  const candidates = await listPaidSubmissionsForEmail("day7", {
    requireDeliveredAt: true,
  });

  let sent = 0;
  let skipped = 0;
  for (const submission of candidates) {
    try {
      const outcome = await deliverOne(submission);
      if (outcome === "sent") sent += 1;
      else skipped += 1;
    } catch (error) {
      console.error(`[cron-email-day-7-deliver] Failed for ${submission._id}`, error);
      skipped += 1;
    }
  }

  return { processed: candidates.length, sent, skipped };
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
