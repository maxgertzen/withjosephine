import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SanityBookingForm, SanityReading } from "@/lib/sanity/types";

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstileToken: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReading: vi.fn(),
  fetchBookingForm: vi.fn(),
}));

const createMock = vi.fn();

vi.mock("@/lib/sanity/client", () => ({
  getSanityWriteClient: () => ({
    create: createMock,
  }),
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
  title: "Intake",
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
  createMock.mockReset();
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
    expect(createMock).not.toHaveBeenCalled();
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

  it("creates submission with self-referencing clientReferenceId and returns paymentUrl", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce(READING);
    mockForm.mockResolvedValueOnce(FORM);
    createMock.mockImplementationOnce(async (doc) => ({ _id: doc._id }));

    const res = await callRoute(VALID_BODY, { "cf-connecting-ip": "1.2.3.4" });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { paymentUrl: string; submissionId: string };

    expect(createMock).toHaveBeenCalledOnce();
    const [doc, opts] = createMock.mock.calls[0];
    expect(doc._id).toBe(body.submissionId);
    expect(doc.clientReferenceId).toBe(body.submissionId);
    expect(doc.email).toBe("ada@example.com");
    expect(doc.consentSnapshot.ipAddress).toBe("1.2.3.4");
    expect(opts).toEqual({ visibility: "sync" });

    expect(body.paymentUrl).toContain(`client_reference_id=${body.submissionId}`);
    expect(body.paymentUrl).toContain("prefilled_email=ada%40example.com");
  });

  it("returns 503 when reading has no Stripe Payment Link", async () => {
    mockVerify.mockResolvedValueOnce(true);
    mockReading.mockResolvedValueOnce({ ...READING, stripePaymentLink: undefined });
    mockForm.mockResolvedValueOnce(FORM);
    createMock.mockImplementationOnce(async (doc) => ({ _id: doc._id }));

    const res = await callRoute(VALID_BODY);
    expect(res.status).toBe(503);
  });
});
