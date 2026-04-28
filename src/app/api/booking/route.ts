import { NextResponse } from "next/server";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { flattenActiveFields } from "@/lib/booking/sectionFilters";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import { getClientIp } from "@/lib/request";
import { getSanityWriteClient } from "@/lib/sanity/client";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import type { SanityFormField, SanityFormFieldType, SanityReading } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

type BookingRequestBody = {
  readingSlug: string;
  values: Record<string, unknown>;
  turnstileToken: string;
  consentLabelSnapshot?: string;
  [HONEYPOT_FIELD]?: string;
};

function isBookingBody(body: unknown): body is BookingRequestBody {
  if (typeof body !== "object" || body === null) return false;
  const candidate = body as Record<string, unknown>;
  return (
    typeof candidate.readingSlug === "string" &&
    typeof candidate.turnstileToken === "string" &&
    typeof candidate.values === "object" &&
    candidate.values !== null
  );
}

function stringifyValue(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "boolean") return value ? "true" : "false";
  if (value == null) return "";
  return String(value);
}

function buildResponses(
  fields: SanityFormField[],
  values: Record<string, unknown>,
): Array<{
  _key: string;
  _type: "submissionResponse";
  fieldKey: string;
  fieldLabelSnapshot: string;
  fieldType: SanityFormFieldType;
  value: string;
}> {
  return fields.map((field) => ({
    _key: field._id,
    _type: "submissionResponse" as const,
    fieldKey: field.key,
    fieldLabelSnapshot: field.label,
    fieldType: field.type,
    value: stringifyValue(values[field.key]),
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

  const photoR2Key =
    typeof validatedValues.photo === "string" && validatedValues.photo.length > 0
      ? validatedValues.photo
      : undefined;

  const responses = buildResponses(fields, validatedValues);
  const acknowledgedAt = new Date().toISOString();
  const submissionId = crypto.randomUUID();

  const submissionDraft = {
    _id: submissionId,
    _type: "submission",
    status: "pending",
    serviceRef: { _type: "reference", _ref: reading._id },
    email,
    responses,
    consentSnapshot: {
      labelText: parsedBody.consentLabelSnapshot ?? "",
      acknowledgedAt,
      ipAddress: ip ?? undefined,
    },
    photoR2Key,
    clientReferenceId: submissionId,
    createdAt: acknowledgedAt,
  };

  let createdId: string;
  try {
    const writeClient = getSanityWriteClient();
    const created = await writeClient.create(submissionDraft, { visibility: "sync" });
    createdId = created._id;
  } catch (error) {
    console.error("[booking] Failed to create submission", error);
    return NextResponse.json({ error: "Failed to save submission" }, { status: 500 });
  }

  const paymentUrl = buildPaymentUrl(reading, createdId, email);
  if (!paymentUrl) {
    return NextResponse.json(
      { error: "Payment is not currently available for this reading." },
      { status: 503 },
    );
  }

  return NextResponse.json({ paymentUrl, submissionId: createdId });
}
