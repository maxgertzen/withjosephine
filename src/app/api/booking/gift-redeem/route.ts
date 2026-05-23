import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getOrCreateUser } from "@/lib/auth/users";
import {
  GIFT_DELIVERY,
  HONEYPOT_FIELD,
  MAX_ACTIVE_GIFTS_PER_RECIPIENT,
} from "@/lib/booking/constants";
import { normalizeEmailForm } from "@/lib/booking/emailNormalize";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import {
  clearGiftClaimCookie,
  GIFT_CLAIM_COOKIE,
  verifyGiftClaimCookie,
} from "@/lib/booking/giftClaimSession";
import {
  purchaserFirstNameFor,
  recipientFirstNameFromIntakeResponses,
} from "@/lib/booking/giftPersonas";
import { countActivePendingGiftsForRecipient } from "@/lib/booking/persistence/repository";
import { runMirror } from "@/lib/booking/persistence/runMirror";
import { flattenActiveFields } from "@/lib/booking/sectionFilters";
import {
  appendEmailFired,
  findSubmissionById,
  redeemGiftSubmission,
} from "@/lib/booking/submissions";
import { buildSubmissionSchema } from "@/lib/booking/submissionSchema";
import {
  consentSnapshotFromBody,
  isFullyConsented,
} from "@/lib/compliance/intakeConsent";
import { sha256Hex } from "@/lib/hmac";
import { getClientIp } from "@/lib/request";
import { redactEmail, sendRecipientIntakeReceived } from "@/lib/resend";
import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import type { SanityFormField, SanityFormFieldType } from "@/lib/sanity/types";
import { verifyTurnstileToken } from "@/lib/turnstile";

type GiftRedeemBody = {
  readingSlug: string;
  values: Record<string, unknown>;
  turnstileToken: string;
  art6Consent: boolean;
  art9Consent: boolean;
  coolingOffConsent: boolean;
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
    typeof c.art9Consent === "boolean" &&
    typeof c.coolingOffConsent === "boolean"
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
  return fields
    .filter((field) => field.type !== "checkbox")
    .map((field) => ({
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

  if (
    !isFullyConsented(
      consentSnapshotFromBody(parsedBody, { readingSlug: parsedBody.readingSlug }),
      {
        requireArt9: true,
        // Recipient did not pay — purchaser already waived cooling-off at
        // purchase time. The recipient consent surface omits the checkbox.
        requireCoolingOff: false,
      },
    )
  ) {
    return NextResponse.json(
      {
        error: "Art. 6 and Art. 9 acknowledgments are required to redeem.",
      },
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
    console.error("[gift-redeem] turnstile_rejected", {
      submissionId,
      cfRay: request.headers.get("cf-ray"),
      ip,
    });
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
  const isSelfSend = submission.giftDeliveryMethod === GIFT_DELIVERY.selfSend;
  if (!submission.recipientEmail && !isSelfSend) {
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
      ? normalizeEmailForm(validatedValues.email)
      : "";
  if (!submittedEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const submittedEmailRedacted = redactEmail(submittedEmail);
  const submittedEmailHash = (await sha256Hex(submittedEmail)).slice(0, 12);
  const logBase = {
    submissionId,
    deliveryMethod: submission.giftDeliveryMethod,
    submittedEmailRedacted,
    submittedEmailHash,
  };

  // Scheduled gifts: `recipient_email` is set at purchase, so a stolen claim
  // cookie still can't be used by a different person — submitted email must
  // match. Self_send gifts have no recipient_email at purchase (the
  // purchaser hands off the link manually), so the recipient supplies it
  // here; the claim cookie already gated this request on submissionId.
  // Normalising both sides via `normalizeEmailForm` keeps the strict mismatch
  // gate honest across copy-pasted Unicode variants (the Rook hard-stop must
  // not be defeated by combining-mark or pre/decomposed-form differences).
  const storedRecipientEmail = submission.recipientEmail
    ? normalizeEmailForm(submission.recipientEmail)
    : null;
  const mismatch = !!storedRecipientEmail && submittedEmail !== storedRecipientEmail;
  console.log("[gift-redeem.gate]", {
    ...logBase,
    storedRecipientEmailRedacted: storedRecipientEmail ? redactEmail(storedRecipientEmail) : null,
    storedRecipientEmailHash: storedRecipientEmail
      ? (await sha256Hex(storedRecipientEmail)).slice(0, 12)
      : null,
    hasStoredRecipient: !!storedRecipientEmail,
    mismatch,
  });
  if (mismatch) {
    console.error("[gift-redeem] email_mismatch", { submissionId });
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

  // Re-check the anti-abuse cap at claim time. self_send mode
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

  const { userId: recipientUserId, isNew: recipientUserIsNew } = await getOrCreateUser({
    email: submittedEmail,
  });
  console.log("[gift-redeem.claim]", {
    ...logBase,
    recipientUserId,
    purchaserUserId: submission.purchaserUserId,
    recipientUserIsNew,
    equalsPurchaser: recipientUserId === submission.purchaserUserId,
  });

  try {
    await redeemGiftSubmission({
      submissionId,
      readingSlug: parsedBody.readingSlug,
      responses,
      recipientUserId,
      claimedAtIso,
      art9AcknowledgedAt: claimedAtIso,
      // self_send purchases have NULL recipient_email; persist the recipient's
      // email at claim time so downstream surfaces (Sanity, listen-page magic
      // links) have an audience identifier. Repo writes setIfMissing so a
      // retry on an already-populated row can't clobber the original value.
      recipientEmailFromIntake: isSelfSend ? submittedEmail : undefined,
    });
  } catch (error) {
    console.error("[gift-redeem] Failed to redeem gift submission", error);
    return NextResponse.json({ error: "Failed to save your details" }, { status: 500 });
  }

  runMirror(
    (async () => {
      const result = await sendRecipientIntakeReceived({
        submissionId,
        recipientEmail: submittedEmail,
        recipientName: recipientFirstNameFromIntakeResponses(responses, submittedEmail),
        purchaserFirstName: purchaserFirstNameFor(submission),
        readingName: submission.reading?.name ?? reading.name,
      });
      if (result.kind === "sent") {
        await appendEmailFired(submissionId, {
          type: "recipient_intake_received",
          sentAt: new Date().toISOString(),
          resendId: result.resendId,
        });
      }
    })(),
  );

  await clearGiftClaimCookie();

  return NextResponse.json({
    submissionId,
    redirectUrl: `/thank-you/${submissionId}?gift=1&redeemed=1`,
  });
}
