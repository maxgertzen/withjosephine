import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchThankYouPage: vi.fn(),
  fetchReading: vi.fn(),
  fetchReadingSlugs: vi.fn(),
}));

import { fetchThankYouPage } from "@/lib/sanity/fetch";
import type { SanityThankYouPage } from "@/lib/sanity/types";

const mockFetchThankYouPage = vi.mocked(fetchThankYouPage);

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
