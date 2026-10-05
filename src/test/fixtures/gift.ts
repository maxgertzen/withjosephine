import type Stripe from "stripe";

import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";
import { deriveGiftSendToken } from "@/lib/gift/giftCode";
import { createPendingGift, type CreatePendingGiftInput } from "@/lib/gift/gifts";
import type {
  GiftSubmissionProjection,
  GiftSubmissionSnapshot,
} from "@/lib/gift/giftSubmissionMirror";
import type { GiftRecord, GiftStatus } from "@/lib/gift/types";

const BASE_GIFT: GiftRecord = {
  id: "00000000-0000-4000-8000-000000000001",
  lookupHash: "0".repeat(64),
  readingSlug: "birth-chart",
  status: "pending",
  buyerFirstName: "Ada",
  buyerEmail: null,
  note: null,
  coolingOffAcknowledgedAt: "2026-10-01T10:00:00.000Z",
  consentLabel: "I agree",
  consentIpAddress: null,
  stripeSessionId: null,
  createdAt: "2026-10-01T10:00:00.000Z",
  activatedAt: null,
  buyerEmailClaimedAt: null,
  recipientName: null,
  recipientEmail: null,
  sendCount: 0,
  lastSentAt: null,
  redeemedSubmissionId: null,
  redeemedAt: null,
  expiredAt: null,
  updatedAt: "2026-10-01T10:00:00.000Z",
  emailsFired: [],
  emailFailures: [],
};

export function makeGiftRecord(overrides: Partial<GiftRecord> = {}): GiftRecord {
  return { ...BASE_GIFT, ...overrides };
}

export function storedGiftSubmissionDoc(
  projection: GiftSubmissionProjection,
  overrides: Partial<GiftSubmissionSnapshot> = {},
): GiftSubmissionSnapshot {
  return {
    _id: projection.docId,
    ...projection.unopened,
    gift: { ...projection.gift },
    ...overrides,
  };
}

export const TEST_GIFT_CREATED_AT = "2026-10-01T10:00:00.000Z";

export const TEST_GIFT_INPUT: CreatePendingGiftInput = {
  readingSlug: "birth-chart",
  buyerFirstName: "Marguerite",
  note: "For the long winter ahead",
  consentLabel: "cooling-off",
  consentIpAddress: "203.0.113.7",
  coolingOffAcknowledgedAt: TEST_GIFT_CREATED_AT,
  createdAt: TEST_GIFT_CREATED_AT,
};

export async function createTestGift(
  overrides: Partial<CreatePendingGiftInput> = {},
): Promise<string> {
  const { giftId } = await createPendingGift({ ...TEST_GIFT_INPUT, ...overrides });
  return giftId;
}

export async function forceGiftStatus(giftId: string, status: GiftStatus): Promise<void> {
  await dbExec(`UPDATE gift_codes SET status = ? WHERE id = ?`, [status, giftId]);
}

export type GiftSendRow = {
  sendCount?: number;
  recipientName?: string | null;
  lastSentAt?: string | null;
  buyerEmail?: string | null;
};

export async function giftWithSendToken(
  status: GiftStatus,
  row: GiftSendRow = {},
  input: Partial<CreatePendingGiftInput> = {},
): Promise<{ giftId: string; token: string }> {
  const giftId = await createTestGift(input);
  if (status !== "pending") await forceGiftStatus(giftId, status);
  await dbExec(
    `UPDATE gift_codes
     SET send_count = ?, recipient_name = ?, last_sent_at = ?, buyer_email = ?
     WHERE id = ?`,
    [
      row.sendCount ?? 0,
      row.recipientName ?? null,
      row.lastSentAt ?? null,
      row.buyerEmail ?? null,
      giftId,
    ],
  );
  return { giftId, token: await deriveGiftSendToken(giftId) };
}

export type AuditRow = { event_type: string; success: number; submission_id: string | null };

export async function auditRows(): Promise<AuditRow[]> {
  return dbQuery(`SELECT event_type, success, submission_id FROM listen_audit ORDER BY timestamp`);
}

export const GIFT_SESSION_ID = "cs_test_gift_session";
export const GIFT_SESSION_CREATED = Date.parse("2026-10-01T10:05:00.000Z") / 1000;

export function giftCheckoutSession(
  giftId: string,
  paymentStatus: Stripe.Checkout.Session["payment_status"] = "paid",
): Stripe.Checkout.Session {
  return {
    id: GIFT_SESSION_ID,
    object: "checkout.session",
    created: GIFT_SESSION_CREATED,
    status: "complete",
    client_reference_id: `gift_${giftId}`,
    payment_status: paymentStatus,
    amount_total: 8900,
    currency: "usd",
    customer_details: { email: "buyer@example.com", address: { country: "GB" } },
  } as Stripe.Checkout.Session;
}

export const SECOND_GIFT_SESSION_ID = "cs_test_second_session";

export function secondGiftCheckoutSession(giftId: string): Stripe.Checkout.Session {
  return { ...giftCheckoutSession(giftId), id: SECOND_GIFT_SESSION_ID };
}
