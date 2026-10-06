import type Stripe from "stripe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { dbExec, dbQuery } from "@/lib/booking/persistence/sqlClient";

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

vi.mock("@sentry/cloudflare", () => ({ captureMessage: vi.fn() }));

import * as Sentry from "@sentry/cloudflare";

import { serverTrack } from "@/lib/analytics/server";
import type { CreatePendingGiftInput } from "@/lib/gift/gifts";
import { sendGiftPurchase } from "@/lib/resend";
import { fetchEmailGiftSettings, fetchReadingPublished } from "@/lib/sanity/fetch";
import { captureConsole } from "@/test/captureConsole";
import { createTestGift, forceGiftStatus } from "@/test/fixtures/gift";

import {
  activateGift,
  giftActivationFromSession,
  type GiftActivationInput,
  whatsappShareUrl,
} from "./activateGift";
import { deriveGiftCode, deriveGiftSendToken } from "./giftCode";
import { formatGiftCode } from "./giftCodeFormat";
import { findGiftById } from "./gifts";

const mockSend = vi.mocked(sendGiftPurchase);
const mockGiftSettings = vi.mocked(fetchEmailGiftSettings);
const mockReading = vi.mocked(fetchReadingPublished);
const mockTrack = vi.mocked(serverTrack);

const ORIGIN = "https://staging.withjosephine.com";
const PAID_AT = "2026-10-01T10:05:00.000Z";
const SESSION_ID = "cs_test_gift_session_1";
const OTHER_SESSION_ID = "cs_test_gift_session_2";
const BUYER_EMAIL = "Marguerite.Buyer@Example.com";

let createdGiftIds: string[] = [];
let capturedConsole: ReturnType<typeof captureConsole>;

async function createGift(overrides: Partial<CreatePendingGiftInput> = {}): Promise<string> {
  const giftId = await createTestGift(overrides);
  createdGiftIds.push(giftId);
  return giftId;
}

function paidInput(
  giftId: string,
  overrides: Partial<GiftActivationInput> = {},
): GiftActivationInput {
  return {
    giftId,
    stripeSessionId: SESSION_ID,
    paymentStatus: "paid",
    paidAt: PAID_AT,
    buyerEmail: BUYER_EMAIL,
    amountPaidCents: 8900,
    amountPaidCurrency: "usd",
    country: "GB",
    ...overrides,
  };
}

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  vi.stubEnv("NEXT_PUBLIC_SITE_ORIGIN", ORIGIN);
  createdGiftIds = [];
  mockSend.mockReset().mockResolvedValue({ kind: "sent", resendId: "msg_gift_1" });
  mockGiftSettings.mockReset().mockResolvedValue(null);
  mockReading.mockReset().mockResolvedValue({ name: "Birth Chart Reading" } as never);
  mockTrack.mockReset().mockResolvedValue(undefined);
  vi.mocked(Sentry.captureMessage).mockReset();
  capturedConsole = captureConsole();
});

afterEach(async () => {
  const logs = capturedConsole.text();
  expect(logs).not.toMatch(/cs_/);
  expect(logs).not.toMatch(/@/);
  for (const giftId of createdGiftIds) {
    const code = await deriveGiftCode(giftId);
    expect(logs).not.toContain(code);
    expect(logs).not.toContain(formatGiftCode(code));
  }
  vi.restoreAllMocks();
});

describe("whatsappShareUrl", () => {
  const url = "https://withjosephine.com/gift/K7M2AAAABBBB";
  const sharedAs = (text: string) => `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  it("drops emoji, which WhatsApp's share page shows as �", () => {
    expect(whatsappShareUrl("For you ✨ 🎁 ❤️ ❤ 👍🏽 🇹🇭 👨‍👩‍👧 1️⃣", url)).toBe(sharedAs("For you"));
  });

  it("keeps ™, © and ®, which the share page shows as typed", () => {
    expect(whatsappShareUrl("Soul Blueprint™ © ®", url)).toBe(sharedAs("Soul Blueprint™ © ®"));
  });

  it("sends the bare link when the message is only emoji", () => {
    expect(whatsappShareUrl("🎁✨", url)).toBe(`https://wa.me/?text=${encodeURIComponent(url)}`);
  });

  it("keeps accents, curly quotes and non-Latin letters, which the share page shows as typed", () => {
    expect(whatsappShareUrl("Pour toi, de Zoé. Here’s สมชาย", url)).toBe(
      sharedAs("Pour toi, de Zoé. Here’s สมชาย"),
    );
  });
});

