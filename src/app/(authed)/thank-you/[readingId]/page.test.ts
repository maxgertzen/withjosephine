import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ThankYouViewProps } from "./ThankYouView";

type ThankYouRendered = { props: ThankYouViewProps };

vi.mock("@/lib/sanity/fetch", () => ({
  fetchThankYouPage: vi.fn(),
  fetchReading: vi.fn(),
  fetchReadingSlugs: vi.fn(),
  fetchSiteSettings: vi.fn(),
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

vi.mock("@/lib/stripe", () => ({
  retrieveCheckoutSession: vi.fn(),
}));

vi.mock("@/lib/booking/submissions", () => ({
  findSubmissionById: vi.fn(),
}));

import { findSubmissionById } from "@/lib/booking/submissions";
import { fetchReading, fetchThankYouPage } from "@/lib/sanity/fetch";
import type { SanityReading, SanityThankYouPage } from "@/lib/sanity/types";
import { retrieveCheckoutSession } from "@/lib/stripe";

const mockFetchThankYouPage = vi.mocked(fetchThankYouPage);
const mockFetchReading = vi.mocked(fetchReading);
const mockRetrieveSession = vi.mocked(retrieveCheckoutSession);
const mockFindSubmission = vi.mocked(findSubmissionById);

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
  mockRetrieveSession.mockReset();
  mockFindSubmission.mockReset();
  mockRetrieveSession.mockResolvedValue({ amount_total: null, currency: null } as never);
  mockFindSubmission.mockResolvedValue(null);
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

async function callPage(
  searchParamValue: {
    sessionId?: string | string[];
    gift?: string | string[];
    redeemed?: string | string[];
    purchaserFirstName?: string | string[];
  } = {},
) {
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

describe("ThankYouPage paid amount", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
    mockFetchThankYouPage.mockResolvedValue(thankYouPage());
  });

  it("passes a paid amount strictly below the list price (discount UI eligible)", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 9900,
      currency: "usd",
    } as never);
    const result = (await callPage({ sessionId: "cs_test_abc123" })) as ThankYouRendered;
    expect(result.props.reading.cents).toBe(17900);
    expect(result.props.paidAmount.cents).toBe(9900);
    expect(result.props.paidAmount.display).toBe("$99.00");
  });

  it("passes an equal paid amount (no discount UI)", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 17900,
      currency: "usd",
    } as never);
    const result = (await callPage({ sessionId: "cs_test_abc123" })) as ThankYouRendered;
    expect(result.props.paidAmount.cents).toBe(17900);
    expect(result.props.paidAmount.display).toBe("$179.00");
  });

  it("passes a paid amount higher than list (Stripe / Sanity drift; no discount)", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 22900,
      currency: "usd",
    } as never);
    const result = (await callPage({ sessionId: "cs_test_abc123" })) as ThankYouRendered;
    expect(result.props.paidAmount.cents).toBe(22900);
    expect(result.props.reading.cents).toBe(17900);
  });

  it("passes null paid amount when Stripe amount_total is null", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: null,
      currency: null,
    } as never);
    const result = (await callPage({ sessionId: "cs_test_abc123" })) as ThankYouRendered;
    expect(result.props.paidAmount.cents).toBeNull();
    expect(result.props.paidAmount.display).toBeNull();
    expect(result.props.reading.price).toBe("$179");
  });

  it("passes null paid amount when the Stripe API throws (fail-safe)", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const result = (await callPage({ sessionId: "cs_test_abc123" })) as ThankYouRendered;
    expect(result.props.paidAmount.cents).toBeNull();
    expect(result.props.reading.price).toBe("$179");
  });
});

describe("ThankYouPage gift-mode resolution (B-2)", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        heading: "Thank you for booking",
        giftPurchaserHeading: "Thank you, {purchaserFirstName}. Your gift is on its way.",
      }),
    );
  });

  it("resolves to gift mode when session.metadata is null but submission.isGift is true", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 9900,
      currency: "usd",
      client_reference_id: "sub_real_gift",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_real_gift",
      status: "paid",
      isGift: true,
      responses: [
        {
          fieldKey: "purchaser_first_name",
          fieldLabelSnapshot: "Purchaser",
          fieldType: "shortText",
          value: "Max",
        },
      ],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_realgift1" });
    const html = JSON.stringify(result);
    expect(html).toContain("Your gift is on its way");
    expect(html).not.toContain("Thank you for booking");
  });

  it("still resolves to purchase mode when submission.isGift is false", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 17900,
      currency: "usd",
      client_reference_id: "sub_purchase",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_purchase",
      status: "paid",
      isGift: false,
      responses: [],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_purchasenongift1" });
    const html = JSON.stringify(result);
    expect(html).toContain("Thank you for booking");
    expect(html).not.toContain("Your gift is on its way");
  });

  it("falls back to purchase mode when submission lookup returns null (graceful)", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 9900,
      currency: "usd",
      client_reference_id: "sub_missing",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue(null);
    const result = await callPage({ sessionId: "cs_test_nosub1" });
    const html = JSON.stringify(result);
    expect(html).toContain("Thank you for booking");
    expect(html).not.toContain("Your gift is on its way");
  });
});

