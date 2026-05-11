import { NextResponse } from "next/server";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import { countActivePendingGiftsForRecipient } from "@/lib/booking/persistence/repository";
import { createSubmission } from "@/lib/booking/submissions";
import { getClientIp } from "@/lib/request";
import { fetchReading } from "@/lib/sanity/fetch";
import type { SanityReading } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_GIFT_MESSAGE_CHARS = 280;
const MAX_GIFT_NAME_CHARS = 80;
const MAX_PURCHASER_FIRST_NAME_CHARS = 80;
const SEND_AT_MAX_DAYS = 365;
const MAX_ACTIVE_GIFTS_PER_RECIPIENT = 3;

type DeliveryMethod = "self_send" | "scheduled";

type GiftBookingBody = {
  readingSlug: string;
  purchaserEmail: string;
  purchaserFirstName: string;
  deliveryMethod: DeliveryMethod;
  recipientName?: string;
  recipientEmail?: string;
  giftMessage?: string;
  giftSendAt?: string;
  art6Consent: boolean;
  coolingOffConsent: boolean;
  termsConsent: boolean;
  consentLabelSnapshot?: string;
  turnstileToken: string;
  [HONEYPOT_FIELD]?: string;
};

function isGiftBody(body: unknown): body is GiftBookingBody {
  if (typeof body !== "object" || body === null) return false;
  const c = body as Record<string, unknown>;
  return (
    typeof c.readingSlug === "string" &&
    typeof c.purchaserEmail === "string" &&
    typeof c.purchaserFirstName === "string" &&
    (c.deliveryMethod === "self_send" || c.deliveryMethod === "scheduled") &&
    typeof c.art6Consent === "boolean" &&
    typeof c.coolingOffConsent === "boolean" &&
    typeof c.termsConsent === "boolean" &&
    typeof c.turnstileToken === "string"
  );
}

type FieldError = { field: string; message: string };

function validateBody(body: GiftBookingBody, now: Date): FieldError[] {
  const errors: FieldError[] = [];

  const purchaserEmail = body.purchaserEmail.trim().toLowerCase();
  if (!EMAIL_RE.test(purchaserEmail)) {
    errors.push({ field: "purchaserEmail", message: "Enter a valid email address." });
  }

  const purchaserFirstName = body.purchaserFirstName.trim();
  if (!purchaserFirstName) {
    errors.push({ field: "purchaserFirstName", message: "Your first name is required." });
  } else if (purchaserFirstName.length > MAX_PURCHASER_FIRST_NAME_CHARS) {
    errors.push({
      field: "purchaserFirstName",
      message: `Keep it under ${MAX_PURCHASER_FIRST_NAME_CHARS} characters.`,
    });
  }

  if (!body.art6Consent) {
    errors.push({ field: "art6Consent", message: "Required to proceed." });
  }
  if (!body.coolingOffConsent) {
    errors.push({ field: "coolingOffConsent", message: "Required to proceed." });
  }
  if (!body.termsConsent) {
    errors.push({ field: "termsConsent", message: "Required to proceed." });
  }

  const recipientEmail = body.recipientEmail?.trim().toLowerCase();
  const recipientName = body.recipientName?.trim();

  if (body.deliveryMethod === "scheduled") {
    if (!recipientName) {
      errors.push({ field: "recipientName", message: "Recipient name is required." });
    } else if (recipientName.length > MAX_GIFT_NAME_CHARS) {
      errors.push({
        field: "recipientName",
        message: `Keep it under ${MAX_GIFT_NAME_CHARS} characters.`,
      });
    }
    if (!recipientEmail || !EMAIL_RE.test(recipientEmail)) {
      errors.push({
        field: "recipientEmail",
        message: "Enter a valid recipient email address.",
      });
    }
    if (!body.giftSendAt) {
      errors.push({ field: "giftSendAt", message: "Pick when the gift should be sent." });
    } else {
      const sendAt = new Date(body.giftSendAt);
      if (Number.isNaN(sendAt.getTime())) {
        errors.push({ field: "giftSendAt", message: "Invalid date." });
      } else {
        const maxAt = new Date(now);
        maxAt.setUTCDate(maxAt.getUTCDate() + SEND_AT_MAX_DAYS);
        if (sendAt.getTime() < now.getTime() - 60_000) {
          errors.push({ field: "giftSendAt", message: "Send-at must be now or in the future." });
        } else if (sendAt.getTime() > maxAt.getTime()) {
          errors.push({
            field: "giftSendAt",
            message: `Send-at must be within ${SEND_AT_MAX_DAYS} days.`,
          });
        }
      }
    }
  } else {
    if (recipientName && recipientName.length > MAX_GIFT_NAME_CHARS) {
      errors.push({
        field: "recipientName",
        message: `Keep it under ${MAX_GIFT_NAME_CHARS} characters.`,
      });
    }
    if (recipientEmail && !EMAIL_RE.test(recipientEmail)) {
      errors.push({
        field: "recipientEmail",
        message: "Enter a valid recipient email address.",
      });
    }
  }

  if (recipientEmail && recipientEmail === purchaserEmail) {
    errors.push({
      field: "recipientEmail",
      message: "The recipient must be someone other than you.",
    });
  }

  if (body.giftMessage && body.giftMessage.length > MAX_GIFT_MESSAGE_CHARS) {
    errors.push({
      field: "giftMessage",
      message: `Keep it under ${MAX_GIFT_MESSAGE_CHARS} characters.`,
    });
  }

  return errors;
}

