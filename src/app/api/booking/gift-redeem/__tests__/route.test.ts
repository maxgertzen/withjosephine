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

const countActivePendingGiftsForRecipientMock = vi.fn();
vi.mock("@/lib/booking/persistence/repository", () => ({
  countActivePendingGiftsForRecipient: countActivePendingGiftsForRecipientMock,
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
  giftClaimSentNowAt: null,
  giftClaimSentNowActor: null,
  giftClaimPriorAlarmAt: null,};

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
  countActivePendingGiftsForRecipientMock.mockReset().mockResolvedValue(0);
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
  coolingOffConsent: true,
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

  // C5 (2026-05-20 smoke walk): handler returned 400 twice in 12s then 200
  // on retry without code change. No log surface meant the root cause was
  // un-debuggable. Instrument the rejecting branches with tagged
  // console.error so the next failure self-identifies.
  it("logs [gift-redeem] turnstile_rejected on Turnstile failure (C5 instrumentation)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockTurnstile.mockResolvedValueOnce(false);
    await callRoute(VALID_BODY);
    expect(errSpy).toHaveBeenCalledWith(
      expect.stringContaining("[gift-redeem] turnstile_rejected"),
      expect.any(Object),
    );
    errSpy.mockRestore();
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
    expect(body.redirectUrl).toBe("/thank-you/sub_gift_1?gift=1&redeemed=1");

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

  // Session 4b LB-3: anti-abuse cap re-check at claim time
  it("rejects with 422 when claim-time cap is reached (self_send bypass case)", async () => {
    countActivePendingGiftsForRecipientMock.mockResolvedValueOnce(3);
    const res = await callRoute(VALID_BODY);
    const body = await res.json();
    expect(res.status).toBe(422);
    expect(body.error).toBe("Too many pending gifts");
    expect(body.fieldErrors?.email).toBeTruthy();
    expect(countActivePendingGiftsForRecipientMock).toHaveBeenCalledWith(
      "bob@example.com",
      { excludeSubmissionId: "sub_gift_1" },
    );
    expect(redeemGiftSubmissionMock).not.toHaveBeenCalled();
  });

  it("allows redemption when claim-time cap not reached", async () => {
    countActivePendingGiftsForRecipientMock.mockResolvedValueOnce(2);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(200);
    expect(countActivePendingGiftsForRecipientMock).toHaveBeenCalledWith(
      "bob@example.com",
      { excludeSubmissionId: "sub_gift_1" },
    );
    expect(redeemGiftSubmissionMock).toHaveBeenCalled();
  });

  // C-4b — self_send purchases have NULL recipient_email at purchase time;
  // recipient supplies their email at claim, so the redeem must NOT 422 on
  // missing recipient_email and the email-mismatch check is skipped (claim
  // cookie already gated this request).
  describe("self_send with NULL recipient_email at purchase (C-4b)", () => {
    const SELF_SEND_SUBMISSION = {
      ...SUBMISSION,
      giftDeliveryMethod: "self_send" as const,
      recipientEmail: null,
    };

    it("redeems successfully when recipient supplies their email at claim", async () => {
      findSubmissionMock.mockResolvedValueOnce(SELF_SEND_SUBMISSION);
      const res = await callRoute(VALID_BODY);
      expect(res.status).toBe(200);
      expect(redeemGiftSubmissionMock).toHaveBeenCalledWith(
        expect.objectContaining({
          submissionId: "sub_gift_1",
          recipientUserId: "user_bob",
          recipientEmailFromIntake: "bob@example.com",
        }),
      );
    });

    it("does not 422 on missing recipient_email for self_send", async () => {
      findSubmissionMock.mockResolvedValueOnce(SELF_SEND_SUBMISSION);
      const res = await callRoute(VALID_BODY);
      expect(res.status).not.toBe(422);
    });
  });

  // C-4b regression guard — scheduled gifts (recipient_email set at purchase)
  // must still 422 on email mismatch AND on missing recipient_email.
  describe("scheduled gift regression guards (C-4b)", () => {
    const SCHEDULED_NULL_EMAIL = {
      ...SUBMISSION,
      giftDeliveryMethod: "scheduled" as const,
      recipientEmail: null,
    };

    it("still 422s on missing recipient_email when giftDeliveryMethod=scheduled", async () => {
      findSubmissionMock.mockResolvedValueOnce(SCHEDULED_NULL_EMAIL);
      const res = await callRoute(VALID_BODY);
      const body = await res.json();
      expect(res.status).toBe(422);
      expect(body.error).toBe("Recipient email missing");
    });

    it("still enforces email-mismatch check on scheduled gifts", async () => {
      findSubmissionMock.mockResolvedValueOnce({
        ...SUBMISSION,
        giftDeliveryMethod: "scheduled" as const,
        recipientEmail: "scheduled-recipient@example.com",
      });
      const res = await callRoute({
        ...VALID_BODY,
        values: { email: "wrong@example.com", first_name: "Bob" },
      });
      const body = await res.json();
      expect(res.status).toBe(422);
      expect(body.fieldErrors?.email).toBeTruthy();
    });

    it("does NOT pass recipientEmailFromIntake on scheduled gifts (no clobber risk)", async () => {
      findSubmissionMock.mockResolvedValueOnce({
        ...SUBMISSION,
        giftDeliveryMethod: "scheduled" as const,
        recipientEmail: "bob@example.com",
      });
      const res = await callRoute(VALID_BODY);
      expect(res.status).toBe(200);
      const callArgs = redeemGiftSubmissionMock.mock.calls[0]?.[0];
      expect(callArgs.recipientEmailFromIntake).toBeUndefined();
    });
  });
});
