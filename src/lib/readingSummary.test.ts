import { describe, expect, it, vi } from "vitest";

import { getReadingById } from "@/data/readings";

import { resolveReadingName, type SanityReadingFetcher } from "./readingSummary";
import type { SanityReading } from "./sanity/types";

describe("resolveReadingName", () => {
  it("uses the Sanity reading name", async () => {
    const fetcher = vi.fn<SanityReadingFetcher>().mockResolvedValue({
      name: "Birth Chart Reading",
    } as SanityReading);
    expect(await resolveReadingName("birth-chart", fetcher)).toBe("Birth Chart Reading");
    expect(fetcher).toHaveBeenCalledWith("birth-chart");
  });

  it("falls back to the bundled reading name when Sanity fails", async () => {
    const fetcher = vi.fn<SanityReadingFetcher>().mockRejectedValue(new Error("sanity down"));
    expect(await resolveReadingName("birth-chart", fetcher)).toBe(
      getReadingById("birth-chart")?.name,
    );
  });

  it("falls back to the slug for a reading nobody knows", async () => {
    const fetcher = vi.fn<SanityReadingFetcher>().mockResolvedValue(null);
    expect(await resolveReadingName("unknown-reading", fetcher)).toBe("unknown-reading");
  });
});