describe("ThankYouPage gift-aware timeline + contact bodies (C-10)", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
  });

  it("renders the gift-purchaser timeline body (not the non-gift default) when mode is gift-purchaser", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        timelineBody: "I'll begin YOUR reading within the next two days.",
        giftPurchaserTimelineBody:
          "I'll begin THE RECIPIENT'S reading within two days of them claiming the gift.",
      }),
    );
    mockRetrieveSession.mockResolvedValue({
      amount_total: 9900,
      currency: "usd",
      client_reference_id: "sub_gift_purchaser_t",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_gift_purchaser_t",
      status: "paid",
      isGift: true,
      responses: [
        {
          fieldKey: "purchaser_first_name",
          fieldLabelSnapshot: "Purchaser",
          fieldType: "shortText",
          value: "Yoram",
        },
      ],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_giftpurch1" });
    const html = JSON.stringify(result);
    expect(html).toContain("THE RECIPIENT'S reading");
    expect(html).not.toContain("YOUR reading within the next two days");
  });

  it("renders the gift-purchaser contact body when mode is gift-purchaser", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        contactBody: "Just reply or write to {email} — non-gift default.",
        giftPurchaserContactBody:
          "If anything comes up with the gift, write to {email}.",
      }),
    );
    mockRetrieveSession.mockResolvedValue({
      amount_total: 9900,
      currency: "usd",
      client_reference_id: "sub_gift_purchaser_c",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_gift_purchaser_c",
      status: "paid",
      isGift: true,
      responses: [
        {
          fieldKey: "purchaser_first_name",
          fieldLabelSnapshot: "Purchaser",
          fieldType: "shortText",
          value: "Yoram",
        },
      ],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_giftpurch2" });
    const html = JSON.stringify(result);
    expect(html).toContain("anything comes up with the gift");
    expect(html).not.toContain("non-gift default");
  });

  it("recipient mode still uses giftRecipientBody for the timeline paragraph", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        timelineBody: "BUYER default.",
        giftRecipientBody:
          "RECIPIENT body — I'll begin your reading within two days.",
      }),
    );
    const result = await callPage({ gift: "1", redeemed: "1" });
    const html = JSON.stringify(result);
    expect(html).toContain("RECIPIENT body");
    expect(html).not.toContain("BUYER default");
  });

  it("non-gift purchase still uses the standard timelineBody (regression guard)", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        timelineBody: "Standard non-gift timeline copy.",
        giftPurchaserTimelineBody: "Should not appear.",
      }),
    );
    mockRetrieveSession.mockResolvedValue({
      amount_total: 17900,
      currency: "usd",
      client_reference_id: "sub_pure_purchase",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_pure_purchase",
      status: "paid",
      isGift: false,
      responses: [],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_purepurchase1" });
    const html = JSON.stringify(result);
    expect(html).toContain("Standard non-gift timeline copy");
    expect(html).not.toContain("Should not appear");
  });
});

describe("ThankYouPage per-reading overrides", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
    mockRetrieveSession.mockResolvedValue({ amount_total: null, currency: null } as never);
  });

  it("applies the matching override on top of the default page copy", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        heading: "Default heading",
        closingMessage: "Default closing",
        overrides: [
          {
            readingSlug: "soul-blueprint",
            heading: "Soul Blueprint heading",
            closingMessage: "Soul Blueprint closing",
          },
        ],
      }),
    );
    const result = await callPage({ sessionId: "cs_test_abc123" });
    const html = JSON.stringify(result);
    expect(html).toContain("Soul Blueprint heading");
    expect(html).toContain("Soul Blueprint closing");
    expect(html).not.toContain("Default heading");
    expect(html).not.toContain("Default closing");
  });

  it("falls back to the default for fields the override leaves empty", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        heading: "Default heading",
        closingMessage: "Default closing",
        overrides: [
          {
            readingSlug: "soul-blueprint",
            heading: "Soul Blueprint heading",
          },
        ],
      }),
    );
    const result = await callPage({ sessionId: "cs_test_abc123" });
    const html = JSON.stringify(result);
    expect(html).toContain("Soul Blueprint heading");
    expect(html).toContain("Default closing");
  });

  it("ignores overrides that target a different reading", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        heading: "Default heading",
        overrides: [
          { readingSlug: "birth-chart", heading: "Birth Chart heading" },
        ],
      }),
    );
    const result = await callPage({ sessionId: "cs_test_abc123" });
    const html = JSON.stringify(result);
    expect(html).toContain("Default heading");
    expect(html).not.toContain("Birth Chart heading");
  });
});
