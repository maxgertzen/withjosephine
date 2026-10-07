import { NextResponse } from "next/server";

import { HONEYPOT_FIELD, MAX_EMAIL_CHARS } from "@/lib/booking/constants";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import { buildPaymentUrl } from "@/lib/booking/paymentUrl";
import { flattenActiveFields } from "@/lib/booking/sectionFilters";
import { createSubmission, SUBMISSION_STATUS } from "@/lib/booking/submissions";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import {
  consentSnapshotFromBody,
  isFullyConsented,
  serializeAcknowledgedLabels,
} from "@/lib/compliance/intakeConsent";
import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { redeemGiftSubmission, type RedeemGiftSubmissionResult } from "@/lib/gift/redeemGift";
import { getClientIp } from "@/lib/request";
import { fetchBookingFormFresh, fetchReadingFresh } from "@/lib/sanity/fetch";
import type { SanityFormField, SanityFormFieldType } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

type BookingRequestBody = {
  readingSlug: string;
  values: Record<string, unknown>;
  turnstileToken: string;
  art6Consent: boolean;
  art9Consent: boolean;
  coolingOffConsent: boolean;
  giftCode?: string;
  [HONEYPOT_FIELD]?: string;
};

function isBookingBody(body: unknown): body is BookingRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.readingSlug === "string" &&
    typeof candidate.turnstileToken === "string" &&
    typeof candidate.values === "object" &&
    candidate.values !== null &&
    typeof candidate.art6Consent === "boolean" &&
    typeof candidate.art9Consent === "boolean" &&
    typeof candidate.coolingOffConsent === "boolean" &&
    (candidate.giftCode === undefined || typeof candidate.giftCode === "string")
  );
}

function giftThankYouUrl(readingSlug: string, submissionId: string): string {
  return `/thank-you/${readingSlug}?submissionId=${encodeURIComponent(submissionId)}`;
}

function giftRedeemResponse(readingSlug: string, result: RedeemGiftSubmissionResult): Response {
  switch (result.kind) {
    case "redeemed":
      return NextResponse.json({
        thankYouUrl: giftThankYouUrl(readingSlug, result.submissionId),
        submissionId: result.submissionId,
      });
    case "not_found":
      return NextResponse.json({ error: "gift_not_found" }, { status: 404 });
    case "not_active":
      return NextResponse.json({ error: "gift_not_active" }, { status: 409 });
    case "other_reading":
      return NextResponse.json(
        { error: "gift_other_reading", readingSlug: result.readingSlug },
        { status: 400 },
      );
    case "already_redeemed":
      return NextResponse.json({ error: "gift_already_redeemed" }, { status: 409 });
  }
}

function lookupLabel(field: SanityFormField, value: string): string {
  return field.options?.find((option) => option.value === value)?.label ?? value;
}

function stringifyValue(value: unknown, field: SanityFormField): string {
  if (Array.isArray(value)) {
    if (field.type === "multiSelectExact" || field.type === "select") {
      return value.map((item) => lookupLabel(field, String(item))).join(", ");
    }
    return value.map(String).join(", ");
  }
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value == null) return "";
  if (field.type === "select") return lookupLabel(field, String(value));
  return String(value);
}

function buildResponses(
  fields: SanityFormField[],
  values: Record<string, unknown>,
): Array<{
  fieldKey: string;
  fieldLabelSnapshot: string;
  fieldType: SanityFormFieldType;
  value: string;
}> {
  return fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => ({
      fieldKey: field.key,
      fieldLabelSnapshot: field.label,
      fieldType: field.type,
      value: stringifyValue(values[field.key], field),
    }));
}

type BookingRejectReason =
  | "invalid_json"
  | "invalid_body"
  | "honeypot"
  | "consent"
  | "turnstile"
  | "validation"
  | "email_missing";

function rejectBooking(
  reason: BookingRejectReason,
  body: { error: string; fieldErrors?: Record<string, string> },
): Response {
  console.warn(
    JSON.stringify({
      type: "booking_rejected",
      reason,
      fieldKeys: body.fieldErrors ? Object.keys(body.fieldErrors) : undefined,
    }),
  );
  return NextResponse.json(body, { status: 400 });
}

