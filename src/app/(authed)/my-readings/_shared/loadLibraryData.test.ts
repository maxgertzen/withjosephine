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

type ReadingsCopy = Awaited<ReturnType<typeof fetchMyReadingsPage>>;
type GiftsCopy = Awaited<ReturnType<typeof fetchMyGiftsPage>>;

const mockReadings = (value: unknown) =>
  fetchReadingsCopyMock.mockResolvedValue(value as ReadingsCopy);
const mockGifts = (value: unknown) =>
  fetchGiftsCopyMock.mockResolvedValue(value as GiftsCopy);

beforeEach(() => {
  fetchReadingsCopyMock.mockReset();
  fetchGiftsCopyMock.mockReset();
});

describe("loadLibraryData null-merge defense", () => {
  it("preserves default section headings when Sanity returns null for those fields", async () => {
    mockReadings({ readingsTabLabel: null, giftsTabLabel: null });
    mockGifts(null);

    const data = await loadLibraryData({ justSent: false });

    expect(data.readingsCopy.readingsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.readingsTabLabel);
    expect(data.readingsCopy.giftsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.giftsTabLabel);
  });

  it("preserves all gift-page defaults when Sanity gift-page fetch returns an all-null shape", async () => {
    mockReadings(null);
    const allNullGifts = Object.fromEntries(
      Object.keys(MY_GIFTS_PAGE_DEFAULTS).map((key) => [key, null]),
    );
    mockGifts(allNullGifts);

    const data = await loadLibraryData({ justSent: false });

    for (const key of Object.keys(MY_GIFTS_PAGE_DEFAULTS) as Array<keyof typeof MY_GIFTS_PAGE_DEFAULTS>) {
      expect(data.giftsCopy[key]).toEqual(MY_GIFTS_PAGE_DEFAULTS[key]);
    }
  });

  it("non-null edits override defaults", async () => {
    mockReadings({ readingsTabLabel: "My Readings (edited)", giftsTabLabel: null });
    mockGifts(null);

    const data = await loadLibraryData({ justSent: false });

    expect(data.readingsCopy.readingsTabLabel).toBe("My Readings (edited)");
    expect(data.readingsCopy.giftsTabLabel).toBe(MY_READINGS_PAGE_DEFAULTS.giftsTabLabel);
  });
});
