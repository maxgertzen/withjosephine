import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadingFresh: vi.fn(),
  fetchBookingFormFresh: vi.fn(),
}));

const createSubmissionMock = vi.fn();

vi.mock("@/lib/booking/submissions", () => ({
  createSubmission: createSubmissionMock,
  SUBMISSION_STATUS: { pending: "pending", paid: "paid", expired: "expired" },
}));

vi.mock("@/lib/gift/giftRateLimit", () => ({
  checkGiftRateLimit: vi.fn(),
}));

vi.mock("@/lib/gift/redeemGift", () => ({
  redeemGiftSubmission: vi.fn(),
}));

import { checkGiftRateLimit } from "@/lib/gift/giftRateLimit";
import { redeemGiftSubmission } from "@/lib/gift/redeemGift";
import { fetchBookingFormFresh, fetchReadingFresh } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);
const mockReading = vi.mocked(fetchReadingFresh);
const mockForm = vi.mocked(fetchBookingFormFresh);
const mockGiftRateLimit = vi.mocked(checkGiftRateLimit);
const mockRedeem = vi.mocked(redeemGiftSubmission);

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
  includes: [],
  requiresBirthChart: false,
  requiresAkashic: false,
  requiresQuestions: false,
  stripePaymentLink: "https://buy.stripe.com/test_abc",
};

