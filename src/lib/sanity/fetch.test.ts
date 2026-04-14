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
} from "./fetch";

vi.mock("./client", () => ({
  sanityClient: {
    fetch: vi.fn(),
  },
}));

import { sanityClient } from "./client";

const mockFetch = vi.mocked(sanityClient.fetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("Sanity fetch layer", () => {
  it("fetchLandingPage returns the first landingPage document", async () => {
    const mockData = { hero: { tagline: "Test" } };
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchLandingPage();

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledOnce();
  });

  it("fetchReadings returns an array of readings", async () => {
    const mockData = [{ _id: "1", name: "Test Reading", slug: "test" }];
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchReadings();

    expect(result).toEqual(mockData);
    expect(result).toHaveLength(1);
  });

  it("fetchReading passes slug parameter", async () => {
    const mockData = { _id: "1", name: "Soul Blueprint", slug: "soul-blueprint" };
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchReading("soul-blueprint");

    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith(expect.any(String), { slug: "soul-blueprint" });
  });

  it("fetchReadingSlugs returns slug array", async () => {
    const mockData = [{ slug: "soul-blueprint" }, { slug: "birth-chart" }];
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchReadingSlugs();

    expect(result).toEqual(mockData);
    expect(result).toHaveLength(2);
  });

  it("fetchTestimonials returns an array", async () => {
    mockFetch.mockResolvedValue([]);

    const result = await fetchTestimonials();

    expect(result).toEqual([]);
  });

  it("fetchFaqItems returns an array", async () => {
    mockFetch.mockResolvedValue([]);

    const result = await fetchFaqItems();

    expect(result).toEqual([]);
  });

  it("fetchSiteSettings returns singleton or null", async () => {
    mockFetch.mockResolvedValue(null);

    const result = await fetchSiteSettings();

    expect(result).toBeNull();
  });

  it("fetchBookingPage returns singleton or null", async () => {
    const mockData = { emailLabel: "Email", paymentButtonText: "Pay" };
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchBookingPage();

    expect(result).toEqual(mockData);
  });

  it("fetchThankYouPage returns singleton or null", async () => {
    mockFetch.mockResolvedValue(null);

    const result = await fetchThankYouPage();

    expect(result).toBeNull();
  });

  it("fetchTheme returns singleton or null", async () => {
    const mockData = { displayFont: "Inter", bodyFont: "Inter" };
    mockFetch.mockResolvedValue(mockData);

    const result = await fetchTheme();

    expect(result).toEqual(mockData);
  });
});
