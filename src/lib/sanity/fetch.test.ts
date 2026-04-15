import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchLandingPage,
  fetchReadings,
  fetchReading,
  fetchReadingSlugs,
  fetchTestimonials,
  fetchFaqItems,
  fetchSiteSettings,
  fetchBookingPage,
  fetchThankYouPage,
  fetchTheme,
  fetchLegalPage,
} from "./fetch";

// `sanityFetch` is the boundary — `defineLive` itself is exercised by Sanity's
// own tests, so we just verify our wrappers pass the right query/params and
// unwrap `.data` for callers.
vi.mock("./live", () => ({
  sanityFetch: vi.fn(),
}));

// `fetchReadingSlugs` skips `sanityFetch` (it runs at build time inside
// `generateStaticParams`, where `draftMode()` is unavailable) and hits the raw
// client directly. Mock that too.
vi.mock("./client", () => ({
  sanityClient: { fetch: vi.fn() },
}));

import { sanityFetch } from "./live";
import { sanityClient } from "./client";
const mockFetch = vi.mocked(sanityFetch);
const mockRawFetch = vi.mocked(sanityClient).fetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockFetch.mockReset();
  mockRawFetch.mockReset();
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
    const data = { emailLabel: "Email", paymentButtonText: "Pay" };
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

  it("fetchLegalPage passes slug parameter", async () => {
    const data = { _id: "1", title: "Privacy", slug: "privacy" };
    mockData(data);
    expect(await fetchLegalPage("privacy")).toEqual(data);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.objectContaining({ params: { slug: "privacy" } }),
    );
  });
});
