import type { SanityClient } from "next-sanity";

import { failuresKey, normalizeOptional } from "@/lib/booking/persistence/reconcileMirror";
import {
  existingDocSelection,
  findReadingRef,
  getMirrorClient,
  keyedEmailFailures,
  type ReadingRef,
  submissionMirrorFields,
} from "@/lib/booking/persistence/sanityMirror";
import { type CreateSubmissionParams, splitMirrorConsent } from "@/lib/booking/submissions";

import { GIFT_SUBMISSION_STATUS, type GiftSubmissionStatus } from "./giftSubmissionStatus";
import { findGiftById } from "./persistence/repository";
import { GIFT_SEND_LIMIT, GIFT_STATUS, type GiftEmailFailureEntry, type GiftRecord } from "./types";

type GiftBlock = {
  buyerFirstName?: string;
  boughtAt?: string;
  sentAt?: string;
  resendUsed: boolean;
  openedAt?: string;
  hasNote: boolean;
  emailFailures: ReturnType<typeof keyedGiftFailures>;
};

function keyedGiftFailures(failures: readonly GiftEmailFailureEntry[]) {
  return keyedEmailFailures(failures, "giftEmailFailure");
}

type UnopenedGiftFields = {
  status: GiftSubmissionStatus;
  serviceRef?: ReadingRef;
  createdAt: string;
};

export type GiftSubmissionProjection = {
  docId: string;
  unopened: UnopenedGiftFields | null;
  gift: GiftBlock;
};

export type GiftSubmissionSnapshot = Partial<UnopenedGiftFields> & {
  _id: string;
  gift?: Partial<GiftBlock>;
};

const UNOPENED_STATUS: Partial<Record<GiftRecord["status"], GiftSubmissionStatus>> = {
  [GIFT_STATUS.active]: GIFT_SUBMISSION_STATUS.waiting,
  [GIFT_STATUS.cancelled]: GIFT_SUBMISSION_STATUS.cancelled,
};

const GIFT_BLOCK_COMPARED_FIELDS = [
  "buyerFirstName",
  "boughtAt",
  "sentAt",
  "resendUsed",
  "openedAt",
  "hasNote",
] as const satisfies ReadonlyArray<Exclude<keyof GiftBlock, "emailFailures">>;

export function hasGiftSubmissionDoc(status: GiftRecord["status"]): boolean {
  return status === GIFT_STATUS.redeemed || UNOPENED_STATUS[status] !== undefined;
}

export function giftSubmissionDocId(gift: Pick<GiftRecord, "id" | "redeemedSubmissionId">): string {
  return gift.redeemedSubmissionId ?? gift.id;
}

function projectGiftBlock(gift: GiftRecord): GiftBlock {
  return {
    ...(gift.buyerFirstName ? { buyerFirstName: gift.buyerFirstName } : {}),
    boughtAt: gift.activatedAt ?? undefined,
    sentAt: gift.lastSentAt ?? undefined,
    resendUsed: gift.sendCount >= GIFT_SEND_LIMIT,
    openedAt: gift.redeemedAt ?? undefined,
    hasNote: gift.note !== null,
    emailFailures: keyedGiftFailures(gift.emailFailures),
  };
}

export function projectGiftSubmission(
  gift: GiftRecord,
  readingRef: ReadingRef | null,
): GiftSubmissionProjection | null {
  const unopenedStatus = UNOPENED_STATUS[gift.status];
  if (!unopenedStatus && gift.status !== GIFT_STATUS.redeemed) return null;
  return {
    docId: giftSubmissionDocId(gift),
    unopened: unopenedStatus
      ? {
          status: unopenedStatus,
          ...(readingRef ? { serviceRef: readingRef } : {}),
          createdAt: gift.activatedAt ?? gift.createdAt,
        }
      : null,
    gift: projectGiftBlock(gift),
  };
}

export async function projectGiftSubmissionWithReading(
  client: SanityClient,
  gift: GiftRecord,
): Promise<GiftSubmissionProjection | null> {
  const readingRef =
    gift.status === GIFT_STATUS.redeemed ? null : await findReadingRef(client, gift.readingSlug);
  return projectGiftSubmission(gift, readingRef);
}

function giftBlockDiffers(projected: GiftBlock, stored: Partial<GiftBlock> | undefined): boolean {
  return (
    GIFT_BLOCK_COMPARED_FIELDS.some(
      (field) => normalizeOptional(projected[field]) !== normalizeOptional(stored?.[field]),
    ) || failuresKey(projected.emailFailures) !== failuresKey(stored?.emailFailures ?? [])
  );
}

export function giftSubmissionDiffers(
  projected: GiftSubmissionProjection,
  stored: GiftSubmissionSnapshot | null,
): boolean {
  const { unopened } = projected;
  if (stored === null) return unopened !== null;
  if (giftBlockDiffers(projected.gift, stored.gift)) return true;
  return (
    unopened !== null &&
    (unopened.status !== stored.status ||
      unopened.createdAt !== stored.createdAt ||
      unopened.serviceRef?._ref !== stored.serviceRef?._ref)
  );
}

function unopenedDocSelection(docId: string) {
  return { query: "*[_id == $id && !defined(email)]", params: { id: docId } };
}

function logWriteFailure(docId: string, error: unknown): void {
  console.error(
    `[giftSubmissionMirror] write failed for ${docId} (drift; reconcile cron will retry)`,
    error,
  );
}

export async function writeGiftSubmission(
  client: SanityClient,
  { docId, unopened, gift }: GiftSubmissionProjection,
): Promise<void> {
  try {
    if (!unopened) {
      await client.patch(existingDocSelection(docId)).set({ gift }).commit({ visibility: "async" });
      return;
    }
    if (!unopened.serviceRef) {
      throw new Error("reading lookup failed, stored document kept");
    }
    const fields = { ...unopened, gift };
    await client
      .transaction()
      .createIfNotExists({ _id: docId, _type: "submission", ...fields })
      .patch(unopenedDocSelection(docId), { set: fields })
      .commit({ visibility: "async" });
  } catch (error) {
    logWriteFailure(docId, error);
  }
}

export async function writeGiftRedemption(
  submission: CreateSubmissionParams,
  storedGift: GiftRecord,
): Promise<boolean> {
  const client = await getMirrorClient();
  if (!client) return false;
  try {
    const { input, consent } = splitMirrorConsent(submission);
    const { paidFields, firstWriteWins } = await submissionMirrorFields(client, input, consent);
    await client
      .transaction()
      .createIfNotExists({ _id: input.id, _type: "submission" })
      .patch(input.id, {
        setIfMissing: firstWriteWins,
        set: { ...paidFields, gift: projectGiftBlock(storedGift) },
      })
      .commit({ visibility: "async" });
    return true;
  } catch (error) {
    logWriteFailure(submission.id, error);
    return false;
  }
}

export async function mirrorGiftSubmission(giftId: string): Promise<void> {
  const client = await getMirrorClient();
  if (!client) return;
  try {
    const gift = await findGiftById(giftId);
    const projection = gift ? await projectGiftSubmissionWithReading(client, gift) : null;
    if (projection) await writeGiftSubmission(client, projection);
  } catch (error) {
    logWriteFailure(giftId, error);
  }
}
