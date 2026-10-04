import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dbExec } from "@/lib/booking/persistence/sqlClient";
import type { ThankYouSessionSnapshot } from "@/lib/booking/thankYouSession";
import {
  createTestGift,
  forceGiftStatus,
  GIFT_SESSION_ID,
  giftCheckoutSession,
} from "@/test/fixtures/gift";

vi.mock("@/lib/resend", () => ({
  sendGiftPurchase: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchEmailGiftSettings: vi.fn(),
  fetchReadingPublished: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  serverTrack: vi.fn(),
}));

vi.mock("@/lib/stripe", () => ({
  retrieveCheckoutSession: vi.fn(),
}));

import { sendGiftPurchase } from "@/lib/resend";
import { fetchEmailGiftSettings, fetchReadingPublished } from "@/lib/sanity/fetch";
import { retrieveCheckoutSession } from "@/lib/stripe";

import { deriveGiftCode, deriveGiftSendToken } from "./giftCode";
import { formatGiftCode } from "./giftCodeFormat";
import { findGiftById } from "./gifts";
import { resolveGiftThankYou } from "./giftThankYou";
import type { GiftStatus } from "./types";

const ORIGIN = "https://staging.withjosephine.com";
const SESSION_ID = GIFT_SESSION_ID;

function resolveFromStripe(session: Stripe.Checkout.Session) {
  const snapshot: ThankYouSessionSnapshot = {
    kind: "ok",
    paidAmount: { cents: 8900, display: "$89.00" },
    session,
  };
  return resolveGiftThankYou(SESSION_ID, snapshot);
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", ORIGIN);
  vi.mocked(sendGiftPurchase).mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_1" });
  vi.mocked(fetchEmailGiftSettings).mockReset().mockResolvedValue(null);
  vi.mocked(fetchReadingPublished).mockReset().mockResolvedValue(null);
  vi.mocked(retrieveCheckoutSession).mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("resolveGiftThankYou", () => {
  it("returns null for a reading reference", async () => {
    const readingSession = { ...giftCheckoutSession("unused"), client_reference_id: "sub_123" };
    expect(await resolveFromStripe(readingSession)).toBeNull();
  });

  it("activates a paid gift and returns it with the send token", async () => {
    const giftId = await createTestGift();
    const code = await deriveGiftCode(giftId);

    const result = await resolveFromStripe(giftCheckoutSession(giftId));

    expect(result).toEqual({
      kind: "active",
      giftId,
      readingSlug: "birth-chart",
      buyerFirstName: "Marguerite",
      note: "For the long winter ahead",
      displayCode: formatGiftCode(code),
      giftUrl: `${ORIGIN}/gift/${code}`,
      sendToken: await deriveGiftSendToken(giftId),
    });
    expect(result && "displayCode" in result && result.displayCode).toMatch(
      /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/,
    );
    expect((await findGiftById(giftId))?.status).toBe("active");
    expect(sendGiftPurchase).toHaveBeenCalledTimes(1);
  });

  it("uses the session creation time as the activation time", async () => {
    const giftId = await createTestGift();
    await resolveFromStripe(giftCheckoutSession(giftId));
    expect((await findGiftById(giftId))?.activatedAt).toBe("2026-10-01T10:05:00.000Z");
  });

  it("returns a redeemed gift without a send token or a note", async () => {
    const giftId = await createTestGift();
    await resolveFromStripe(giftCheckoutSession(giftId));
    await dbExec(`UPDATE gift_codes SET status = 'redeemed', note = NULL WHERE id = ?`, [giftId]);

    const result = await resolveFromStripe(giftCheckoutSession(giftId));

    expect(result).toMatchObject({ kind: "redeemed", giftId });
    expect(result).not.toHaveProperty("sendToken");
    expect(result).not.toHaveProperty("note");
  });

  it.each<[string, Stripe.Checkout.Session["payment_status"], GiftStatus | null]>([
    ["an unpaid pending gift", "unpaid", null],
    ["an unpaid expired gift", "unpaid", "expired"],
  ])("returns not_paid without a code for %s", async (_label, paymentStatus, status) => {
    const giftId = await createTestGift();
    if (status) await forceGiftStatus(giftId, status);

    const result = await resolveFromStripe(giftCheckoutSession(giftId, paymentStatus));

    expect(result).toEqual({
      kind: "not_paid",
      readingSlug: "birth-chart",
      buyerFirstName: "Marguerite",
    });
    expect(sendGiftPurchase).not.toHaveBeenCalled();
  });

  it("finds an active gift by session id in D1 when Stripe is unavailable", async () => {
    const giftId = await createTestGift();
    await resolveFromStripe(giftCheckoutSession(giftId));

    const result = await resolveGiftThankYou(SESSION_ID, { kind: "unavailable" });

    expect(result).toMatchObject({ kind: "active", giftId });
    expect(retrieveCheckoutSession).not.toHaveBeenCalled();
  });

  it("returns null when Stripe is unavailable and no gift holds the session", async () => {
    await createTestGift();
    expect(await resolveGiftThankYou(SESSION_ID, { kind: "unavailable" })).toBeNull();
  });

  it("throws for a cancelled gift", async () => {
    const giftId = await createTestGift();
    await forceGiftStatus(giftId, "cancelled");
    await expect(resolveFromStripe(giftCheckoutSession(giftId))).rejects.toThrow("cancelled");
  });

  it("throws when the gift row is missing", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(resolveFromStripe(giftCheckoutSession(crypto.randomUUID()))).rejects.toThrow(
      "not found",
    );
  });

  it("throws when the derived code does not match the stored hash", async () => {
    const giftId = await createTestGift();
    await resolveFromStripe(giftCheckoutSession(giftId));
    await dbExec(`UPDATE gift_codes SET lookup_hash = ? WHERE id = ?`, ["f".repeat(64), giftId]);

    await expect(resolveGiftThankYou(SESSION_ID, { kind: "unavailable" })).rejects.toThrow(
      "no verifiable code",
    );
  });

  it("keeps the session id out of thrown errors", async () => {
    const giftId = await createTestGift();
    await forceGiftStatus(giftId, "cancelled");
    const error = await resolveFromStripe(giftCheckoutSession(giftId)).catch(
      (caught: Error) => caught,
    );
    expect((error as Error).message).not.toContain(SESSION_ID);
  });
});
