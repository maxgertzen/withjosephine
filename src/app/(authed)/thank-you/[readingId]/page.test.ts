import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { GiftThankYouViewProps } from "./GiftThankYouView";
import type { ThankYouViewProps } from "./ThankYouView";

type ThankYouRendered = { props: ThankYouViewProps };

vi.mock("@/lib/sanity/fetch", () => ({
  fetchGiftSettings: vi.fn(),
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

vi.mock("@/lib/booking/submissions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/booking/submissions")>()),
  findSubmissionById: vi.fn(),
}));

vi.mock("@/lib/gift/giftThankYou", () => ({
  resolveGiftThankYou: vi.fn(),
}));

import { GIFT_DEFAULTS } from "@/data/defaults";
import { createSubmission } from "@/lib/booking/persistence/repository";
import { dbExec } from "@/lib/booking/persistence/sqlClient";
import { findSubmissionById } from "@/lib/booking/submissions";
import { deriveGiftCode } from "@/lib/gift/giftCode";
import { formatGiftCode } from "@/lib/gift/giftCodeFormat";
import { markGiftActive } from "@/lib/gift/gifts";
import { type GiftThankYouResult, resolveGiftThankYou } from "@/lib/gift/giftThankYou";
import {
  fetchGiftSettings,
  fetchReading,
  fetchSiteSettings,
  fetchThankYouPage,
} from "@/lib/sanity/fetch";
import type { SanityReading, SanityThankYouPage } from "@/lib/sanity/types";
import { retrieveCheckoutSession } from "@/lib/stripe";
import { captureConsole } from "@/test/captureConsole";
import { createTestGift, forceGiftStatus } from "@/test/fixtures/gift";

const mockFetchThankYouPage = vi.mocked(fetchThankYouPage);
const mockFetchReading = vi.mocked(fetchReading);
const mockFetchSiteSettings = vi.mocked(fetchSiteSettings);
const mockRetrieveSession = vi.mocked(retrieveCheckoutSession);
const mockFindSubmission = vi.mocked(findSubmissionById);
const mockFetchGiftSettings = vi.mocked(fetchGiftSettings);
const mockResolveGift = vi.mocked(resolveGiftThankYou);

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
    includes: [],
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
  mockFetchSiteSettings.mockReset();
  mockRetrieveSession.mockReset();
  mockFindSubmission.mockReset();
  mockRetrieveSession.mockResolvedValue({ amount_total: null, currency: null } as never);
  mockFindSubmission.mockResolvedValue(null);
  mockFetchGiftSettings.mockReset().mockResolvedValue(null);
  mockResolveGift.mockReset().mockResolvedValue(null);
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
    submissionId?: string | string[];
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

