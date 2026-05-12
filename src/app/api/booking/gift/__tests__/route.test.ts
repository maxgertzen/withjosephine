import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityReading } from "@/lib/sanity/types";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReading: vi.fn(),
}));

const createSubmissionMock = vi.fn();
vi.mock("@/lib/booking/submissions", () => ({
  createSubmission: createSubmissionMock,
}));

const countActiveMock = vi.fn();
vi.mock("@/lib/booking/persistence/repository", () => ({
  countActivePendingGiftsForRecipient: countActiveMock,
}));

import { fetchReading } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);
const mockReading = vi.mocked(fetchReading);

const READING: SanityReading = {
  _id: "reading-1",
  name: "Soul Blueprint",
  slug: "soul-blueprint",
  tag: "Signature",
  subtitle: "",
  price: 179,
  priceDisplay: "$179",
  valueProposition: "",
  briefDescription: "",
  expandedDetails: [],
  includes: [],
  bookingSummary: "",
  requiresBirthChart: false,
  requiresAkashic: false,
  requiresQuestions: false,
  stripePaymentLink: "https://buy.stripe.com/test_abc",
};

beforeEach(() => {
  mockVerify.mockReset().mockResolvedValue(true);
  mockReading.mockReset().mockResolvedValue(READING);
  createSubmissionMock.mockReset().mockResolvedValue(undefined);
  countActiveMock.mockReset().mockResolvedValue(0);
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/booking/gift", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const SELF_SEND_BODY = {
  readingSlug: "soul-blueprint",
  purchaserEmail: "alice@example.com",
  purchaserFirstName: "Alice",
  deliveryMethod: "self_send" as const,
  art6Consent: true,
  coolingOffConsent: true,
  termsConsent: true,
  turnstileToken: "valid-token",
};

function scheduledBody(overrides: Record<string, unknown> = {}) {
  return {
    readingSlug: "soul-blueprint",
    purchaserEmail: "alice@example.com",
    purchaserFirstName: "Alice",
    deliveryMethod: "scheduled" as const,
    recipientName: "Bob",
    recipientEmail: "bob@example.com",
    giftSendAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    art6Consent: true,
    coolingOffConsent: true,
    termsConsent: true,
    turnstileToken: "valid-token",
    ...overrides,
  };
}

describe("/api/booking/gift", () => {
  it("rejects honeypot field", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, website: "bot" });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("rejects malformed body (missing required fields)", async () => {
    const res = await callRoute({ readingSlug: "soul-blueprint" });
    expect(res.status).toBe(400);
  });

  it("rejects invalid delivery method", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, deliveryMethod: "later" });
    expect(res.status).toBe(400);
  });

  it("rejects missing consents", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, coolingOffConsent: false });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.coolingOffConsent).toBeTruthy();
  });

  it("rejects when purchaser email is malformed", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, purchaserEmail: "not-an-email" });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.purchaserEmail).toBeTruthy();
  });

  it("rejects when recipient = purchaser", async () => {
    const res = await callRoute(
      scheduledBody({
        recipientEmail: "alice@example.com",
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.recipientEmail).toBeTruthy();
  });

  it("rejects recipientEmail exceeding RFC 5321 254-char cap (scheduled)", async () => {
    const longLocal = "x".repeat(245);
    const res = await callRoute(
      scheduledBody({
        recipientEmail: `${longLocal}@example.com`, // 245 + 1 + 11 = 257 chars
      }),
    );
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.recipientEmail).toBeTruthy();
  });

  it("rejects recipientEmail exceeding 254-char cap (self_send too)", async () => {
    const longLocal = "x".repeat(245);
    const res = await callRoute({
      ...SELF_SEND_BODY,
      recipientEmail: `${longLocal}@example.com`,
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.recipientEmail).toBeTruthy();
  });

  // Session 4b GAP-6: purchaserEmail length cap (Pentester LOW-3 parity)
  it("rejects purchaserEmail exceeding RFC 5321 254-char cap", async () => {
    const longLocal = "p".repeat(245);
    const res = await callRoute({
      ...SELF_SEND_BODY,
      purchaserEmail: `${longLocal}@example.com`, // 257 chars
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.purchaserEmail).toBeTruthy();
  });

  it("rejects scheduled mode missing recipient + send-at", async () => {
    const res = await callRoute({
      ...SELF_SEND_BODY,
      deliveryMethod: "scheduled",
    });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.recipientName).toBeTruthy();
    expect(body.fieldErrors.recipientEmail).toBeTruthy();
    expect(body.fieldErrors.giftSendAt).toBeTruthy();
  });

  it("rejects send-at in the past", async () => {
    const res = await callRoute(
      scheduledBody({
        giftSendAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects send-at beyond 365 days", async () => {
    const res = await callRoute(
      scheduledBody({
        giftSendAt: new Date(Date.now() + 400 * 24 * 60 * 60 * 1000).toISOString(),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects gift message over 280 chars", async () => {
    const res = await callRoute({
      ...SELF_SEND_BODY,
      giftMessage: "x".repeat(281),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when turnstile fails", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(400);
    expect(createSubmissionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when reading is missing", async () => {
    mockReading.mockResolvedValueOnce(null);
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(404);
  });

  it("returns 422 when anti-abuse cap is hit (scheduled)", async () => {
    countActiveMock.mockResolvedValueOnce(3);
    const res = await callRoute(scheduledBody());
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.fieldErrors.recipientEmail).toBeTruthy();
    expect(createSubmissionMock).not.toHaveBeenCalled();
  });

  it("skips anti-abuse check for self_send without recipient email", async () => {
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(200);
    expect(countActiveMock).not.toHaveBeenCalled();
  });

  it("returns 503 when reading lacks a Stripe payment link", async () => {
    mockReading.mockResolvedValueOnce({ ...READING, stripePaymentLink: undefined });
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(503);
  });

  it("persists self_send submission with correct fields and returns paymentUrl", async () => {
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentUrl).toContain("buy.stripe.com");
    expect(body.paymentUrl).toContain("client_reference_id=");
    expect(createSubmissionMock).toHaveBeenCalledTimes(1);
    const persisted = createSubmissionMock.mock.calls[0]![0];
    expect(persisted.isGift).toBe(true);
    expect(persisted.giftDeliveryMethod).toBe("self_send");
    expect(persisted.giftSendAt).toBeNull();
    expect(persisted.recipientEmail).toBeNull();
    expect(persisted.email).toBe("alice@example.com");
    expect(persisted.art9AcknowledgedAt).toBeNull();
  });

  it("persists scheduled submission with recipient + send-at + gift message", async () => {
    const sendAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const res = await callRoute(
      scheduledBody({
        giftSendAt: sendAt,
        giftMessage: "happy birthday <3",
      }),
    );
    expect(res.status).toBe(200);
    const persisted = createSubmissionMock.mock.calls[0]![0];
    expect(persisted.isGift).toBe(true);
    expect(persisted.giftDeliveryMethod).toBe("scheduled");
    expect(persisted.recipientEmail).toBe("bob@example.com");
    expect(persisted.giftSendAt).toBe(sendAt);
    expect(persisted.giftMessage).toBe("happy birthday <3");
    expect(persisted.responses).toEqual([
      {
        fieldKey: "purchaser_first_name",
        fieldLabelSnapshot: "Your first name",
        fieldType: "shortText",
        value: "Alice",
      },
      {
        fieldKey: "recipient_name",
        fieldLabelSnapshot: "Recipient name",
        fieldType: "shortText",
        value: "Bob",
      },
    ]);
  });

  it("rejects missing purchaser first name", async () => {
    const without: Record<string, unknown> = { ...SELF_SEND_BODY };
    delete without.purchaserFirstName;
    const res = await callRoute(without);
    expect(res.status).toBe(400);
  });

  it("rejects blank purchaser first name", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, purchaserFirstName: "   " });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.purchaserFirstName).toBeTruthy();
  });

  it("rejects purchaser first name over 80 characters", async () => {
    const res = await callRoute({ ...SELF_SEND_BODY, purchaserFirstName: "A".repeat(81) });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.fieldErrors.purchaserFirstName).toBeTruthy();
  });

  it("persists purchaser first name as the first responses entry", async () => {
    await callRoute({ ...SELF_SEND_BODY, purchaserFirstName: "  Alice  " });
    const persisted = createSubmissionMock.mock.calls[0]![0];
    expect(persisted.responses[0]).toEqual({
      fieldKey: "purchaser_first_name",
      fieldLabelSnapshot: "Your first name",
      fieldType: "shortText",
      value: "Alice",
    });
  });

  it("includes Stripe metadata[is_gift]=true and gift_delivery_method in the payment URL", async () => {
    const res = await callRoute(SELF_SEND_BODY);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentUrl).toContain("metadata%5Bis_gift%5D=true");
    expect(body.paymentUrl).toContain("metadata%5Bgift_delivery_method%5D=self_send");
  });

  it("includes scheduled delivery method in Stripe metadata when scheduled", async () => {
    const res = await callRoute(scheduledBody());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.paymentUrl).toContain("metadata%5Bgift_delivery_method%5D=scheduled");
  });

  it("lowercases purchaser + recipient emails before persisting", async () => {
    await callRoute(
      scheduledBody({
        purchaserEmail: "Alice@Example.COM",
        recipientEmail: "Bob@Example.COM",
      }),
    );
    const persisted = createSubmissionMock.mock.calls[0]![0];
    expect(persisted.email).toBe("alice@example.com");
    expect(persisted.recipientEmail).toBe("bob@example.com");
  });
});
