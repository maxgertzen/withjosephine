import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReading: vi.fn(),
  fetchBookingPage: vi.fn(),
  fetchReadingSlugs: vi.fn(),
}));

import { fetchBookingPage, fetchReading } from "@/lib/sanity/fetch";
import type { SanityBookingPage, SanityReading } from "@/lib/sanity/types";

const mockFetchReading = vi.mocked(fetchReading);
const mockFetchBookingPage = vi.mocked(fetchBookingPage);

const SOUL_BLUEPRINT_SEO = {
  metaTitle: "Soul Blueprint Reading | Josephine — $179",
  metaDescription: "The complete picture.",
};

const BOOKING_PAGE_SEO = {
  metaTitle: "Book a Reading — Josephine",
  metaDescription: "Choose your reading.",
};

function sanityReading(overrides: Partial<SanityReading> = {}): SanityReading {
  return {
    _id: "reading-soul-blueprint",
    name: "The Soul Blueprint",
    slug: "soul-blueprint",
    tag: "Signature",
    subtitle: "Soul Blueprint Reading",
    price: 179,
    priceDisplay: "$179",
    valueProposition: "The most complete picture",
    briefDescription: "My signature offering",
    expandedDetails: [],
    includes: [],
    bookingSummary: "Most comprehensive reading",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    stripePaymentLink: "https://buy.stripe.com/test",
    ...overrides,
  };
}

function bookingPage(overrides: Partial<SanityBookingPage> = {}): SanityBookingPage {
  return {
    emailLabel: "Your Email",
    emailDisclaimer: "Only used for this reading.",
    paymentButtonText: "Continue to Payment",
    securityNote: "Secure checkout",
    formatNote: "Detailed voice note recording + a supporting PDF created entirely for you.",
    closingMessage: "With love, Josephine",
    deliveryNote: "Within 7 days.",
    ...overrides,
  };
}

async function loadGenerateMetadata() {
  const mod = await import("./page");
  return mod.generateMetadata;
}

function params(readingId: string) {
  return { params: Promise.resolve({ readingId }) };
}

beforeEach(() => {
  mockFetchReading.mockReset();
  mockFetchBookingPage.mockReset();
});

describe("BookingPage generateMetadata", () => {
  it("uses reading-level SEO fields when present", async () => {
    mockFetchReading.mockResolvedValue(sanityReading({ seo: SOUL_BLUEPRINT_SEO }));
    mockFetchBookingPage.mockResolvedValue(bookingPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.title).toBe(SOUL_BLUEPRINT_SEO.metaTitle);
    expect(metadata.description).toBe(SOUL_BLUEPRINT_SEO.metaDescription);
  });

  it("falls back to bookingPage.seo when reading has no seo", async () => {
    mockFetchReading.mockResolvedValue(sanityReading());
    mockFetchBookingPage.mockResolvedValue(bookingPage({ seo: BOOKING_PAGE_SEO }));

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.title).toBe(BOOKING_PAGE_SEO.metaTitle);
    expect(metadata.description).toBe(BOOKING_PAGE_SEO.metaDescription);
  });

  it("falls back to name-interpolated default when neither has seo", async () => {
    mockFetchReading.mockResolvedValue(sanityReading());
    mockFetchBookingPage.mockResolvedValue(bookingPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.title).toBe("Book The Soul Blueprint — Josephine");
    expect(metadata.description).toBe(
      "Choose your reading and share your details. Your voice note and PDF will be with you within 7 days.",
    );
  });

  it("falls back to hardcoded defaults when sanity reading has no seo and booking page is null", async () => {
    mockFetchReading.mockResolvedValue(sanityReading());
    mockFetchBookingPage.mockResolvedValue(null);

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.title).toBe("Book The Soul Blueprint — Josephine");
    expect(metadata.description).toBe(
      "Choose your reading and share your details. Your voice note and PDF will be with you within 7 days.",
    );
  });

  it("falls back to static reading name when sanity returns null", async () => {
    mockFetchReading.mockResolvedValue(null);
    mockFetchBookingPage.mockResolvedValue(null);

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.title).toBe("Book The Soul Blueprint — Josephine");
  });

  it("uses generic title when reading slug is unknown and sanity returns null", async () => {
    mockFetchReading.mockResolvedValue(null);
    mockFetchBookingPage.mockResolvedValue(null);

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("nonexistent-reading"));

    expect(metadata.title).toBe("Book a Reading — Josephine");
  });

  it("calls both fetch functions", async () => {
    mockFetchReading.mockResolvedValue(sanityReading());
    mockFetchBookingPage.mockResolvedValue(bookingPage());

    const generateMetadata = await loadGenerateMetadata();
    await generateMetadata(params("soul-blueprint"));

    expect(mockFetchReading).toHaveBeenCalledWith("soul-blueprint");
    expect(mockFetchBookingPage).toHaveBeenCalledOnce();
  });

  it("includes ogImage in openGraph when reading seo has it", async () => {
    mockFetchReading.mockResolvedValue(
      sanityReading({
        seo: {
          metaTitle: "Soul Blueprint",
          metaDescription: "Desc",
          ogImage: { asset: { url: "https://cdn.sanity.io/images/og.jpg" } },
        },
      }),
    );
    mockFetchBookingPage.mockResolvedValue(bookingPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        images: [{ url: "https://cdn.sanity.io/images/og.jpg" }],
      }),
    );
  });

  it("omits openGraph.images when no ogImage is set", async () => {
    mockFetchReading.mockResolvedValue(sanityReading({ seo: SOUL_BLUEPRINT_SEO }));
    mockFetchBookingPage.mockResolvedValue(bookingPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata(params("soul-blueprint"));

    expect(metadata.openGraph?.images).toBeUndefined();
  });
});
