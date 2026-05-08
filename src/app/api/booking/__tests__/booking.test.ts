import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReading: vi.fn(),
  fetchBookingForm: vi.fn(),
}));

const createSubmissionMock = vi.fn();

vi.mock("@/lib/booking/submissions", () => ({
  createSubmission: createSubmissionMock,
}));

import { fetchBookingForm, fetchReading } from "@/lib/sanity/fetch";
import { verifyTurnstileToken } from "@/lib/turnstile";

const mockVerify = vi.mocked(verifyTurnstileToken);
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
          type: "consent",
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
  consentLabelSnapshot: "I agree.",
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

    expect(body.paymentUrl).toContain(`client_reference_id=${body.submissionId}`);
    expect(body.paymentUrl).toContain("prefilled_email=ada%40example.com");
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
            { _id: "f-agree", key: "agreement", label: "I agree.", type: "consent", required: true },
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
      consentLabelSnapshot: "I agree.",
    });

    const responses = createSubmissionMock.mock.calls[0][0].responses as Array<{
      fieldKey: string;
      value: string;
    }>;
    const focus = responses.find((r) => r.fieldKey === "focus");
    expect(focus?.value).toBe("Soul purpose this lifetime, Embodying my higher self");
  });

  it("renders booleans as Yes/No in stored responses", async () => {
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
              type: "consent",
              required: false,
            },
            { _id: "f-agree", key: "agreement", label: "I agree.", type: "consent", required: true },
          ],
        },
      ],
    });

    await callRoute({
      readingSlug: "soul-blueprint",
      values: { email: "ada@example.com", tob_unknown: false, agreement: true },
      turnstileToken: "valid-token",
      consentLabelSnapshot: "I agree.",
    });

    const responses = createSubmissionMock.mock.calls[0][0].responses as Array<{
      fieldKey: string;
      value: string;
    }>;
    const tob = responses.find((r) => r.fieldKey === "tob_unknown");
    expect(tob?.value).toBe("No");
  });
});