describe("ThankYouPage unknown reading", () => {
  it("returns not found before fetching the page copy", async () => {
    mockFetchReading.mockResolvedValue(null);
    const Page = await loadDefault();

    await expect(
      Page({
        params: Promise.resolve({ readingId: "no-such-reading" }),
        searchParams: Promise.resolve({ sessionId: "cs_test_abc123" }),
      }),
    ).rejects.toThrow("__notfound__");
    expect(mockFetchThankYouPage).not.toHaveBeenCalled();
    expect(mockFetchSiteSettings).not.toHaveBeenCalled();
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

  it("throws when the Stripe session is unavailable, so the error boundary renders", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(callPage({ sessionId: "cs_test_abc123" })).rejects.toThrow(
      "Stripe session unavailable",
    );
    expect(mockFetchThankYouPage).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it("keeps the session id out of the thrown error", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const error = await callPage({ sessionId: "cs_test_abc123" }).catch((caught: Error) => caught);
    expect(String((error as Error).message)).not.toContain("cs_test_abc123");
  });
});

describe("ThankYouPage purchase-mode resolution (B-2)", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        heading: "Thank you for booking",
      }),
    );
  });

  it("resolves to purchase mode for a paid session", async () => {
    mockRetrieveSession.mockResolvedValue({
      amount_total: 17900,
      currency: "usd",
      client_reference_id: "sub_purchase",
      metadata: null,
    } as never);
    mockFindSubmission.mockResolvedValue({
      _id: "sub_purchase",
      status: "paid",
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

describe("ThankYouPage timeline body (C-10)", () => {
  beforeEach(() => {
    mockFetchReading.mockResolvedValue(reading());
  });

  it("purchase mode uses the standard timelineBody", async () => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({
        timelineBody: "Standard timeline copy.",
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
      responses: [],
      reading: { slug: "soul-blueprint", name: "Soul Blueprint", priceDisplay: "$179" },
    } as never);
    const result = await callPage({ sessionId: "cs_test_purepurchase1" });
    const html = JSON.stringify(result);
    expect(html).toContain("Standard timeline copy");
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

describe("ThankYouPage gift branch", () => {
  const SESSION_ID = "cs_test_giftsession1";
  const SHOWN = {
    giftId: "11111111-2222-4333-8444-555555555555",
    readingSlug: "birth-chart",
    buyerFirstName: "Dana",
    displayCode: "K7M2-QX9P-H4TR",
    giftUrl: "https://withjosephine.com/gift/K7M2QX9PH4TR",
  };
  const ACTIVE: GiftThankYouResult = {
    kind: "active",
    ...SHOWN,
    note: "Happy birthday",
    sendToken: "send-token",
    sendStatus: { state: "ready", buyerName: "Dana", hasNote: true, recipientName: null },
  };

  type Rendered = { type: unknown; props: GiftThankYouViewProps };

  let capturedConsole: ReturnType<typeof captureConsole>;

  async function realResolveGiftThankYou() {
    const actual = await vi.importActual<typeof import("@/lib/gift/giftThankYou")>(
      "@/lib/gift/giftThankYou",
    );
    mockResolveGift.mockImplementationOnce(actual.resolveGiftThankYou);
  }

  async function createGiftPaidBy(sessionId: string): Promise<string> {
    const giftId = await createTestGift();
    await markGiftActive(giftId, {
      buyerEmail: "buyer@example.com",
      stripeSessionId: sessionId,
      activatedAt: "2026-10-01T10:05:00.000Z",
    });
    return giftId;
  }

  beforeEach(() => {
    vi.stubEnv("GIFT_CODE_SECRET", "test-gift-code-secret");
    mockFetchReading.mockResolvedValue(reading({ name: "Birth Chart Reading", slug: "birth-chart" }));
    mockFetchThankYouPage.mockResolvedValue(thankYouPage());
    mockRetrieveSession.mockResolvedValue({ amount_total: 8900, currency: "usd" } as never);
    capturedConsole = captureConsole();
  });

  afterEach(() => {
    expect(capturedConsole.text()).not.toMatch(/cs_/);
    vi.restoreAllMocks();
  });

  it("renders the active gift view with the note and send token, read from the gift's reading", async () => {
    mockResolveGift.mockResolvedValueOnce(ACTIVE);
    const result = (await callPage({ sessionId: SESSION_ID })) as Rendered;

    expect(result.type).toBe((await import("./GiftThankYouView")).GiftThankYouView);
    expect(result.props).toMatchObject({
      state: "active",
      displayCode: SHOWN.displayCode,
      giftUrl: SHOWN.giftUrl,
      note: { buyerFirstName: "Dana", text: "Happy birthday" },
      noteEdit: { token: "send-token" },
      send: {
        token: "send-token",
        status: { state: "ready", buyerName: "Dana", hasNote: true, recipientName: null },
      },
    });
    expect(result.props.copy.codeHelp).toBe("For the Birth Chart Reading. It does not expire.");
    expect(mockResolveGift).toHaveBeenCalledWith(SESSION_ID, expect.objectContaining({ kind: "ok" }));
    expect(mockFetchReading).toHaveBeenCalledWith("birth-chart");
    expect(mockFetchThankYouPage).not.toHaveBeenCalled();
  });

  it("reuses the route reading when the gift is for the same reading", async () => {
    mockResolveGift.mockResolvedValueOnce({ ...ACTIVE, readingSlug: "soul-blueprint" });
    await callPage({ sessionId: SESSION_ID });

    expect(mockFetchReading).toHaveBeenCalledTimes(1);
  });

  it("renders a redeemed gift without note editing or sending", async () => {
    mockResolveGift.mockResolvedValueOnce({ kind: "redeemed", ...SHOWN });
    const result = (await callPage({ sessionId: SESSION_ID })) as Rendered;

    expect(result.props.state).toBe("redeemed");
    expect(result.props).not.toHaveProperty("noteEdit");
    expect(result.props).not.toHaveProperty("send");
  });

  it("renders the pending card for an unpaid gift session", async () => {
    mockResolveGift.mockResolvedValueOnce({
      kind: "not_paid",
      readingSlug: "birth-chart",
      buyerFirstName: "Dana",
    });
    const result = (await callPage({ sessionId: SESSION_ID })) as Rendered;

    expect(result.props).toMatchObject({ state: "pending_payment" });
    expect(result.props).not.toHaveProperty("displayCode");
  });

  it("keeps the reading view when the session is not a gift", async () => {
    const result = (await callPage({ sessionId: SESSION_ID })) as Rendered;
    expect(result.type).toBe((await import("./ThankYouView")).ThankYouView);
    expect(mockFetchGiftSettings).not.toHaveBeenCalled();
  });

  it("renders the gift view from D1 when Stripe is unavailable", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    const giftId = await createGiftPaidBy(SESSION_ID);
    await realResolveGiftThankYou();

    const result = (await callPage({ sessionId: SESSION_ID })) as Rendered;

    expect(result.props).toMatchObject({
      state: "active",
      displayCode: formatGiftCode(await deriveGiftCode(giftId)),
    });
  });

  it("throws without the session id when Stripe is unavailable and no gift matches", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    await realResolveGiftThankYou();

    const error = await callPage({ sessionId: SESSION_ID }).catch((caught: Error) => caught);

    expect((error as Error).message).toBe("Stripe session unavailable");
  });

  it("reaches the error boundary for a cancelled gift and renders no gift view", async () => {
    mockRetrieveSession.mockRejectedValue(new Error("stripe down"));
    const giftId = await createGiftPaidBy(SESSION_ID);
    await forceGiftStatus(giftId, "cancelled");
    await realResolveGiftThankYou();

    await expect(callPage({ sessionId: SESSION_ID })).rejects.toThrow("is cancelled");
    expect(mockFetchGiftSettings).not.toHaveBeenCalled();
    expect(notFoundMock).not.toHaveBeenCalled();
  });

  it.each(["not found for its thank-you page", "has no verifiable code"])(
    "reaches the error boundary when the loader throws (%s)",
    async (reason) => {
      mockResolveGift.mockRejectedValueOnce(new Error(`Gift ${SHOWN.giftId} ${reason}`));

      await expect(callPage({ sessionId: SESSION_ID })).rejects.toThrow(reason);
      expect(mockFetchGiftSettings).not.toHaveBeenCalled();
      expect(mockFetchThankYouPage).not.toHaveBeenCalled();
    },
  );
});

describe("ThankYouPage recipient gift branch", () => {
  const GIFT_SUBMISSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
  const BOOKING_SUBMISSION_ID = "aaaaaaaa-bbbb-4ccc-8ddd-ffffffffffff";

  type Rendered = { type: unknown; props: ThankYouViewProps };

  async function createSubmissionRow(
    id: string,
    readingName: string | null = "Birth Chart Reading",
  ) {
    await createSubmission({
      id,
      email: "anna@example.com",
      status: "paid",
      readingSlug: "birth-chart",
      readingName,
      readingPriceDisplay: null,
      responses: [
        {
          fieldKey: "first_name",
          fieldLabelSnapshot: "First name",
          fieldType: "shortText",
          value: "Anna",
        },
      ],
      consentLabel: "I agree",
      photoR2Key: null,
      createdAt: "2026-10-02T10:00:00.000Z",
      paidAt: "2026-10-02T10:00:00.000Z",
    });
  }

  async function createGiftSubmission(
    buyerFirstName = "Dana",
    readingName: string | null = "Birth Chart Reading",
  ) {
    const giftId = await createTestGift({ buyerFirstName });
    await createSubmissionRow(GIFT_SUBMISSION_ID, readingName);
    await dbExec(`UPDATE submissions SET gift_code_id = ? WHERE id = ?`, [
      giftId,
      GIFT_SUBMISSION_ID,
    ]);
  }

  beforeEach(() => {
    mockFetchThankYouPage.mockResolvedValue(
      thankYouPage({ closingMessage: "With love, Josephine" }),
    );
    mockFetchReading.mockResolvedValue(
      reading({ name: "Birth Chart Reading", slug: "birth-chart" }),
    );
  });

  it("renders ThankYouView with the gift icon, no price and the gift copy", async () => {
    await createGiftSubmission();

    const result = (await callPage({ submissionId: GIFT_SUBMISSION_ID })) as Rendered;

    expect(result.type).toBe((await import("./ThankYouView")).ThankYouView);
    expect(result.props.icon).toBe("gift");
    expect(result.props.reading).toEqual({ name: "Birth Chart Reading", price: null, cents: null });
    expect(result.props.paidAmount).toEqual({ cents: null, display: null });
    expect(result.props.copy).toMatchObject({
      heading: "Thank you, Anna. Your reading is in my hands now.",
      subheading: GIFT_DEFAULTS.recipientThankYouSubheading,
      readingLabel: "Your gift, from Dana",
      timelineBody: GIFT_DEFAULTS.recipientThankYouTimelineTemplate,
      closingMessage: "With love, Josephine",
    });
    expect(mockRetrieveSession).not.toHaveBeenCalled();
    expect(mockResolveGift).not.toHaveBeenCalled();
  });

  it("uses the no-buyer card label after the buyer name was erased", async () => {
    await createGiftSubmission("");

    const result = (await callPage({ submissionId: GIFT_SUBMISSION_ID })) as Rendered;

    expect(result.props.copy.readingLabel).toBe(GIFT_DEFAULTS.recipientThankYouCardLabelNoBuyer);
  });

  it("takes the reading name from Sanity when the row has none", async () => {
    await createGiftSubmission("Dana", null);

    const result = (await callPage({ submissionId: GIFT_SUBMISSION_ID })) as Rendered;

    expect(result.props.reading.name).toBe("Birth Chart Reading");
    expect(mockFetchReading).toHaveBeenCalledWith("birth-chart");
  });

  it("redirects a booking submission id to '/'", async () => {
    await createSubmissionRow(BOOKING_SUBMISSION_ID);

    await expect(callPage({ submissionId: BOOKING_SUBMISSION_ID })).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });

  it("redirects an unknown submission id to '/'", async () => {
    await expect(callPage({ submissionId: "no-such-submission" })).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
    expect(mockFetchThankYouPage).not.toHaveBeenCalled();
  });

  it("redirects a submissionId given twice to '/'", async () => {
    await expect(
      callPage({ submissionId: [GIFT_SUBMISSION_ID, GIFT_SUBMISSION_ID] }),
    ).rejects.toThrow("__redirect__");
    expect(redirectMock).toHaveBeenCalledWith("/");
  });
});
