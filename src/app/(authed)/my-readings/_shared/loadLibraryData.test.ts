import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/listenSession", () => ({
  COOKIE_NAME: "__Host-listen_session",
  getActiveSession: vi.fn(),
}));
vi.mock("@/lib/booking/submissions", () => ({
  listSubmissionsByRecipientUserId: vi.fn().mockResolvedValue([]),
  listGiftsByPurchaserUserId: vi.fn().mockResolvedValue([]),
}));
vi.mock("@/lib/sanity/fetch", () => ({
  fetchMyReadingsPage: vi.fn(),
  fetchMyGiftsPage: vi.fn(),
}));
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ get: () => undefined })),
}));

import { MY_GIFTS_PAGE_DEFAULTS, MY_READINGS_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchMyGiftsPage, fetchMyReadingsPage } from "@/lib/sanity/fetch";

import { loadLibraryData } from "./loadLibraryData";

const fetchReadingsCopyMock = vi.mocked(fetchMyReadingsPage);
const fetchGiftsCopyMock = vi.mocked(fetchMyGiftsPage);

beforeEach(() => {
  fetchReadingsCopyMock.mockReset();
  fetchGiftsCopyMock.mockReset();
});

describe("loadLibraryData null-merge defense", () => {
  it("preserves default section headings when Sanity returns null for those fields", async () => {
    fetchReadingsCopyMock.mockResolvedValue({
      readingsTabLabel: null,
      giftsTabLabel: null,
    } as unknown as Awaited<ReturnType<typeof fetchMyReadingsPage>>);
    fetchGiftsCopyMock.mockResolvedValue(null);

    const data = await loadLibraryData({ justSent: false });

    expect(data.readingsCopy.readingsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.readingsTabLabel);
    expect(data.readingsCopy.giftsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.giftsTabLabel);
  });

  it("preserves all gift-page defaults when Sanity gift-page fetch returns an all-null shape", async () => {
    fetchReadingsCopyMock.mockResolvedValue(null);
    const allNullGifts = Object.fromEntries(
      Object.keys(MY_GIFTS_PAGE_DEFAULTS).map((key) => [key, null]),
    );
    fetchGiftsCopyMock.mockResolvedValue(allNullGifts as unknown as Awaited<ReturnType<typeof fetchMyGiftsPage>>);

    const data = await loadLibraryData({ justSent: false });

    for (const key of Object.keys(MY_GIFTS_PAGE_DEFAULTS) as Array<keyof typeof MY_GIFTS_PAGE_DEFAULTS>) {
      expect(data.giftsCopy[key]).toEqual(MY_GIFTS_PAGE_DEFAULTS[key]);
    }
  });

  it("real Becky edits still override defaults (non-null values win)", async () => {
    fetchReadingsCopyMock.mockResolvedValue({
      readingsTabLabel: "My Readings (edited)",
      giftsTabLabel: null,
    } as unknown as Awaited<ReturnType<typeof fetchMyReadingsPage>>);
    fetchGiftsCopyMock.mockResolvedValue(null);

    const data = await loadLibraryData({ justSent: false });

    expect(data.readingsCopy.readingsTabLabel).toBe("My Readings (edited)");
    expect(data.readingsCopy.giftsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.giftsTabLabel);
  });
});
