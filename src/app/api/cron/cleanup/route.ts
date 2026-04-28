import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  deleteSubmissionAndPhoto,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  scrubSubmissionPhoto,
} from "@/lib/booking/submissions";

const PENDING_TO_EXPIRED_DAYS = 14;
const EXPIRED_TO_DELETE_DAYS = 30;
const PAID_PHOTO_RETENTION_DAYS = 90;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function cutoffIso(daysAgo: number, now: Date): string {
  return new Date(now.getTime() - daysAgo * MS_PER_DAY).toISOString();
}

async function cleanup(): Promise<{
  expired: number;
  deleted: number;
  photosDeleted: number;
}> {
  const now = new Date();
  const summary = { expired: 0, deleted: 0, photosDeleted: 0 };

  const [stalePending, staleExpired, oldPaid] = await Promise.all([
    listSubmissionsByStatusOlderThan("pending", cutoffIso(PENDING_TO_EXPIRED_DAYS, now)),
    listSubmissionsByStatusOlderThan("expired", cutoffIso(EXPIRED_TO_DELETE_DAYS, now)),
    listSubmissionsByStatusOlderThan("paid", cutoffIso(PAID_PHOTO_RETENTION_DAYS, now)),
  ]);

  for (const submission of stalePending) {
    await markSubmissionExpired(submission._id, { expiredAt: now.toISOString() });
    summary.expired += 1;
  }

  for (const submission of staleExpired) {
    const result = await deleteSubmissionAndPhoto(submission);
    summary.deleted += 1;
    if (result.photoDeleted) summary.photosDeleted += 1;
  }

  for (const submission of oldPaid) {
    const photoDeleted = await scrubSubmissionPhoto(submission);
    if (photoDeleted) summary.photosDeleted += 1;
  }

  return summary;
}

async function handle(request: Request): Promise<Response> {
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const summary = await cleanup();
  return NextResponse.json(summary);
}

export const POST = handle;
export const GET = handle;
