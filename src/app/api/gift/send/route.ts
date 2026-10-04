import { NextResponse } from "next/server";

import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import { auditGiftSent } from "@/lib/gift/giftAudit";
import { deriveVerifiedGiftCode, giftUrl } from "@/lib/gift/giftCode";
import {
  claimGiftSend,
  completeGiftSend,
  type CompleteGiftSendInput,
  findGiftById,
  releaseGiftSend,
  resolveGiftState,
} from "@/lib/gift/gifts";
import { giftSendIdempotencyKey, giftSendStatus, validateGiftRecipient } from "@/lib/gift/giftSend";
import { parseGiftSendRequest } from "@/lib/gift/giftSendContract";
import {
  authorizeGiftSendToken,
  rejectInvalidBody,
  rejectInvalidSendLink,
} from "@/lib/gift/giftSendRequest";
import type { GiftEmailFiredEntry, GiftRecord } from "@/lib/gift/types";
import { resolveReadingName } from "@/lib/readingSummary";
import { getClientIp } from "@/lib/request";
import { type EmailSendResult, sendGiftToRecipient } from "@/lib/resend";
import { fetchReadingPublished } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const SEND_FAILED = { error: "send_failed" } as const;
const RECORD_SENT_TRIES = 2;

async function recordSentGift(
  giftId: string,
  args: CompleteGiftSendInput,
  emailFired: GiftEmailFiredEntry | undefined,
): Promise<void> {
  for (let tryNumber = 1; tryNumber <= RECORD_SENT_TRIES; tryNumber += 1) {
    try {
      await completeGiftSend(giftId, args, emailFired);
      return;
    } catch {
      console.error(
        `[gift-send] recording the sent email failed for gift ${giftId} (try ${tryNumber} of ${RECORD_SENT_TRIES})`,
      );
    }
  }
}

function statusConflict(gift: GiftRecord | null): Response {
  return NextResponse.json(giftSendStatus(gift), { status: 409 });
}

export async function POST(request: Request): Promise<Response> {
  assertEnvironmentBindings();

  const authorized = await authorizeGiftSendToken(request, parseGiftSendRequest, {
    onBadBody: rejectInvalidBody,
    onInvalidLink: rejectInvalidSendLink(request, 404),
  });
  if (authorized instanceof Response) return authorized;
  const { giftId, body } = authorized;

  const [turnstileOk, gift] = await Promise.all([
    verifyTurnstileToken(body.turnstileToken, getClientIp(request) ?? undefined),
    findGiftById(giftId),
  ]);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
  if (!gift || resolveGiftState(gift) !== "active") {
    return statusConflict(gift);
  }
  if (!gift.buyerEmail) {
    console.error(`[gift-send] active gift ${giftId} has no buyer email`);
    return NextResponse.json(SEND_FAILED, { status: 500 });
  }

  const recipient = validateGiftRecipient(body, gift.buyerEmail);
  if ("fieldErrors" in recipient) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: recipient.fieldErrors },
      { status: 400 },
    );
  }
  const { recipientName, recipientEmail } = recipient.values;

  const code = await deriveVerifiedGiftCode(gift);
  if (!code) return NextResponse.json(SEND_FAILED, { status: 500 });

  const [claim, readingName] = await Promise.all([
    claimGiftSend(giftId, {
      expectedSendCount: body.expectedSendCount,
      recipientName,
      recipientEmail,
      updatedAt: new Date().toISOString(),
    }),
    resolveReadingName(gift.readingSlug, fetchReadingPublished),
  ]);
  if (!claim) return statusConflict(await findGiftById(giftId));
  const { sendNumber } = claim;
  const idempotencyKey = await giftSendIdempotencyKey(giftId, sendNumber, recipientEmail);

  const result = await sendGiftToRecipient(
    {
      giftId,
      recipientName,
      recipientEmail,
      buyerName: gift.buyerFirstName,
      buyerEmail: gift.buyerEmail,
      note: gift.note,
      readingName,
      code,
      giftUrl: giftUrl(code),
    },
    { idempotencyKey },
  ).catch((): EmailSendResult => {
    console.error(`[gift-send] sendGiftToRecipient threw for gift ${giftId}`);
    return { kind: "failed", error: "send_threw" };
  });
  const sentAt = new Date().toISOString();

  if (result.kind === "failed") {
    const keptRecipientName = sendNumber === 1 ? recipientName : gift.recipientName;
    await Promise.all([
      releaseGiftSend(giftId, { sendNumber, keptRecipientName, updatedAt: sentAt }),
      auditGiftSent(request, { giftId, success: false }).catch(() => {
        console.error(`[gift-send] audit of the failed send failed for gift ${giftId}`);
      }),
    ]);
    return NextResponse.json(SEND_FAILED, { status: 502 });
  }

  const emailFired: GiftEmailFiredEntry | undefined =
    result.kind === "sent" ? { type: "gift_send", sentAt, resendId: result.resendId } : undefined;
  await Promise.all([
    recordSentGift(giftId, { sendNumber, sentAt }, emailFired),
    auditGiftSent(request, { giftId, success: true }).catch(() => {
      console.error(`[gift-send] audit of the sent email failed for gift ${giftId}`);
    }),
  ]);

  return NextResponse.json({
    state: sendNumber === 1 ? "sent" : "used",
    recipientName,
    lastSentAt: sentAt,
  });
}
