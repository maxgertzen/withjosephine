import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityReading } from "@/lib/sanity/types";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReading: vi.fn(),
  fetchBookingForm: vi.fn(),
}));

const findSubmissionMock = vi.fn();
const redeemGiftSubmissionMock = vi.fn();
vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: findSubmissionMock,
  redeemGiftSubmission: redeemGiftSubmissionMock,
}));

const getOrCreateUserMock = vi.fn();
vi.mock("@/lib/auth/users", () => ({
  getOrCreateUser: getOrCreateUserMock,
}));

const cookieGetMock = vi.fn();
const cookieSetMock = vi.fn();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: cookieGetMock, set: cookieSetMock })),
}));

const verifyCookieMock = vi.fn();
vi.mock("@/lib/booking/giftClaimSession", async () => {
  const actual = await vi.importActual<typeof import("@/lib/booking/giftClaimSession")>(
    "@/lib/booking/giftClaimSession",
  );
  return {
    ...actual,
    verifyGiftClaimCookie: verifyCookieMock,
  };
});

import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockTurnstile = vi.mocked(verifyTurnstileToken);
const mockReading = vi.mocked(fetchReading);
const mockForm = vi.mocked(fetchBookingForm);

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

const BOOKING_FORM = {
  nonRefundableNotice: "Non-refundable.",
  sections: [
    {
      _id: "sec",
      sectionTitle: "Section",
      sectionDescription: "",
      order: 1,
      pageBoundary: false,
      marginaliaLabel: null,
      transitionLine: null,
      clarificationNote: null,
      appliesToServices: null,
      fields: [
        {
          _id: "fld-email",
          key: "email",
          label: "Email",
          type: "email" as const,
          required: true,
          system: false,
          order: 1,
          options: null,
          placeholder: null,
          helpText: null,
          helperPosition: null,
          clarificationNote: null,
          iconKey: null,
          placeAutocompleteSource: null,
          multiSelectCount: null,
          validation: null,
          appliesToServices: null,
        },
        {
          _id: "fld-first",
          key: "first_name",
          label: "First name",
          type: "shortText" as const,
          required: true,
          system: false,
          order: 2,
          options: null,
          placeholder: null,
          helpText: null,
          helperPosition: null,
          clarificationNote: null,
          iconKey: null,
          placeAutocompleteSource: null,
          multiSelectCount: null,
          validation: null,
          appliesToServices: null,
        },
      ],
    },
  ],
} as never;

const SUBMISSION = {
  _id: "sub_gift_1",
  email: "alice@example.com",
  status: "paid",
  reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
  responses: [],
  emailsFired: [],
  consentLabel: null,
  photoR2Key: null,
  createdAt: "2026-05-01T00:00:00Z",
  paidAt: "2026-05-01T01:00:00Z",
  isGift: true,
  purchaserUserId: "alice-user",
  recipientUserId: null,
  recipientEmail: "bob@example.com",
  giftDeliveryMethod: "self_send" as const,
  giftSendAt: null,
  giftMessage: null,
  giftClaimTokenHash: "hashAB",
  giftClaimEmailFiredAt: "2026-05-01T01:00:00Z",
  giftClaimedAt: null,
  giftCancelledAt: null,
};

beforeEach(() => {
  mockTurnstile.mockReset().mockResolvedValue(true);
  mockReading.mockReset().mockResolvedValue(READING);
  mockForm.mockReset().mockResolvedValue(BOOKING_FORM);
  findSubmissionMock.mockReset().mockResolvedValue(SUBMISSION);
  redeemGiftSubmissionMock.mockReset().mockResolvedValue(undefined);
  getOrCreateUserMock.mockReset().mockResolvedValue({ userId: "user_bob", isNew: true });
  cookieGetMock.mockReset().mockReturnValue({ value: "cookie-value" });
  cookieSetMock.mockReset();
  verifyCookieMock.mockReset().mockResolvedValue("sub_gift_1");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function callRoute(body: unknown): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/booking/gift-redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

const VALID_BODY = {
  readingSlug: "soul-blueprint",
  values: { email: "bob@example.com", first_name: "Bob" },
  turnstileToken: "tk",
  art6Consent: true,
  art9Consent: true,
  consentLabelSnapshot: "Cooling-off",
};

describe("/api/booking/gift-redeem", () => {
  it("rejects when claim session cookie is missing or invalid", async () => {
    verifyCookieMock.mockResolvedValueOnce(null);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(401);
  });

  it("rejects honeypot", async () => {
    const res = await callRoute({ ...VALID_BODY, website: "bot" });
    expect(res.status).toBe(400);
  });

  it("rejects missing consents", async () => {
    const res = await callRoute({ ...VALID_BODY, art9Consent: false });
    expect(res.status).toBe(400);
  });

  it("rejects body submissionId mismatch with cookie", async () => {
    const res = await callRoute({ ...VALID_BODY, submissionId: "sub_other" });
    expect(res.status).toBe(403);
  });

  it("rejects Turnstile failure", async () => {
    mockTurnstile.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(400);
  });

  it("returns 404 when submission missing or not a gift", async () => {
    findSubmissionMock.mockResolvedValueOnce(null);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(404);
  });

  it("returns 409 when gift already claimed", async () => {
    findSubmissionMock.mockResolvedValueOnce({ ...SUBMISSION, giftClaimedAt: "yes" });
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(409);
  });

  it("returns 410 when gift was cancelled", async () => {
    findSubmissionMock.mockResolvedValueOnce({ ...SUBMISSION, giftCancelledAt: "yes" });
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(410);
  });

  it("returns 422 when submitted email does not match recipient_email", async () => {
    const res = await callRoute({
      ...VALID_BODY,
      values: { email: "wrong@example.com", first_name: "Bob" },
    });
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.fieldErrors?.email).toBeTruthy();
  });

  it("happy path: creates Bob user, redeems submission, clears cookie, returns redirectUrl", async () => {
    const res = await callRoute(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.submissionId).toBe("sub_gift_1");
    expect(body.redirectUrl).toBe("/thank-you/sub_gift_1?gift=1");

    expect(getOrCreateUserMock).toHaveBeenCalledWith({ email: "bob@example.com" });
    expect(redeemGiftSubmissionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        submissionId: "sub_gift_1",
        recipientUserId: "user_bob",
      }),
    );
    expect(cookieSetMock).toHaveBeenCalledWith(
      expect.stringContaining("gift_claim"),
      "",
      expect.objectContaining({ maxAge: 0 }),
    );
  });

  it("lowercases the submitted email before recipient match", async () => {
    const res = await callRoute({
      ...VALID_BODY,
      values: { email: "Bob@Example.COM", first_name: "Bob" },
    });
    expect(res.status).toBe(200);
  });
});
