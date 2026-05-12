import { NextResponse } from "next/server";

import { editGiftRecipient } from "@/lib/booking/submissions";
import { scheduleGiftAlarm } from "@/lib/durable-objects/giftClaimSchedulerClient";

import { authorizeGiftPurchaser } from "../_lib/authorizeGiftPurchaser";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_RECIPIENT_NAME_CHARS = 80;
const SEND_AT_MAX_DAYS = 365;
const MIN_SEND_AT_OFFSET_MS = 5 * 60 * 1000;

type FieldError = { field: string; message: string };

type EditBody = {
  recipientEmail?: string;
  recipientName?: string;
  giftSendAt?: string | null;
};

function parseBody(value: unknown): EditBody | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const out: EditBody = {};
  if (v.recipientEmail !== undefined) {
    if (typeof v.recipientEmail !== "string") return null;
    out.recipientEmail = v.recipientEmail;
  }
  if (v.recipientName !== undefined) {
    if (typeof v.recipientName !== "string") return null;
    out.recipientName = v.recipientName;
  }
  if (v.giftSendAt !== undefined) {
    if (v.giftSendAt !== null && typeof v.giftSendAt !== "string") return null;
    out.giftSendAt = v.giftSendAt;
  }
  return out;
}

function validate(
  body: EditBody,
  purchaserEmail: string,
  now: Date,
): { errors: FieldError[]; cleaned: EditBody } {
  const errors: FieldError[] = [];
  const cleaned: EditBody = {};

  if (body.recipientEmail !== undefined) {
    const trimmed = body.recipientEmail.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) {
      errors.push({ field: "recipientEmail", message: "Enter a valid recipient email address." });
    } else if (trimmed === purchaserEmail.toLowerCase()) {
      errors.push({
        field: "recipientEmail",
        message: "The recipient email can’t be your own.",
      });
    } else {
      cleaned.recipientEmail = trimmed;
    }
  }

  if (body.recipientName !== undefined) {
    const trimmed = body.recipientName.trim();
    if (trimmed.length === 0) {
      errors.push({ field: "recipientName", message: "Recipient name can’t be blank." });
    } else if (trimmed.length > MAX_RECIPIENT_NAME_CHARS) {
      errors.push({
        field: "recipientName",
        message: `Keep it under ${MAX_RECIPIENT_NAME_CHARS} characters.`,
      });
    } else {
      cleaned.recipientName = trimmed;
    }
  }

  if (body.giftSendAt !== undefined) {
    if (body.giftSendAt === null) {
      cleaned.giftSendAt = null;
    } else {
      const sendAt = new Date(body.giftSendAt);
      if (Number.isNaN(sendAt.getTime())) {
        errors.push({ field: "giftSendAt", message: "Invalid date." });
      } else {
        const minAt = now.getTime() + MIN_SEND_AT_OFFSET_MS;
        const maxAt = new Date(now);
        maxAt.setUTCDate(maxAt.getUTCDate() + SEND_AT_MAX_DAYS);
        if (sendAt.getTime() < minAt) {
          errors.push({
            field: "giftSendAt",
            message: "Send-at must be at least five minutes from now.",
          });
        } else if (sendAt.getTime() > maxAt.getTime()) {
          errors.push({
            field: "giftSendAt",
            message: `Send-at must be within ${SEND_AT_MAX_DAYS} days.`,
          });
        } else {
          cleaned.giftSendAt = sendAt.toISOString();
        }
      }
    }
  }

  return { errors, cleaned };
}

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const auth = await authorizeGiftPurchaser(id);
  if (!auth.ok) return auth.response;
  const { submission } = auth;

  if (submission.giftClaimEmailFiredAt) {
    return NextResponse.json({ error: "Already sent" }, { status: 409 });
  }
  if (submission.giftClaimedAt || submission.giftCancelledAt) {
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  const raw = await request.json().catch(() => null);
  const body = parseBody(raw);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const { errors, cleaned } = validate(body, submission.email, new Date());
  if (errors.length > 0) {
    return NextResponse.json({ error: "Invalid", fieldErrors: errors }, { status: 422 });
  }
  if (
    cleaned.recipientEmail === undefined &&
    cleaned.recipientName === undefined &&
    cleaned.giftSendAt === undefined
  ) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  const result = await editGiftRecipient(id, cleaned, submission);
  if (!result.updated) {
    // WHERE-guard rejected the write — concurrent state transition.
    return NextResponse.json({ error: "Closed" }, { status: 409 });
  }

  if (
    cleaned.giftSendAt !== undefined &&
    cleaned.giftSendAt !== null &&
    submission.giftDeliveryMethod === "scheduled"
  ) {
    await scheduleGiftAlarm({
      submissionId: id,
      fireAtMs: Date.parse(cleaned.giftSendAt),
    });
  }

  return NextResponse.json({ updated: true });
}
