import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { COOLING_OFF_CONSENT_LABEL } from "@/lib/compliance/intakeConsent";
import type { SanityReading } from "@/lib/sanity/types";
import { captureConsole } from "@/test/captureConsole";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadingFresh: vi.fn(),
}));

vi.mock("@/lib/gift/gifts", () => ({
  createPendingGift: vi.fn(),
}));

import { createPendingGift } from "@/lib/gift/gifts";
import { fetchReadingFresh } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);
const mockReading = vi.mocked(fetchReadingFresh);
const mockCreatePendingGift = vi.mocked(createPendingGift);

const GIFT_ID = "11111111-2222-4333-8444-555555555555";
const BUYER_NAME = "Marguerite";
const NOTE = "For the long winter ahead";
const IP = "198.51.100.23";

const READING: SanityReading = {
  _id: "reading-1",
  name: "Birth Chart Reading",
  slug: "birth-chart",
  tag: "",
  subtitle: "",
  price: 89,
  priceDisplay: "$89",
  valueProposition: "",
  briefDescription: "",
  includes: [],
  requiresBirthChart: true,
  requiresAkashic: false,
  requiresQuestions: false,
  stripePaymentLink: "https://buy.stripe.com/test_gift",
};

const VALID_BODY = {
  readingSlug: "birth-chart",
  buyerFirstName: BUYER_NAME,
  note: NOTE,
  coolingOffConsent: true,
  turnstileToken: "valid-token",
};

async function callRoute(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/gift/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

let capturedConsole: ReturnType<typeof captureConsole>;

beforeEach(() => {
  vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
  mockVerify.mockReset().mockResolvedValue(true);
  mockReading.mockReset().mockResolvedValue(READING);
  mockCreatePendingGift.mockReset().mockResolvedValue({ giftId: GIFT_ID });
  capturedConsole = captureConsole();
});

afterEach(() => {
  expect(capturedConsole.text()).not.toMatch(new RegExp(`${BUYER_NAME}|${NOTE}|${IP}`));
  vi.restoreAllMocks();
});

describe("POST /api/gift/purchase guards", () => {
  it("returns 503 without GIFT_CODE_SECRET and writes no row", async () => {
    vi.stubEnv("GIFT_CODE_SECRET", "");
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(503);
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid JSON", async () => {
    const res = await callRoute("{not json");
    expect(res.status).toBe(400);
  });

  it.each([
    ["a missing note", { ...VALID_BODY, note: undefined }],
    ["a non-boolean consent", { ...VALID_BODY, coolingOffConsent: "yes" }],
    ["a missing turnstile token", { ...VALID_BODY, turnstileToken: undefined }],
  ])("returns 400 for %s", async (_label, body) => {
    const res = await callRoute(body);
    expect(res.status).toBe(400);
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("returns 400 when the honeypot is filled, before Turnstile", async () => {
    const res = await callRoute({ ...VALID_BODY, [HONEYPOT_FIELD]: "spam" });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 coolingOff required when consent is false", async () => {
    const res = await callRoute({ ...VALID_BODY, coolingOffConsent: false });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ fieldErrors: { coolingOff: "required" } });
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when Turnstile fails and passes the client IP", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY, { "cf-connecting-ip": IP });
    expect(res.status).toBe(400);
    expect(mockVerify).toHaveBeenCalledWith("valid-token", IP);
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("returns 404 when the reading is missing", async () => {
    mockReading.mockResolvedValueOnce(null);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(404);
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });
});

describe("POST /api/gift/purchase name and note", () => {
  it.each([
    ["empty", ""],
    ["only spaces", "   "],
    ["only a brace tag", "{code}"],
  ])("rejects a name that is %s", async (_label, buyerFirstName) => {
    const res = await callRoute({ ...VALID_BODY, buyerFirstName });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ fieldErrors: { buyerFirstName: "required" } });
    expect(mockVerify).not.toHaveBeenCalled();
    expect(mockReading).not.toHaveBeenCalled();
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("rejects a name over 80 characters", async () => {
    const res = await callRoute({ ...VALID_BODY, buyerFirstName: "a".repeat(81) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ fieldErrors: { buyerFirstName: "too_long" } });
  });

  it("accepts a name of exactly 80 characters", async () => {
    const res = await callRoute({ ...VALID_BODY, buyerFirstName: "a".repeat(80) });
    expect(res.status).toBe(200);
  });

  it("rejects a note over 280 characters", async () => {
    const res = await callRoute({ ...VALID_BODY, note: "n".repeat(281) });
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ fieldErrors: { note: "too_long" } });
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("counts the note length after brace tags are stripped", async () => {
    const res = await callRoute({ ...VALID_BODY, note: `${"n".repeat(280)}{code}` });
    expect(res.status).toBe(200);
  });

  it("strips brace tags from the name and the note", async () => {
    await callRoute({
      ...VALID_BODY,
      buyerFirstName: " Mar{code}guerite ",
      note: "Use {code} at {giftUrl} soon",
    });
    expect(mockCreatePendingGift).toHaveBeenCalledWith(
      expect.objectContaining({ buyerFirstName: "Marguerite", note: "Use  at  soon" }),
    );
  });

  it("stores an empty note as null", async () => {
    await callRoute({ ...VALID_BODY, note: "  {code} " });
    expect(mockCreatePendingGift).toHaveBeenCalledWith(expect.objectContaining({ note: null }));
  });
});

describe("POST /api/gift/purchase success", () => {
  it("saves the cooling-off label and the IP, and returns the gift Payment Link", async () => {
    const res = await callRoute(VALID_BODY, { "cf-connecting-ip": IP });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentUrl: string; giftId: string };
    expect(body.giftId).toBe(GIFT_ID);

    const input = mockCreatePendingGift.mock.calls[0][0];
    expect(input).toMatchObject({
      readingSlug: "birth-chart",
      buyerFirstName: BUYER_NAME,
      note: NOTE,
      consentLabel: COOLING_OFF_CONSENT_LABEL,
      consentIpAddress: IP,
    });
    expect(input.coolingOffAcknowledgedAt).toBe(input.createdAt);

    const url = new URL(body.paymentUrl);
    expect(url.origin + url.pathname).toBe("https://buy.stripe.com/test_gift");
    expect(url.searchParams.get("client_reference_id")).toBe(`gift_${GIFT_ID}`);
    expect(url.searchParams.has("prefilled_email")).toBe(false);
  });

  it("stores a null IP when the request carries none", async () => {
    await callRoute(VALID_BODY);
    expect(mockCreatePendingGift).toHaveBeenCalledWith(
      expect.objectContaining({ consentIpAddress: null }),
    );
  });

  it("returns 503 when the reading's Payment Link is not a Stripe link", async () => {
    mockReading.mockResolvedValueOnce({
      ...READING,
      stripePaymentLink: "https://evil.example.com/pay",
    });
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(503);
    expect(mockCreatePendingGift).not.toHaveBeenCalled();
  });

  it("returns 500 when saving the gift fails, without logging the sheet or the IP", async () => {
    mockCreatePendingGift.mockRejectedValueOnce(new Error("D1_ERROR: database is locked"));
    const res = await callRoute(VALID_BODY, { "cf-connecting-ip": IP });
    expect(res.status).toBe(500);
    expect(capturedConsole.text()).toContain("[gift-purchase]");
  });
});