function buildPaymentUrl(
  reading: SanityReading,
  submissionId: string,
  purchaserEmail: string,
  deliveryMethod: DeliveryMethod,
): string | null {
  if (!reading.stripePaymentLink) return null;
  let url: URL;
  try {
    url = new URL(reading.stripePaymentLink);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || !url.hostname.endsWith(".stripe.com")) return null;
  url.searchParams.set("client_reference_id", submissionId);
  url.searchParams.set("prefilled_email", purchaserEmail);
  url.searchParams.set("metadata[is_gift]", "true");
  url.searchParams.set("metadata[gift_delivery_method]", deliveryMethod);
  return url.toString();
}

export async function POST(request: Request): Promise<Response> {
  assertEnvironmentBindings();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isGiftBody(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof parsedBody[HONEYPOT_FIELD] === "string" && parsedBody[HONEYPOT_FIELD] !== "") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const now = new Date();
  const fieldErrors = validateBody(parsedBody, now);
  if (fieldErrors.length > 0) {
    const byField: Record<string, string> = {};
    for (const error of fieldErrors) {
      if (!byField[error.field]) byField[error.field] = error.message;
    }
    return NextResponse.json({ error: "Validation failed", fieldErrors: byField }, { status: 400 });
  }

  const ip = getClientIp(request);

  const turnstileOk = await verifyTurnstileToken(parsedBody.turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const reading = await fetchReading(parsedBody.readingSlug);
  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  const purchaserEmail = parsedBody.purchaserEmail.trim().toLowerCase();
  const purchaserFirstName = parsedBody.purchaserFirstName.trim();
  const recipientEmail = parsedBody.recipientEmail?.trim().toLowerCase() ?? null;
  const recipientName = parsedBody.recipientName?.trim() ?? null;
  const giftMessage = parsedBody.giftMessage?.trim() || null;

  // Anti-abuse cap is only enforceable when we have the recipient email at
  // purchase time. self_send mode may submit without one — the cap re-checks
  // at claim time once the recipient lands on a row.
  if (recipientEmail) {
    const activeCount = await countActivePendingGiftsForRecipient(recipientEmail);
    if (activeCount >= MAX_ACTIVE_GIFTS_PER_RECIPIENT) {
      return NextResponse.json(
        {
          error: "Too many pending gifts",
          fieldErrors: {
            recipientEmail:
              "This recipient already has gifts waiting. Ask them to claim one before sending another.",
          },
        },
        { status: 422 },
      );
    }
  }

  const submissionId = crypto.randomUUID();
  const nowIso = now.toISOString();
  const responses: Array<{
    fieldKey: string;
    fieldLabelSnapshot: string;
    fieldType: string;
    value: string;
  }> = [
    {
      fieldKey: "purchaser_first_name",
      fieldLabelSnapshot: "Your first name",
      fieldType: "shortText",
      value: purchaserFirstName,
    },
  ];
  if (recipientName) {
    responses.push({
      fieldKey: "recipient_name",
      fieldLabelSnapshot: "Recipient name",
      fieldType: "shortText",
      value: recipientName,
    });
  }

  try {
    await createSubmission({
      id: submissionId,
      email: purchaserEmail,
      status: "pending",
      readingSlug: parsedBody.readingSlug,
      readingName: reading.name,
      readingPriceDisplay: reading.priceDisplay,
      responses,
      consentLabel: parsedBody.consentLabelSnapshot ?? null,
      photoR2Key: null,
      createdAt: nowIso,
      consentAcknowledgedAt: nowIso,
      ipAddress: ip ?? null,
      // Art. 6 covers purchaser-data processing (email + cooling-off ack).
      // Art. 9 is special-category (birth) data — the recipient acknowledges
      // it at claim-time intake, not at purchase time by the purchaser.
      art6AcknowledgedAt: nowIso,
      art9AcknowledgedAt: null,
      isGift: true,
      purchaserUserId: null,
      recipientEmail,
      giftDeliveryMethod: parsedBody.deliveryMethod,
      giftSendAt: parsedBody.deliveryMethod === "scheduled" ? parsedBody.giftSendAt! : null,
      giftMessage,
    });
  } catch (error) {
    console.error("[booking-gift] Failed to create submission", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  const paymentUrl = buildPaymentUrl(
    reading,
    submissionId,
    purchaserEmail,
    parsedBody.deliveryMethod,
  );
  if (!paymentUrl) {
    return NextResponse.json(
      { error: "Payment is not currently available for this reading." },
      { status: 503 },
    );
  }

  return NextResponse.json({ paymentUrl, submissionId });
}
