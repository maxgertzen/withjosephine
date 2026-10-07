import { NextResponse } from "next/server";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { assertEnvironmentBindings } from "@/lib/booking/envAssertions";
import { buildPaymentUrl, isStripePaymentLink } from "@/lib/booking/paymentUrl";
import { COOLING_OFF_CONSENT_LABEL } from "@/lib/compliance/intakeConsent";
import { optionalEnv } from "@/lib/env";
import { giftClientReferenceId } from "@/lib/gift/clientReference";
import { parseGiftPurchaseBody, validateGiftSheet } from "@/lib/gift/giftInput";
import { createPendingGift } from "@/lib/gift/gifts";
import { getClientIp } from "@/lib/request";
import { fetchReadingFresh } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

export async function POST(request: Request) {
  assertEnvironmentBindings();

  if (!optionalEnv("GIFT_CODE_SECRET")) {
    return NextResponse.json({ error: "Gifts are not available right now." }, { status: 503 });
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = parseGiftPurchaseBody(parsedBody);
  if (!body) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body[HONEYPOT_FIELD]) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  if (body.coolingOffConsent !== true) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: { coolingOff: "required" } },
      { status: 400 },
    );
  }

  const sheet = validateGiftSheet(body);
  if ("fieldErrors" in sheet) {
    return NextResponse.json(
      { error: "Validation failed", fieldErrors: sheet.fieldErrors },
      { status: 400 },
    );
  }

  const ip = getClientIp(request);

  const turnstileOk = await verifyTurnstileToken(body.turnstileToken, ip ?? undefined);
  if (!turnstileOk) {
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  const reading = await fetchReadingFresh(body.readingSlug);
  if (!reading) {
    return NextResponse.json({ error: "Reading not found" }, { status: 404 });
  }

  if (!isStripePaymentLink(reading.stripePaymentLink)) {
    return NextResponse.json(
      { error: "Payment is not currently available for this reading." },
      { status: 503 },
    );
  }

  const acknowledgedAt = new Date().toISOString();

  let giftId: string;
  try {
    ({ giftId } = await createPendingGift({
      readingSlug: reading.slug,
      buyerFirstName: sheet.values.buyerFirstName,
      note: sheet.values.note,
      consentLabel: COOLING_OFF_CONSENT_LABEL,
      consentIpAddress: ip,
      coolingOffAcknowledgedAt: acknowledgedAt,
      createdAt: acknowledgedAt,
    }));
  } catch (error) {
    console.error("[gift-purchase] Failed to create gift", error);
    return NextResponse.json({ error: "Failed to save gift" }, { status: 500 });
  }

  const paymentUrl = buildPaymentUrl(reading, giftClientReferenceId(giftId));
  return NextResponse.json({ paymentUrl, giftId });
}
