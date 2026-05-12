import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getOrCreateUser } from "@/lib/auth/users";
import {
  HONEYPOT_FIELD,
  MAX_ACTIVE_GIFTS_PER_RECIPIENT,
} from "@/lib/booking/constants";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import {
  clearGiftClaimCookie,
  GIFT_CLAIM_COOKIE,
  verifyGiftClaimCookie,
} from "@/lib/booking/giftClaimSession";
import { countActivePendingGiftsForRecipient } from "@/lib/booking/persistence/repository";
import { flattenActiveFields } from "@/lib/booking/sectionFilters";
import { findSubmissionById, redeemGiftSubmission } from "@/lib/booking/submissions";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import { getClientIp } from "@/lib/request";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import type { SanityFormField, SanityFormFieldType } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

type GiftRedeemBody = {
  readingSlug: string;
  values: Record<string, unknown>;
  turnstileToken: string;
  consentLabelSnapshot?: string;
  art6Consent: boolean;
  art9Consent: boolean;
  submissionId?: string;
  [HONEYPOT_FIELD]?: string;
};

function isRedeemBody(body: unknown): body is GiftRedeemBody {
  if (typeof body !== "object" || body === null) return false;
  const c = body as Record<string, unknown>;
  return (
    typeof c.readingSlug === "string" &&
    typeof c.turnstileToken === "string" &&
    typeof c.values === "object" &&
    c.values !== null &&
    typeof c.art6Consent === "boolean" &&
    typeof c.art9Consent === "boolean"
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

export async function POST(request: Request): Promise<Response> {
  assertEnvironmentBindings();

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isRedeemBody(parsedBody)) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (typeof parsedBody[HONEYPOT_FIELD] === "string" && parsedBody[HONEYPOT_FIELD] !== "") {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (!parsedBody.art6Consent || !parsedBody.art9Consent) {
    return NextResponse.json(
      { error: "Both required consents (Art. 6 and Art. 9) must be acknowledged." },
      { status: 400 },
    );
  }

  const jar = await cookies();
  const cookieValue = jar.get(GIFT_CLAIM_COOKIE)?.value ?? null;
  const cookieSubmissionId = await verifyGiftClaimCookie(cookieValue);
  if (!cookieSubmissionId) {
    return NextResponse.json({ error: "Claim session expired" }, { status: 401 });
  }
  // Defense-in-depth: server always trusts the cookie's submissionId over body.
  if (parsedBody.submissionId && parsedBody.submissionId !== cookieSubmissionId) {
    return NextResponse.json({ error: "Submission mismatch" }, { status: 403 });
  }
  const submissionId = cookieSubmissionId;

  const ip = getClientIp(request);

  // Run the three external lookups concurrently — none depend on each other.
  // Cookie verify already gated us; Turnstile + DB + Sanity can race.
  const [turnstileOk, submission, reading, bookingForm] = await Promise.all([
    verifyTurnstileToken(parsedBody.turnstileToken, ip ?? undefined),
    findSubmissionById(submissionId),
    fetchReading(parsedBody.readingSlug),
    fetchBookingForm(),
  ]);

  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }
  if (!submission || !submission.isGift) {
    return NextResponse.json({ error: "Gift not found" }, { status: 404 });
  }
  if (submission.giftClaimedAt) {
    return NextResponse.json({ error: "Gift already claimed" }, { status: 409 });
  }
  if (submission.giftCancelledAt) {
    return NextResponse.json({ error: "Gift was cancelled" }, { status: 410 });
  }
  if (!submission.recipientEmail) {
    return NextResponse.json({ error: "Recipient email missing" }, { status: 422 });
  }
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
  const submittedEmail =
    typeof validatedValues.email === "string"
      ? validatedValues.email.trim().toLowerCase()
      : "";
  if (!submittedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Defense-in-depth: a stolen claim cookie still can't be used by a
  // different person — the submitted email must match recipient_email.
  if (submittedEmail !== submission.recipientEmail.toLowerCase()) {
    return NextResponse.json(
      {
        error: "Email mismatch",
        fieldErrors: {
          email:
            "Please use the same email that received the gift link so we can match your reading.",
        },
      },
      { status: 422 },
    );
  }

  // Session 4b LB-3: re-check the anti-abuse cap at claim time. self_send mode
  // may purchase with NULL recipient_email, bypassing the purchase-time cap. A
  // purchaser forwarding many self_send URLs to the same recipient is caught
  // here. Exclude this submission so the gift doesn't count against itself.
  const activeCount = await countActivePendingGiftsForRecipient(submittedEmail, {
    excludeSubmissionId: submissionId,
  });
  if (activeCount >= MAX_ACTIVE_GIFTS_PER_RECIPIENT) {
    return NextResponse.json(
      {
        error: "Too many pending gifts",
        fieldErrors: {
          email:
            "This recipient already has gifts waiting. Ask them to claim one before sending another.",
        },
      },
      { status: 422 },
    );
  }

  const responses = buildResponses(fields, validatedValues);
  const claimedAtIso = new Date().toISOString();

  const { userId: recipientUserId } = await getOrCreateUser({ email: submittedEmail });

  try {
    await redeemGiftSubmission({
      submissionId,
      responses,
      recipientUserId,
      claimedAtIso,
      art9AcknowledgedAt: claimedAtIso,
    });
  } catch (error) {
    console.error("[gift-redeem] Failed to redeem gift submission", error);
    return NextResponse.json({ error: "Failed to save your details" }, { status: 500 });
  }

  await clearGiftClaimCookie();

  return NextResponse.json({
    submissionId,
    redirectUrl: `/thank-you/${submissionId}?gift=1`,
  });
}
