import type { SanityClient } from "next-sanity";

import {
  findReadingRef,
  getMirrorClient,
  type ReadingRef,
  type WeakReference,
  weakReference,
} from "@/lib/booking/persistence/sanityMirror";

import { findGiftById } from "./persistence/repository";
import { GIFT_SEND_LIMIT, type GiftRecord, type GiftStatus } from "./types";

type StudioGiftStatus = Exclude<GiftStatus, "pending" | "expired">;

function isStudioGiftStatus(status: GiftStatus): status is StudioGiftStatus {
  return status !== "pending" && status !== "expired";
}

export type GiftRecordDocument = {
  _id: string;
  _type: "giftRecord";
  reading?: ReadingRef;
  buyerFirstName: string;
  status: StudioGiftStatus;
  createdAt: string;
  paidAt?: string;
  sentAt?: string;
  resendUsed: boolean;
  openedAt?: string;
  hasNote: boolean;
  submission?: WeakReference;
};

export function projectGiftRecord(
  gift: GiftRecord,
  readingRef: ReadingRef | null,
): GiftRecordDocument | null {
  if (!isStudioGiftStatus(gift.status)) return null;
  return {
    _id: gift.id,
    _type: "giftRecord",
    ...(readingRef ? { reading: readingRef } : {}),
    buyerFirstName: gift.buyerFirstName,
    status: gift.status,
    createdAt: gift.createdAt,
    paidAt: gift.activatedAt ?? undefined,
    sentAt: gift.lastSentAt ?? undefined,
    resendUsed: gift.sendCount >= GIFT_SEND_LIMIT,
    openedAt: gift.redeemedAt ?? undefined,
    hasNote: gift.note !== null,
    ...(gift.redeemedSubmissionId ? { submission: weakReference(gift.redeemedSubmissionId) } : {}),
  };
}

export async function projectGiftRecordWithReading(
  client: SanityClient,
  gift: GiftRecord,
): Promise<GiftRecordDocument | null> {
  return projectGiftRecord(gift, await findReadingRef(client, gift.readingSlug));
}

export async function mirrorGiftRecord(giftId: string): Promise<void> {
  const client = await getMirrorClient();
  if (!client) return;
  try {
    const gift = await findGiftById(giftId);
    const document = gift ? await projectGiftRecordWithReading(client, gift) : null;
    if (document && !document.reading) {
      throw new Error(`reading lookup failed for ${gift?.readingSlug}, stored document kept`);
    }
    if (document) {
      await client.createOrReplace(document, { visibility: "async" });
    } else {
      await client.delete(giftId);
    }
  } catch (error) {
    console.error(
      `[giftRecordMirror] write failed for ${giftId} (drift; reconcile cron will retry)`,
      error,
    );
  }
}
