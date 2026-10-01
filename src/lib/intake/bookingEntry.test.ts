import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { blockBrowserStorage } from "@/lib/test-helpers";

import type * as BookingEntryModule from "./bookingEntry";
import {
  HOMEPAGE_CARD_ENTRY_KEY,
  HOMEPAGE_CARD_ENTRY_TTL_MS,
  markHomepageCardEntry,
} from "./homepageCardEntry";
import { save as saveDraft } from "./localStorageDraft";

let classifyBookingEntry: typeof BookingEntryModule.classifyBookingEntry;

async function loadInNewDocument() {
  vi.resetModules();
  ({ classifyBookingEntry } = await import("./bookingEntry"));
}

const BOOKING_PATH = "/book/soul-blueprint";
const SITE = window.location.origin;

function setReferrer(referrer: string) {
  Object.defineProperty(document, "referrer", { value: referrer, configurable: true });
}

function setDocumentLoadPath(path: string | null) {
  vi.spyOn(performance, "getEntriesByType").mockReturnValue(
    path ? ([{ name: `${SITE}${path}` }] as unknown as PerformanceEntryList) : [],
  );
}

beforeEach(async () => {
  window.sessionStorage.clear();
  window.localStorage.clear();
  window.history.replaceState(null, "", BOOKING_PATH);
  setReferrer("");
  setDocumentLoadPath(BOOKING_PATH);
  await loadInNewDocument();
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("classifyBookingEntry", () => {
  it("is homepage_card after the card for this reading was tapped", () => {
    markHomepageCardEntry("soul-blueprint");
    expect(classifyBookingEntry("soul-blueprint")).toBe("homepage_card");
  });

  it("a reload after the card tap is not homepage_card", async () => {
    markHomepageCardEntry("soul-blueprint");
    expect(classifyBookingEntry("soul-blueprint")).toBe("homepage_card");
    await loadInNewDocument();
    expect(classifyBookingEntry("soul-blueprint")).toBe("direct");
  });

  it("ignores a card tap older than the TTL, so an abandoned tap cannot label a later visit", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    markHomepageCardEntry("soul-blueprint");
    vi.setSystemTime(Date.now() + HOMEPAGE_CARD_ENTRY_TTL_MS + 1);
    setReferrer("https://www.tiktok.com/");
    expect(classifyBookingEntry("soul-blueprint")).toBe("external");
  });

  it("counts a card tap inside the TTL", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    markHomepageCardEntry("soul-blueprint");
    vi.setSystemTime(Date.now() + HOMEPAGE_CARD_ENTRY_TTL_MS);
    expect(classifyBookingEntry("soul-blueprint")).toBe("homepage_card");
  });

  it("treats an unreadable stored tap as no tap", () => {
    window.sessionStorage.setItem(HOMEPAGE_CARD_ENTRY_KEY, "{not json");
    expect(classifyBookingEntry("soul-blueprint")).toBe("direct");
  });

  it("is internal when the visitor comes back client-side to the page they landed on", () => {
    setReferrer("https://www.google.com/");
    expect(classifyBookingEntry("soul-blueprint")).toBe("external");
    expect(classifyBookingEntry("soul-blueprint")).toBe("internal");
  });

  it("falls back to the referrer when the navigation entry URL cannot be parsed", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { name: "not a url" },
    ] as unknown as PerformanceEntryList);
    setReferrer("https://www.google.com/");
    expect(classifyBookingEntry("soul-blueprint")).toBe("external");
  });

  it("ignores a card tap for a different reading", () => {
    markHomepageCardEntry("birth-chart");
    expect(classifyBookingEntry("soul-blueprint")).toBe("direct");
  });

  it("is draft when this reading has a saved draft and no card tap", () => {
    saveDraft("soul-blueprint", { currentPage: 1, values: { email: "a@b.co" } });
    expect(classifyBookingEntry("soul-blueprint")).toBe("draft");
  });

  it("prefers homepage_card over draft", () => {
    saveDraft("soul-blueprint", { currentPage: 1, values: {} });
    markHomepageCardEntry("soul-blueprint");
    expect(classifyBookingEntry("soul-blueprint")).toBe("homepage_card");
  });

  it.each([
    ["client-side navigation from another site page", "/", "https://www.tiktok.com/", "internal"],
    ["full load referred by this site", BOOKING_PATH, `${SITE}/notes/a-note`, "internal"],
    ["full load referred by another site", BOOKING_PATH, "https://www.google.com/", "external"],
    ["full load with no referrer", BOOKING_PATH, "", "direct"],
    ["no navigation entry, external referrer", null, "https://www.google.com/", "external"],
  ] as const)("%s", (_case, documentLoadPath, referrer, expected) => {
    setDocumentLoadPath(documentLoadPath);
    setReferrer(referrer);
    expect(classifyBookingEntry("soul-blueprint")).toBe(expected);
  });
});

describe("blocked storage", () => {
  it("classifies from the referrer when reads throw, even with a flag and a draft saved", () => {
    markHomepageCardEntry("soul-blueprint");
    saveDraft("soul-blueprint", { currentPage: 1, values: {} });
    blockBrowserStorage();
    expect(classifyBookingEntry("soul-blueprint")).toBe("direct");
  });

  it("marking a card tap does nothing when writes throw", () => {
    blockBrowserStorage();
    expect(() => markHomepageCardEntry("soul-blueprint")).not.toThrow();
    vi.restoreAllMocks();
    expect(window.sessionStorage.getItem(HOMEPAGE_CARD_ENTRY_KEY)).toBeNull();
  });
});
