import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchThankYouPage: vi.fn(),
  fetchReading: vi.fn(),
  fetchReadingSlugs: vi.fn(),
}));

const redirectMock = vi.fn(() => {
  throw new Error("__redirect__");
});
const notFoundMock = vi.fn(() => {
  throw new Error("__notfound__");
});

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
  notFound: notFoundMock,
}));

import { fetchReading, fetchThankYouPage } from "@/lib/sanity/fetch";
import type { SanityReading, SanityThankYouPage } from "@/lib/sanity/types";

const mockFetchThankYouPage = vi.mocked(fetchThankYouPage);
const mockFetchReading = vi.mocked(fetchReading);

function reading(overrides: Partial<SanityReading> = {}): SanityReading {
  return {
    _id: "reading-soul-blueprint",
    name: "Soul Blueprint",
    slug: "soul-blueprint",
    tag: "Signature",
    subtitle: "Soul Blueprint Reading",
    price: 17900,
    priceDisplay: "$179",
    valueProposition: "...",
    briefDescription: "...",
    expandedDetails: [],
    includes: [],
    bookingSummary: "...",
    requiresBirthChart: true,
    requiresAkashic: true,
    requiresQuestions: true,
    ...overrides,
  };
}

function thankYouPage(overrides: Partial<SanityThankYouPage> = {}): SanityThankYouPage {
  return {
    heading: "Thank you for booking",
    subheading: "I\u2019m really looking forward to reading for you.",
    steps: [],
    closingMessage: "With love, Josephine",
    returnButtonText: "Return to Home",
    ...overrides,
  };
}

async function loadGenerateMetadata() {
  const mod = await import("./page");
  return mod.generateMetadata;
}

beforeEach(() => {
  mockFetchThankYouPage.mockReset();
  mockFetchReading.mockReset();
  redirectMock.mockClear();
  notFoundMock.mockClear();
});

describe("ThankYouPage generateMetadata", () => {
  it("uses Sanity SEO fields when present", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        seo: {
          metaTitle: "Thank You — Josephine",
          metaDescription: "Custom description from Sanity.",
        },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Thank You — Josephine");
    expect(metadata.description).toBe("Custom description from Sanity.");
  });

  it("falls back to defaults when seo is missing", async () => {
    mockFetchThankYouPage.mockResolvedValue(thankYouPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Thank You \u2014 Josephine");
    expect(metadata.description).toBe(
      "Your reading is in my hands. You'll receive a confirmation email shortly with your answers and timeline.",
    );
  });

  it("falls back to defaults when sanity returns null", async () => {
    mockFetchThankYouPage.mockResolvedValue(null);

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Thank You \u2014 Josephine");
    expect(metadata.description).toBe(
      "Your reading is in my hands. You'll receive a confirmation email shortly with your answers and timeline.",
    );
  });

  it("sets robots to noindex nofollow regardless of seo presence", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        seo: {
          metaTitle: "Custom Title",
          metaDescription: "Custom desc",
        },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it("omits openGraph.images (thank-you pages are noindex)", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        seo: {
          metaTitle: "Thank You",
          metaDescription: "Desc",
          ogImage: { asset: { url: "https://cdn.sanity.io/images/og.jpg" } },
        },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.openGraph?.images).toBeUndefined();
  });
});

async function loadDefault() {
  const mod = await import("./page");
  return mod.default;
}

async function callPage(searchParamValue: { sessionId?: string | string[] } = {}) {
  const Page = await loadDefault();
  return Page({
    params: Promise.resolve({ readingId: "soul-blueprint" }),
    searchParams: Promise.resolve(searchParamValue),
  });
}

describe("ThankYouPage sessionId guard", () => {
  it("redirects to '/' when sessionId is missing", async () => {
    await expect(callPage()).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects to '/' when sessionId does not match the Stripe pattern", async () => {
    await expect(callPage({ sessionId: "not-a-stripe-session" })).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects to '/' when sessionId is an array (duplicate query param)", async () => {
    await expect(
      callPage({ sessionId: ["cs_test_abc", "cs_test_def"] }),
    ).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("does not fetch Sanity when the sessionId guard rejects", async () => {
    await expect(callPage()).rejects.toThrow("__redirect__");
    expect(mockFetchReading).not.toHaveBeenCalled();
    expect(mockFetchThankYouPage).not.toHaveBeenCalled();
  });

  it("proceeds past the guard when sessionId matches a Stripe test session", async () => {
    mockFetchReading.mockResolvedValue(reading());
    mockFetchThankYouPage.mockResolvedValue(thankYouPage());
    await expect(callPage({ sessionId: "cs_test_abc123" })).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("proceeds past the guard for a Stripe live session id", async () => {
    mockFetchReading.mockResolvedValue(reading());
    mockFetchThankYouPage.mockResolvedValue(thankYouPage());
    await expect(callPage({ sessionId: "cs_live_xyz789" })).resolves.toBeTruthy();
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
