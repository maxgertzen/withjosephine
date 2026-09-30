import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({ fetchLegalPage: vi.fn() }));

import { buildLegalMetadata, type LegalPageFallback } from "@/lib/legalPage";

const fallback: LegalPageFallback = {
  tag: "Legal",
  title: "Privacy Policy",
  lastUpdated: "2026-05-09",
  metaTitle: "Privacy Policy | Josephine Soul Readings",
  metaDescription: "How your data is handled.",
};

describe("buildLegalMetadata", () => {
  it("keeps legal pages out of search results while letting crawlers follow their links", async () => {
    const metadata = await buildLegalMetadata("privacy", fallback, async () => null);
    expect(metadata.robots).toEqual({ index: false, follow: true });
    expect(metadata.title).toBe(fallback.metaTitle);
  });
});
