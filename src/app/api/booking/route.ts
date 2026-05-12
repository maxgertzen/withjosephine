import { NextResponse } from "next/server";

import { HONEYPOT_FIELD, MAX_EMAIL_CHARS } from "@/lib/booking/constants";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import { flattenActiveFields } from "@/lib/booking/sectionFilters";
import { createSubmission } from "@/lib/booking/submissions";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import { getClientIp } from "@/lib/request";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import type { SanityFormField, SanityFormFieldType, SanityReading } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

type BookingRequestBody = {
  readingSlug: string;
  values: Record<string, unknown>;
  turnstileToken: string;
  consentLabelSnapshot?: string;
  art6Consent: boolean;
  art9Consent: boolean;
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
    typeof candidate.art9Consent === "boolean"
  );
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
  return fields.map((field) => ({
    fieldKey: field.key,
    fieldLabelSnapshot: field.label,
    fieldType: field.type,
    value: stringifyValue(values[field.key], field),
  }));
}

function buildPaymentUrl(
  reading: SanityReading,
  submissionId: string,
  email: string,
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
  url.searchParams.set("prefilled_email", email);
  return url.toString();
}

export async function POST(request: Request) {
  assertEnvironmentBindings();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isBookingBody(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Honeypot first — cheap local check rejects bots before we hit Cloudflare.
  if (typeof parsedBody[HONEYPOT_FIELD] === "string" && parsedBody[HONEYPOT_FIELD] !== "") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  // Phase 4 — both Art. 6 (ordinary processing) and Art. 9 (special-category,
  // explicit) consents are required at submission time. UI guards this with
  // per-checkbox inline errors; this is the server-side defense in depth.
  if (!parsedBody.art6Consent || !parsedBody.art9Consent) {
    return NextResponse.json(
      { error: "Both required consents (Art. 6 and Art. 9) must be acknowledged." },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);

  const turnstileOk = await verifyTurnstileToken(parsedBody.turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const [reading, bookingForm] = await Promise.all([
    fetchReading(parsedBody.readingSlug),
    fetchBookingForm(),
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
    return NextResponse.json({ error: "Validation failed", fieldErrors }, { status: 400 });
  }

  const validatedValues = validation.data as Record<string, unknown>;
  const email = typeof validatedValues.email === "string" ? validatedValues.email : "";
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  // Phase 5 Session 4b — GAP-7. RFC 5321 254-char email cap parity with
  // /api/booking/gift; defends against pathologically long emails being
  // persisted to D1 and ferried to Stripe Payment Link URLs.
  if (email.length > MAX_EMAIL_CHARS) {
    return NextResponse.json(
      {
        error: "Validation failed",
        fieldErrors: {
          email: `Email must be ${MAX_EMAIL_CHARS} characters or fewer.`,
        },
      },
      { status: 400 },
    );
  }

  const photoR2Key =
    typeof validatedValues.photo === "string" && validatedValues.photo.length > 0
      ? validatedValues.photo
      : undefined;

  const responses = buildResponses(fields, validatedValues);
  const acknowledgedAt = new Date().toISOString();
  const submissionId = crypto.randomUUID();

  try {
    await createSubmission({
      id: submissionId,
      email,
      status: "pending",
      readingSlug: parsedBody.readingSlug,
      readingName: reading.name,
      readingPriceDisplay: reading.priceDisplay,
      responses,
      consentLabel: parsedBody.consentLabelSnapshot ?? null,
      photoR2Key: photoR2Key ?? null,
      createdAt: acknowledgedAt,
      consentAcknowledgedAt: acknowledgedAt,
      ipAddress: ip ?? null,
      art6AcknowledgedAt: acknowledgedAt,
      art9AcknowledgedAt: acknowledgedAt,
    });
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