export async function POST(request: Request) {
  assertEnvironmentBindings();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return rejectBooking("invalid_json", { error: "Invalid JSON" });
  }

  if (!isBookingBody(parsedBody)) {
    return rejectBooking("invalid_body", { error: "Invalid request body" });
  }

  const { giftCode } = parsedBody;

  // Honeypot first — cheap local check rejects bots before we hit Cloudflare.
  if (typeof parsedBody[HONEYPOT_FIELD] === "string" && parsedBody[HONEYPOT_FIELD] !== "") {
    return rejectBooking("honeypot", { error: "Bad request" });
  }

  const consentSnapshot = consentSnapshotFromBody(parsedBody, {
    readingSlug: parsedBody.readingSlug,
  });
  if (!isFullyConsented(consentSnapshot, { requireArt9: true })) {
    return rejectBooking("consent", {
      error: "Art. 6, Art. 9, and cooling-off acknowledgments are all required to submit.",
    });
  }

  const ip = getClientIp(request);

  const turnstileOk = await verifyTurnstileToken(parsedBody.turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return rejectBooking("turnstile", { error: "Verification failed" });
  }

  const [reading, bookingForm] = await Promise.all([
    fetchReadingFresh(parsedBody.readingSlug),
    fetchBookingFormFresh(),
  ]);

  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }
  if (!bookingForm) {
    return NextResponse.json({ error: "Booking form not configured" }, { status: 500 });
  }

  const fields = flattenActiveFields(bookingForm.sections, reading.slug);
  const schema = buildSubmissionSchema(fields);
  const validation = schema.safeParse(parsedBody.values);

  if (!validation.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of validation.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return rejectBooking("validation", { error: "Validation failed", fieldErrors });
  }

  const validatedValues = validation.data as Record<string, unknown>;
  const email = typeof validatedValues.email === "string" ? validatedValues.email : "";
  if (!email) {
    return rejectBooking("email_missing", { error: "Email is required" });
  }
  // RFC 5321 254-char cap — also defends against pathologically long emails
  // being ferried to Stripe Payment Link URLs.
  if (email.length > MAX_EMAIL_CHARS) {
    return rejectBooking("validation", {
      error: "Validation failed",
      fieldErrors: { email: `Email must be ${MAX_EMAIL_CHARS} characters or fewer.` },
    });
  }

  const photoR2Key =
    typeof validatedValues.photo === "string" && validatedValues.photo.length > 0
      ? validatedValues.photo
      : undefined;

  const acknowledgedAt = new Date().toISOString();
  const submission = {
    email,
    readingSlug: parsedBody.readingSlug,
    readingName: reading.name,
    readingPriceDisplay: reading.priceDisplay,
    responses: buildResponses(fields, validatedValues),
    consentLabel: serializeAcknowledgedLabels(consentSnapshot),
    photoR2Key: photoR2Key ?? null,
    createdAt: acknowledgedAt,
    consentAcknowledgedAt: acknowledgedAt,
    ipAddress: ip ?? null,
    art6AcknowledgedAt: acknowledgedAt,
    art9AcknowledgedAt: acknowledgedAt,
    coolingOffAcknowledgedAt: acknowledgedAt,
  };

  if (giftCode !== undefined) {
    if (!(await checkGiftRateLimit(request.headers))) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    try {
      const result = await redeemGiftSubmission({ request, code: giftCode, submission });
      return giftRedeemResponse(parsedBody.readingSlug, result);
    } catch (error) {
      console.error("[booking] Failed to redeem gift", error);
      return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
    }
  }

  const submissionId = crypto.randomUUID();

  try {
    await createSubmission({ ...submission, id: submissionId, status: SUBMISSION_STATUS.pending });
  } catch (error) {
    console.error("[booking] Failed to create submission", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  const paymentUrl = buildPaymentUrl(reading, submissionId, email);
  if (!paymentUrl) {
    return NextResponse.json(
      { error: "Payment is not currently available for this reading." },
      { status: 503 },
    );
  }

  return NextResponse.json({ paymentUrl, submissionId });
}
