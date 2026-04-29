import { NextResponse } from "next/server";

import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import {
  deleteSubmissionAndPhoto,
  listAllReferencedPhotoKeys,
  listSubmissionsByStatusOlderThan,
  markSubmissionExpired,
  scrubSubmissionPhoto,
} from "@/lib/booking/submissions";
import { deleteObject, listObjectsByPrefix } from "@/lib/r2";

const PENDING_TO_EXPIRED_DAYS = 14;
const EXPIRED_TO_DELETE_DAYS = 30;
const PAID_PHOTO_RETENTION_DAYS = 90;
const ORPHAN_GRACE_HOURS = 24;
const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const PHOTO_PREFIX = "submissions/";

function cutoffIso(daysAgo: number, now: Date): string {
  return new Date(now.getTime() - daysAgo * MS_PER_DAY).toISOString();
}

async function reapOrphanPhotos(now: Date): Promise<number> {
  const graceCutoff = now.getTime() - ORPHAN_GRACE_HOURS * MS_PER_HOUR;
  const [r2Objects, referencedKeys] = await Promise.all([
    listObjectsByPrefix(PHOTO_PREFIX),
    listAllReferencedPhotoKeys(),
  ]);

  let reaped = 0;
  for (const object of r2Objects) {
    if (referencedKeys.has(object.key)) continue;
    if (object.lastModified.getTime() > graceCutoff) continue;
    try {
      await deleteObject(object.key);
      reaped += 1;
    } catch (error) {
      console.error(`[cleanup] Failed to reap orphan ${object.key}`, error);
    }
  }
  return reaped;
}

async function cleanup(): Promise<{
  expired: number;
  deleted: number;
  photosDeleted: number;
  orphansReaped: number;
}> {
  const now = new Date();
  const summary = { expired: 0, deleted: 0, photosDeleted: 0, orphansReaped: 0 };

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

  summary.orphansReaped = await reapOrphanPhotos(now);

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
