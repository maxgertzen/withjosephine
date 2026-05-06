import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/booking/cron-auth", () => ({
  isCronRequestAuthorized: vi.fn(),
}));

vi.mock("@/lib/sanity/fetch", () => ({
  fetchReadings: vi.fn(),
}));

vi.mock("@/lib/analytics/server", () => ({
  serverTrack: vi.fn(),
  generateAnonymousDistinctId: vi.fn(() => "anon-cron-1"),
}));

import { serverTrack } from "@/lib/analytics/server";
import { isCronRequestAuthorized } from "@/lib/booking/cron-auth";
import { fetchReadings } from "@/lib/sanity/fetch";
import type { SanityReading } from "@/lib/sanity/types";

const mockAuth = vi.mocked(isCronRequestAuthorized);
const mockFetch = vi.mocked(fetchReadings);
const mockTrack = vi.mocked(serverTrack);

function makeReading(over: Partial<SanityReading>): SanityReading {
  return {
    _id: over._id ?? "reading-x",
    name: over.name ?? "Reading X",
    slug: over.slug ?? "reading-x",
    tag: "Tag",
    subtitle: "Subtitle",
    price: over.price ?? 12900,
    priceDisplay: over.priceDisplay ?? "$129",
    valueProposition: "vp",
    briefDescription: "bd",
    expandedDetails: [],
    includes: [],
    bookingSummary: "bs",
    requiresBirthChart: false,
    requiresAkashic: false,
    requiresQuestions: false,
  } as SanityReading;
}

beforeEach(() => {
  mockAuth.mockReset();
  mockFetch.mockReset().mockResolvedValue([]);
  mockTrack.mockReset().mockResolvedValue(undefined);
});

async function callRoute(): Promise<Response> {
  const { POST } = await import("../route");
  return POST(new Request("http://localhost/api/cron/check-price-drift", { method: "POST" }));
}

describe("/api/cron/check-price-drift", () => {
  it("returns 401 when unauthorized", async () => {
    mockAuth.mockReturnValueOnce(false);
    const res = await callRoute();
    expect(res.status).toBe(401);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("fires no events when every reading agrees with its priceDisplay", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce([
      makeReading({ slug: "soul-blueprint", price: 12900, priceDisplay: "$129" }),
      makeReading({ slug: "birth-chart", price: 9900, priceDisplay: "$99" }),
      makeReading({ slug: "akashic-record", price: 7900, priceDisplay: "$79" }),
    ]);

    const res = await callRoute();
    const body = (await res.json()) as { checked: number; drift_count: number };

    expect(res.status).toBe(200);
    expect(body).toEqual({ checked: 3, drift_count: 0 });
    expect(mockTrack).not.toHaveBeenCalled();
  });

  it("fires pricing_drift_detected for each drifty reading", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce([
      makeReading({ slug: "soul-blueprint", price: 17900, priceDisplay: "$129" }),
      makeReading({ slug: "birth-chart", price: 9900, priceDisplay: "$89" }),
      makeReading({ slug: "akashic-record", price: 7900, priceDisplay: "$79" }),
    ]);

    const res = await callRoute();
    const body = (await res.json()) as { checked: number; drift_count: number };

    expect(res.status).toBe(200);
    expect(body).toEqual({ checked: 3, drift_count: 2 });
    expect(mockTrack).toHaveBeenCalledTimes(2);
    expect(mockTrack).toHaveBeenNthCalledWith(1, "pricing_drift_detected", {
      distinct_id: "anon-cron-1",
      reading_slug: "soul-blueprint",
      price_cents: 17900,
      price_display: "$129",
      parsed_display_cents: 12900,
    });
    expect(mockTrack).toHaveBeenNthCalledWith(2, "pricing_drift_detected", {
      distinct_id: "anon-cron-1",
      reading_slug: "birth-chart",
      price_cents: 9900,
      price_display: "$89",
      parsed_display_cents: 8900,
    });
  });

  it("treats malformed priceDisplay as drift with parsed_display_cents=null", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce([
      makeReading({ slug: "soul-blueprint", price: 12900, priceDisplay: "129" }),
    ]);

    const res = await callRoute();
    const body = (await res.json()) as { drift_count: number };

    expect(body.drift_count).toBe(1);
    expect(mockTrack).toHaveBeenCalledWith("pricing_drift_detected", {
      distinct_id: "anon-cron-1",
      reading_slug: "soul-blueprint",
      price_cents: 12900,
      price_display: "129",
      parsed_display_cents: null,
    });
  });

  it("uses the same anonymous distinct_id across all events in one run", async () => {
    mockAuth.mockReturnValueOnce(true);
    mockFetch.mockResolvedValueOnce([
      makeReading({ slug: "a", price: 1000, priceDisplay: "$11" }),
      makeReading({ slug: "b", price: 2000, priceDisplay: "$22" }),
    ]);

    await callRoute();

    expect(mockTrack).toHaveBeenCalledTimes(2);
    const ids = mockTrack.mock.calls.map((c) => (c[1] as { distinct_id: string }).distinct_id);
    expect(new Set(ids).size).toBe(1);
  });
});