const FORM: SanityBookingForm = {
  nonRefundableNotice: "no refund",
  sections: [
    {
      _id: "sec-1",
      sectionTitle: "About",
      fields: [
        { _id: "f-name", key: "fullName", label: "Full name", type: "shortText", required: true },
        { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
        {
          _id: "f-consent",
          key: "agreement",
          label: "I agree.",
          type: "checkbox",
          required: true,
        },
      ],
    },
  ],
};

beforeEach(() => {
  mockVerify.mockReset();
  mockReading.mockReset();
  mockForm.mockReset();
  createSubmissionMock.mockReset().mockResolvedValue(undefined);
  mockGiftRateLimit.mockReset().mockResolvedValue(true);
  mockRedeem.mockReset().mockResolvedValue({ kind: "redeemed", submissionId: "sub_gift" });
});

async function callRoute(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  const { POST } = await import("../route");
  return POST(
    new Request("http://localhost/api/booking", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
}

const VALID_BODY = {
  readingSlug: "soul-blueprint",
  values: {
    fullName: "Ada Lovelace",
    email: "ada@example.com",
    agreement: true,
  },
  turnstileToken: "valid-token",
  art6Consent: true,
  art9Consent: true,
  coolingOffConsent: true,
};

describe("/api/booking", () => {
  it("rejects when honeypot field is non-empty", async () => {
    const res = await callRoute({ ...VALID_BODY, website: "spam" });
    expect(res.status).toBe(400);
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it("returns 400 when turnstile verification fails", async () => {
    mockVerify.mockResolvedValueOnce(false);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(400);
    expect(createSubmissionMock).not.toHaveBeenCalled();
  });

  it("returns 404 when reading is missing", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(null);
    mockForm.mockResolvedValueOnce(FORM);
    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(404);
  });

  it("returns 400 with field errors when validation fails", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce(FORM);
    const res = await callRoute({
      ...VALID_BODY,
      values: { fullName: "", email: "not-email", agreement: false },
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { fieldErrors?: Record<string, string> };
    expect(body.fieldErrors).toBeDefined();
  });

  it("creates submission and returns paymentUrl with Stripe client_reference_id query param", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce(FORM);

    const res = await callRoute(VALID_BODY, { "cf-connecting-ip": "1.2.3.4" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentUrl: string; submissionId: string };

    expect(createSubmissionMock).toHaveBeenCalledOnce();
    const input = createSubmissionMock.mock.calls[0][0];
    expect(input.id).toBe(body.submissionId);
    expect(input.email).toBe("ada@example.com");
    expect(input.ipAddress).toBe("1.2.3.4");
    expect(input.readingSlug).toBe("soul-blueprint");
    expect(input.status).toBe("pending");
    expect(input.art6AcknowledgedAt).toBe(input.consentAcknowledgedAt);
    expect(input.art9AcknowledgedAt).toBe(input.consentAcknowledgedAt);

    expect(body.paymentUrl).toContain(`client_reference_id=${body.submissionId}`);
    expect(body.paymentUrl).toContain("prefilled_email=ada%40example.com");
  });

  it.each([
    { art6Consent: false, art9Consent: true, coolingOffConsent: true },
    { art6Consent: true, art9Consent: false, coolingOffConsent: true },
    { art6Consent: true, art9Consent: true, coolingOffConsent: false },
    { art6Consent: false, art9Consent: false, coolingOffConsent: false },
  ])(
    "returns 400 when any of art6/art9/cooling-off is false ($art6Consent/$art9Consent/$coolingOffConsent)",
    async ({ art6Consent, art9Consent, coolingOffConsent }) => {
      mockVerify.mockResolvedValueOnce(true);
      const res = await callRoute({
        ...VALID_BODY,
        art6Consent,
        art9Consent,
        coolingOffConsent,
      });
      expect(res.status).toBe(400);
      expect(createSubmissionMock).not.toHaveBeenCalled();
    },
  );

  it("returns 400 when any consent flag is missing from the body shape", async () => {
    const {
      art6Consent: _a6,
      art9Consent: _a9,
      coolingOffConsent: _co,
      ...withoutConsents
    } = VALID_BODY;
    void _a6;
    void _a9;
    void _co;
    const res = await callRoute(withoutConsents);
    expect(res.status).toBe(400);
    expect(createSubmissionMock).not.toHaveBeenCalled();
  });

  it("returns 503 when reading has no Stripe Payment Link", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce({ ...READING, stripePaymentLink: undefined });
    mockForm.mockResolvedValueOnce(FORM);

    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(503);
  });

  it("translates multiSelectExact option codes to labels in stored responses", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce({
      ...FORM,
      sections: [
        {
          _id: "sec-1",
          sectionTitle: "About",
          fields: [
            { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
            {
              _id: "f-focus",
              key: "focus",
              label: "Pick 3",
              type: "multiSelectExact",
              required: true,
              multiSelectCount: 2,
              options: [
                { value: "soul_purpose_lifetime", label: "Soul purpose this lifetime" },
                { value: "embody_higher_self", label: "Embodying my higher self" },
                { value: "ancestral_wounding", label: "Ancestral wounding" },
              ],
            },
            { _id: "f-agree", key: "agreement", label: "I agree.", type: "checkbox", required: true },
          ],
        },
      ],
    });

    await callRoute({
      readingSlug: "soul-blueprint",
      values: {
        email: "ada@example.com",
        focus: ["soul_purpose_lifetime", "embody_higher_self"],
        agreement: true,
      },
      turnstileToken: "valid-token",
      art6Consent: true,
      art9Consent: true,
      coolingOffConsent: true,
    });

    const responses = createSubmissionMock.mock.calls[0][0].responses as Array<{
      fieldKey: string;
      value: string;
    }>;
    const focus = responses.find((r) => r.fieldKey === "focus");
    expect(focus?.value).toBe("Soul purpose this lifetime, Embodying my higher self");
  });

  it("skips checkbox-type fields from the stored response audit trail", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce({
      ...FORM,
      sections: [
        {
          _id: "sec-1",
          sectionTitle: "About",
          fields: [
            { _id: "f-email", key: "email", label: "Email", type: "email", required: true },
            {
              _id: "f-tob-unknown",
              key: "tob_unknown",
              label: "I don't know my birth time",
              type: "checkbox",
              required: false,
            },
            { _id: "f-agree", key: "agreement", label: "I agree.", type: "checkbox", required: true },
          ],
        },
      ],
    });

    await callRoute({
      readingSlug: "soul-blueprint",
      values: { email: "ada@example.com", tob_unknown: false, agreement: true },
      turnstileToken: "valid-token",
      art6Consent: true,
      art9Consent: true,
      coolingOffConsent: true,
    });

    const responses = createSubmissionMock.mock.calls[0][0].responses as Array<{
      fieldKey: string;
      value: string;
    }>;
    expect(responses.find((r) => r.fieldKey === "tob_unknown")).toBeUndefined();
    expect(responses.find((r) => r.fieldKey === "agreement")).toBeUndefined();
    expect(responses.find((r) => r.fieldKey === "email")).toBeDefined();
  });
});

describe("/api/booking with a gift code", () => {
  const GIFT_BODY = { ...VALID_BODY, giftCode: "4K7M2QXR9TBW" };

  function passBookingChecks() {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce(FORM);
  }

  it("rejects a non-string gift code as an invalid body", async () => {
    const res = await callRoute({ ...VALID_BODY, giftCode: 42 });

    expect(res.status).toBe(400);
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("applies the booking validation to the gift branch", async () => {
    passBookingChecks();

    const res = await callRoute({
      ...GIFT_BODY,
      values: { fullName: "", email: "not-email", agreement: false },
    });

    expect(res.status).toBe(400);
    expect(mockGiftRateLimit).not.toHaveBeenCalled();
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("answers 429 when the gift limiter refuses", async () => {
    passBookingChecks();
    mockGiftRateLimit.mockResolvedValueOnce(false);

    const res = await callRoute(GIFT_BODY);

    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "rate_limited" });
    expect(mockRedeem).not.toHaveBeenCalled();
  });

  it("redeems instead of creating a pending submission and returns the recipient thank-you", async () => {
    passBookingChecks();

    const res = await callRoute(GIFT_BODY, { "cf-connecting-ip": "1.2.3.4" });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      thankYouUrl: "/thank-you/soul-blueprint?submissionId=sub_gift",
      submissionId: "sub_gift",
    });
    expect(createSubmissionMock).not.toHaveBeenCalled();
    expect(mockRedeem).toHaveBeenCalledWith(
      expect.objectContaining({
        code: "4K7M2QXR9TBW",
        submission: expect.objectContaining({
          readingSlug: "soul-blueprint",
          readingName: "Soul Blueprint",
          readingPriceDisplay: "$179",
          email: "ada@example.com",
          photoR2Key: null,
          ipAddress: "1.2.3.4",
          createdAt: expect.any(String),
        }),
      }),
    );
  });

  it.each([
    [{ kind: "already_redeemed" } as const, 409, { error: "gift_already_redeemed" }],
    [{ kind: "not_active" } as const, 409, { error: "gift_not_active" }],
    [{ kind: "not_found" } as const, 404, { error: "gift_not_found" }],
    [
      { kind: "other_reading", readingSlug: "birth-chart" } as const,
      400,
      { error: "gift_other_reading", readingSlug: "birth-chart" },
    ],
  ])("maps %o to %i", async (result, status, body) => {
    passBookingChecks();
    mockRedeem.mockResolvedValueOnce(result);

    const res = await callRoute(GIFT_BODY);

    expect(res.status).toBe(status);
    expect(await res.json()).toEqual(body);
  });

  it("answers 500 without the code in the log when the redeem throws", async () => {
    passBookingChecks();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    mockRedeem.mockRejectedValueOnce(new Error("D1 unavailable"));

    const res = await callRoute(GIFT_BODY);

    expect(res.status).toBe(500);
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("4K7M2QXR9TBW");
    errorSpy.mockRestore();
  });
});