describe("giftActivationFromSession", () => {
  const session = {
    id: SESSION_ID,
    client_reference_id: "gift_abc",
    payment_status: "paid",
    amount_total: 8900,
    currency: "usd",
    customer_details: { email: BUYER_EMAIL, address: { country: "GB" } },
  } as Stripe.Checkout.Session;

  it("maps a gift session", () => {
    expect(giftActivationFromSession(session, PAID_AT)).toEqual({
      giftId: "abc",
      stripeSessionId: SESSION_ID,
      paymentStatus: "paid",
      paidAt: PAID_AT,
      buyerEmail: BUYER_EMAIL,
      amountPaidCents: 8900,
      amountPaidCurrency: "usd",
      country: "GB",
    });
  });

  it("maps missing Stripe fields to null", () => {
    const bare = { id: SESSION_ID, client_reference_id: "gift_abc", payment_status: "unpaid" };
    expect(giftActivationFromSession(bare as Stripe.Checkout.Session, PAID_AT)).toMatchObject({
      paymentStatus: "unpaid",
      buyerEmail: null,
      amountPaidCents: null,
      amountPaidCurrency: null,
      country: null,
    });
  });

  it.each([null, "sub_123", "gift_"])("returns null for reference %s", (reference) => {
    expect(
      giftActivationFromSession({ ...session, client_reference_id: reference }, PAID_AT),
    ).toBeNull();
  });
});

