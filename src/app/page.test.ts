import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchLandingPage: vi.fn(),
  fetchReadings: vi.fn(),
  fetchTestimonials: vi.fn(),
  fetchFaqItems: vi.fn(),
  fetchSiteSettings: vi.fn(),
}));

import { fetchLandingPage } from "@/lib/sanity/fetch";
import type { SanityLandingPage } from "@/lib/sanity/types";

const mockFetchLandingPage = vi.mocked(fetchLandingPage);

function landingPage(overrides: Partial<SanityLandingPage> = {}): SanityLandingPage {
  return {
    hero: { tagline: "Tag", introGreeting: "Hi", introBody: "Body", ctaText: "CTA" },
    about: { sectionTag: "Tag", heading: "H", imageUrl: "/img.jpg", paragraphs: [], signoff: "J" },
    howItWorks: { sectionTag: "Tag", heading: "H", steps: [] },
    readingsSection: { sectionTag: "Tag", heading: "H", subheading: "Sub" },
    testimonialsSection: { sectionTag: "Tag", heading: "H" },
    contactSection: { sectionTag: "Tag", heading: "H", description: "D", submitText: "Send" },
    ...overrides,
  };
}

async function loadGenerateMetadata() {
  const mod = await import("./page");
  return mod.generateMetadata;
}

beforeEach(() => {
  mockFetchLandingPage.mockReset();
});

describe("LandingPage generateMetadata", () => {
  it("uses Sanity SEO fields when present", async () => {
    mockFetchLandingPage.mockResolvedValue(
      landingPage({
        seo: {
          metaTitle: "Josephine — Astrology",
          metaDescription: "Your soul has patterns.",
        },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Josephine — Astrology");
    expect(metadata.description).toBe("Your soul has patterns.");
  });

  it("falls back to defaults when seo is missing", async () => {
    mockFetchLandingPage.mockResolvedValue(landingPage());

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.title).toBe("Josephine — Soul Readings");
  });

  it("includes ogImage in openGraph when seo has it", async () => {
    mockFetchLandingPage.mockResolvedValue(
      landingPage({
        seo: {
          metaTitle: "Josephine",
          metaDescription: "Desc",
          ogImage: { asset: { url: "https://cdn.sanity.io/images/og.jpg" } },
        },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.openGraph).toEqual(
      expect.objectContaining({
        images: [{ url: "https://cdn.sanity.io/images/og.jpg" }],
      }),
    );
  });

  it("omits openGraph.images when no ogImage is set", async () => {
    mockFetchLandingPage.mockResolvedValue(
      landingPage({
        seo: { metaTitle: "Josephine", metaDescription: "Desc" },
      }),
    );

    const generateMetadata = await loadGenerateMetadata();
    const metadata = await generateMetadata();

    expect(metadata.openGraph?.images).toBeUndefined();
  });
});
