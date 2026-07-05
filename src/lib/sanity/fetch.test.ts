import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  fetchBookingForm,
  fetchBookingPage,
  fetchEmailDay7Delivery,
  fetchEmailMagicLink,
  fetchEmailOrderConfirmation,
  fetchEmailPrivacyExport,
  fetchEmailSharedShell,
  fetchFaqItems,
  fetchLandingPage,
  fetchLegalPage,
  fetchReading,
  fetchReadings,
  fetchReadingSlugs,
  fetchSiteSettings,
  fetchTestimonials,
  fetchThankYouPage,
  fetchTheme,
} from "./fetch";

// `sanityFetch` is the boundary — `defineLive` itself is exercised by Sanity's
// own tests, so we just verify our wrappers pass the right query/params and
// unwrap `.data` for callers.
vi.mock("./live", () => ({
  sanityFetch: vi.fn(),
}));

// `fetchReadingSlugs` skips `sanityFetch` (it runs at build time inside
// `generateStaticParams`, where `draftMode()` is unavailable) and hits the raw
// client directly. Email fetchers use `getSanityFreshReadClient`. Mock both.
const mockFreshFetch = vi.fn();
vi.mock("./client", () => ({
  sanityClient: { fetch: vi.fn() },
  getSanityFreshReadClient: vi.fn(async () => ({ fetch: mockFreshFetch })),
}));

import { sanityClient } from "./client";
import { sanityFetch } from "./live";
const mockFetch = vi.mocked(sanityFetch);
const mockRawFetch = vi.mocked(sanityClient).fetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch.mockReset();
  mockRawFetch.mockReset();
  mockFreshFetch.mockReset();
});

function mockData<T>(data: T) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFetch.mockResolvedValue({ data } as any);
}

describe("Sanity fetch layer", () => {
  it("fetchLandingPage returns the first landingPage document", async () => {
    const data = { hero: { tagline: "Test" } };
    mockData(data);
    expect(await fetchLandingPage()).toEqual(data);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("fetchReadings returns an array of readings", async () => {
    const data = [{ _id: "1", name: "Test Reading", slug: "test" }];
    mockData(data);
    const result = await fetchReadings();
    expect(result).toEqual(data);
    expect(result).toHaveLength(1);
  });

  it("fetchReadings returns [] when sanity returns null", async () => {
    mockData(null);
    expect(await fetchReadings()).toEqual([]);
  });

  it("fetchReading passes slug parameter", async () => {
    const data = { _id: "1", name: "Soul Blueprint", slug: "soul-blueprint" };
    mockData(data);
    const result = await fetchReading("soul-blueprint");
    expect(result).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ params: { slug: "soul-blueprint" } }),
    );
  });

  it("fetchReadingSlugs returns slug array (uses raw client at build time)", async () => {
    const data = [{ slug: "soul-blueprint" }, { slug: "birth-chart" }];
    mockRawFetch.mockResolvedValue(data);
    const result = await fetchReadingSlugs();
    expect(result).toEqual(data);
    expect(result).toHaveLength(2);
    expect(mockRawFetch).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("fetchReadingSlugs returns [] when sanity returns null", async () => {
    mockRawFetch.mockResolvedValue(null);
    expect(await fetchReadingSlugs()).toEqual([]);
  });

  it("fetchTestimonials returns an array", async () => {
    mockData([]);
    expect(await fetchTestimonials()).toEqual([]);
  });

  it("fetchFaqItems returns an array", async () => {
    mockData([]);
    expect(await fetchFaqItems()).toEqual([]);
  });

  it("fetchSiteSettings returns singleton or null", async () => {
    mockData(null);
    expect(await fetchSiteSettings()).toBeNull();
  });

  it("fetchBookingPage returns singleton or null", async () => {
    const data = { paymentButtonText: "Pay", deliveryNote: "Within 7 days." };
    mockData(data);
    expect(await fetchBookingPage()).toEqual(data);
  });

  it("fetchThankYouPage returns singleton or null", async () => {
    mockData(null);
    expect(await fetchThankYouPage()).toBeNull();
  });

  it("fetchTheme returns singleton or null", async () => {
    const data = { displayFont: "Inter", bodyFont: "Inter" };
    mockData(data);
    expect(await fetchTheme()).toEqual(data);
  });

  it("fetchBookingForm returns singleton or null", async () => {
    const data = { nonRefundableNotice: "no refund", sections: [] };
    mockData(data);
    expect(await fetchBookingForm()).toEqual(data);
  });

  it("fetchLegalPage passes slug parameter", async () => {
    const data = { _id: "1", title: "Privacy", slug: "privacy" };
    mockData(data);
    expect(await fetchLegalPage("privacy")).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ params: { slug: "privacy" } }),
    );
  });
});

// Regression: email copy is sent from cron/DO/webhook where `sanityFetch`'s
// live tag revalidation never runs and served a stale template (2026-07-05).
// These fetchers MUST use the fresh uncached client and never `sanityFetch`.
describe("email template fetchers use the fresh uncached client", () => {
  const cases = [
    ["fetchEmailDay7Delivery", fetchEmailDay7Delivery],
    ["fetchEmailOrderConfirmation", fetchEmailOrderConfirmation],
    ["fetchEmailMagicLink", fetchEmailMagicLink],
    ["fetchEmailPrivacyExport", fetchEmailPrivacyExport],
    ["fetchEmailSharedShell", fetchEmailSharedShell],
  ] as const;

  it.each(cases)("%s reads via the fresh client, not sanityFetch", async (_name, fetcher) => {
    const data = { subjectTemplate: "Your {readingName} is ready" };
    mockFreshFetch.mockResolvedValue(data);
    expect(await fetcher()).toEqual(data);
    expect(mockFreshFetch).toHaveBeenCalledOnce();
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