describe("activateGift", () => {
  it("leaves an unpaid gift pending and sends nothing", async () => {
    const giftId = await createGift();
    expect((await activateGift(paidInput(giftId, { paymentStatus: "unpaid" }))).result).toBe(
      "not_paid",
    );
    expect((await findGiftById(giftId))?.status).toBe("pending");
    expect(mockSend).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("returns not_found for an unknown gift", async () => {
    expect((await activateGift(paidInput(crypto.randomUUID()))).result).toBe("not_found");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("returns no_buyer_email and keeps the gift pending when the session has no email", async () => {
    const giftId = await createGift();
    expect((await activateGift(paidInput(giftId, { buyerEmail: null }))).result).toBe(
      "no_buyer_email",
    );
    expect((await findGiftById(giftId))?.status).toBe("pending");
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("activates a paid gift, writes the financial row and stores the email lower-cased", async () => {
    const giftId = await createGift();
    const outcome = await activateGift(paidInput(giftId));
    expect(outcome.result).toBe("done");
    expect(outcome.gift?.status).toBe("active");

    const gift = await findGiftById(giftId);
    expect(gift).toMatchObject({
      status: "active",
      buyerEmail: BUYER_EMAIL.toLowerCase(),
      stripeSessionId: SESSION_ID,
      activatedAt: PAID_AT,
    });

    const financial = await dbQuery(`SELECT * FROM financial_records WHERE submission_id = ?`, [
      `gift_${giftId}`,
    ]);
    expect(financial).toEqual([
      expect.objectContaining({
        user_id: null,
        email: BUYER_EMAIL.toLowerCase(),
        paid_at: PAID_AT,
        amount_paid_cents: 8900,
        amount_paid_currency: "usd",
        country: "GB",
        stripe_session_id: SESSION_ID,
      }),
    ]);
  });

  it("skips the financial row when the session has no amount", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId, { amountPaidCents: null, amountPaidCurrency: null }));
    expect((await findGiftById(giftId))?.status).toBe("active");
    expect(await dbQuery(`SELECT * FROM financial_records`)).toEqual([]);
  });

  it("sends the buyer confirmation with the code, the links and the idempotency key", async () => {
    mockGiftSettings.mockResolvedValue({ shareMessageTemplate: "From {buyerName}, with love" });
    const giftId = await createGift();
    await activateGift(paidInput(giftId));

    const code = await deriveGiftCode(giftId);
    const giftUrl = `${ORIGIN}/gift/${code}`;
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith(
      {
        to: BUYER_EMAIL.toLowerCase(),
        firstName: "Marguerite",
        readingName: "Birth Chart Reading",
        hasNote: true,
        displayCode: formatGiftCode(code),
        giftUrl,
        whatsappUrl: `https://wa.me/?text=${encodeURIComponent(`From Marguerite, with love ${giftUrl}`)}`,
        sendUrl: `${ORIGIN}/gift/send#${await deriveGiftSendToken(giftId)}`,
      },
      { giftId, idempotencyKey: `gift-confirmation/${giftId}` },
    );
    expect(formatGiftCode(code)).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
  });

  it("uses the default share message and reports no note when the gift has none", async () => {
    const giftId = await createGift({ note: null });
    await activateGift(paidInput(giftId));

    const vars = mockSend.mock.calls[0][0];
    expect(vars.hasNote).toBe(false);
    expect(decodeURIComponent(vars.whatsappUrl)).toContain("A reading for you, from Marguerite https://");
  });

  it("falls back to the built-in reading name when Sanity has none", async () => {
    mockReading.mockResolvedValue(null);
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    expect(mockSend.mock.calls[0][0].readingName).toBe("Birth Chart");
  });

  it("appends gift_confirmation after a sent email", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    expect((await findGiftById(giftId))?.emailsFired).toEqual([
      { type: "gift_confirmation", sentAt: expect.any(String), resendId: "msg_gift_1" },
    ]);
  });

  it("sends one email when called twice in a row", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    await activateGift(paidInput(giftId));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect((await findGiftById(giftId))?.emailsFired).toHaveLength(1);
  });

  it("sends one email when two calls run in parallel", async () => {
    const giftId = await createGift();
    await Promise.all([activateGift(paidInput(giftId)), activateGift(paidInput(giftId))]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("tracks payment_success once, keyed by the gift reference", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    await activateGift(paidInput(giftId));
    expect(mockTrack).toHaveBeenCalledTimes(1);
    expect(mockTrack).toHaveBeenCalledWith("payment_success", {
      distinct_id: `gift_${giftId}`,
      gift_id: giftId,
      submission_id: null,
      reading_id: "birth-chart",
      amount_paid_cents: 8900,
      currency: "usd",
      stripe_session_id: null,
    });
  });

  it("tracks payment_success only once the buyer email goes out", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited" });
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    expect(mockTrack).not.toHaveBeenCalled();
    await activateGift(paidInput(giftId));
    expect(mockTrack).toHaveBeenCalledTimes(1);
  });

  it("sends with defaults when Sanity fails", async () => {
    mockGiftSettings.mockRejectedValue(new Error("sanity down"));
    mockReading.mockRejectedValue(new Error("sanity down"));
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].readingName).toBe("Birth Chart");
  });

  it("activates an expired gift", async () => {
    const giftId = await createGift();
    await forceGiftStatus(giftId, "expired");
    await activateGift(paidInput(giftId));
    expect((await findGiftById(giftId))?.status).toBe("active");
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("leaves a gift cancelled before payment cancelled, sends nothing and warns Sentry", async () => {
    const giftId = await createGift();
    await forceGiftStatus(giftId, "cancelled");
    const outcome = await activateGift(paidInput(giftId));
    await activateGift(paidInput(giftId));
    expect(outcome).toMatchObject({
      result: "cancelled_before_payment",
      gift: { status: "cancelled" },
    });
    expect((await findGiftById(giftId))?.status).toBe("cancelled");
    expect(mockSend).not.toHaveBeenCalled();
    expect(Sentry.captureMessage).toHaveBeenCalledExactlyOnceWith(
      "Paid Checkout session for a gift cancelled before payment",
      { level: "warning", extra: { giftId, stripeSessionId: SESSION_ID } },
    );
  });

  it("flags a duplicate and sends no second email when another session pays for an active gift", async () => {
    const giftId = await createGift();
    const first = await activateGift(paidInput(giftId));
    const second = await activateGift(paidInput(giftId, { stripeSessionId: OTHER_SESSION_ID }));

    expect(first.result).toBe("done");
    expect(second.result).toBe("duplicate");
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect((await findGiftById(giftId))?.stripeSessionId).toBe(SESSION_ID);
  });

  it("flags exactly one duplicate when two different sessions pay for a pending gift at the same time", async () => {
    const giftId = await createGift();
    const outcomes = await Promise.all([
      activateGift(paidInput(giftId)),
      activateGift(paidInput(giftId, { stripeSessionId: OTHER_SESSION_ID })),
    ]);
    expect(outcomes.map((outcome) => outcome.result).sort()).toEqual(["done", "duplicate"]);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("does not flag a duplicate when the same session is delivered again", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    expect((await activateGift(paidInput(giftId))).result).toBe("done");
  });

  it.each(["redeemed", "cancelled"] as const)(
    "flags a duplicate when another session pays for a %s gift",
    async (status) => {
      const giftId = await createGift();
      await activateGift(paidInput(giftId));
      await forceGiftStatus(giftId, status);

      const outcome = await activateGift(paidInput(giftId, { stripeSessionId: OTHER_SESSION_ID }));

      expect(outcome.result).toBe("duplicate");
      expect((await findGiftById(giftId))?.status).toBe(status);
    },
  );

  it("flags a duplicate before checking the buyer email", async () => {
    const giftId = await createGift();
    await activateGift(paidInput(giftId));

    const outcome = await activateGift(
      paidInput(giftId, { stripeSessionId: OTHER_SESSION_ID, buyerEmail: null }),
    );

    expect(outcome.result).toBe("duplicate");
  });

  it("sends no buyer email and tracks nothing for a duplicate session, even after a failed first send", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited" });
    const giftId = await createGift();
    await activateGift(paidInput(giftId));
    mockSend.mockClear();
    mockTrack.mockClear();

    await activateGift(paidInput(giftId, { stripeSessionId: OTHER_SESSION_ID }));

    expect(mockSend).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("releases the claim after a failed send so the next call sends", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited" });
    const giftId = await createGift();

    await activateGift(paidInput(giftId));
    expect(await findGiftById(giftId)).toMatchObject({
      status: "active",
      buyerEmailClaimedAt: null,
      emailsFired: [],
    });

    await activateGift(paidInput(giftId));
    expect(mockSend).toHaveBeenCalledTimes(2);
    expect((await findGiftById(giftId))?.emailsFired).toHaveLength(1);
  });

  it("releases the claim even when the failure cannot be recorded", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited" });
    const giftId = await createGift();
    await dbExec(
      `CREATE TRIGGER block_gift_failures BEFORE UPDATE OF email_failures_json ON gift_codes
       BEGIN SELECT RAISE(ABORT, 'failures down'); END`,
    );

    await activateGift(paidInput(giftId));

    const [row] = await dbQuery<{ buyer_email_claimed_at: string | null }>(
      `SELECT buyer_email_claimed_at FROM gift_codes WHERE id = ?`,
      [giftId],
    );
    expect(row?.buyer_email_claimed_at).toBeNull();
    await dbExec(`DROP TRIGGER block_gift_failures`);
    vi.restoreAllMocks();
    capturedConsole = captureConsole();
  });

  it("records a failed buyer confirmation on the gift for the buyer role", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited", statusCode: 429 });
    const giftId = await createGift();

    await activateGift(paidInput(giftId));

    expect((await findGiftById(giftId))?.emailFailures).toEqual([
      expect.objectContaining({
        emailType: "gift_confirmation",
        kind: "send_error",
        recipient: "buyer",
        errorCode: "rate limited",
        statusCode: 429,
        resolvedAt: null,
      }),
    ]);
  });

  it("records a thrown buyer confirmation with the address scrubbed from the message", async () => {
    mockSend.mockRejectedValueOnce(new Error("connect failed for ada@example.com"));
    const giftId = await createGift();

    await expect(activateGift(paidInput(giftId))).rejects.toThrow();

    expect((await findGiftById(giftId))?.emailFailures).toEqual([
      expect.objectContaining({
        emailType: "gift_confirmation",
        kind: "send_error",
        errorMessage: "connect failed for [address]",
      }),
    ]);
  });

  it("resolves the recorded failure when the next activation sends", async () => {
    mockSend.mockResolvedValueOnce({ kind: "failed", error: "rate limited" });
    const giftId = await createGift();

    await activateGift(paidInput(giftId));
    await activateGift(paidInput(giftId));

    expect((await findGiftById(giftId))?.emailFailures[0]?.resolvedAt).toEqual(expect.any(String));
  });

  it("releases the claim when the send throws", async () => {
    mockSend.mockRejectedValueOnce(new Error("network down"));
    const giftId = await createGift();

    await expect(activateGift(paidInput(giftId))).rejects.toThrow("network down");
    expect((await findGiftById(giftId))?.buyerEmailClaimedAt).toBeNull();
  });

  it.each([
    ["dry_run", { kind: "dry_run" as const }],
    ["skipped", { kind: "skipped" as const, reason: "no_api_key" as const }],
  ])("keeps the claim after a %s send", async (_label, result) => {
    mockSend.mockResolvedValueOnce(result);
    const giftId = await createGift();

    await activateGift(paidInput(giftId));
    await activateGift(paidInput(giftId));

    expect(mockSend).toHaveBeenCalledTimes(1);
    const gift = await findGiftById(giftId);
    expect(gift?.buyerEmailClaimedAt).not.toBeNull();
    expect(gift?.emailsFired).toEqual([]);
  });

  it("sends nothing and releases the claim when the stored hash does not match", async () => {
    const giftId = await createGift();
    await dbExec(`UPDATE gift_codes SET lookup_hash = ? WHERE id = ?`, ["f".repeat(64), giftId]);

    expect((await activateGift(paidInput(giftId))).result).toBe("done");

    expect(mockSend).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
    const gift = await findGiftById(giftId);
    expect(gift?.status).toBe("active");
    expect(gift?.buyerEmailClaimedAt).toBeNull();
  });
});
