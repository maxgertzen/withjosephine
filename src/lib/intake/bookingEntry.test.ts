import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { blockBrowserStorage } from "@/lib/test-helpers";

import type * as BookingEntryModule from "./bookingEntry";
import type * as HomepageCardEntryModule from "./homepageCardEntry";
import { HOMEPAGE_CARD_ENTRY_TTL_MS } from "./homepageCardEntry";
import { save as saveDraft } from "./localStorageDraft";

let peekBookingEntry: typeof BookingEntryModule.peekBookingEntry;
let settleBookingEntry: typeof BookingEntryModule.settleBookingEntry;
let markHomepageCardEntry: typeof HomepageCardEntryModule.markHomepageCardEntry;

async function loadInNewDocument() {
  vi.resetModules();
  ({ peekBookingEntry, settleBookingEntry } = await import("./bookingEntry"));
  ({ markHomepageCardEntry } = await import("./homepageCardEntry"));
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

function visitBookingPage(slug: string) {
  const entry = peekBookingEntry(slug, window.location.pathname);
  settleBookingEntry();
  return entry;
}

describe("peekBookingEntry", () => {
  it("reads the card tap without using it up, until the visit settles", () => {
    markHomepageCardEntry("soul-blueprint");
    expect(peekBookingEntry("soul-blueprint", BOOKING_PATH)).toBe("homepage_card");
    expect(peekBookingEntry("soul-blueprint", BOOKING_PATH)).toBe("homepage_card");
    settleBookingEntry();
    expect(peekBookingEntry("soul-blueprint", BOOKING_PATH)).toBe("internal");
  });
});

describe("booking page visit (peek, then settle)", () => {
  it("is internal on a client-side navigation, read before the router updates the URL", () => {
    window.history.replaceState(null, "", "/");
    setDocumentLoadPath("/");
    setReferrer("https://www.tiktok.com/");
    expect(peekBookingEntry("soul-blueprint", BOOKING_PATH)).toBe("internal");
  });

  it("is homepage_card after the card for this reading was tapped", () => {
    markHomepageCardEntry("soul-blueprint");
    expect(visitBookingPage("soul-blueprint")).toBe("homepage_card");
  });

  it("counts the card tap once, so a later visit in the same document is not homepage_card", () => {
    markHomepageCardEntry("soul-blueprint");
    expect(visitBookingPage("soul-blueprint")).toBe("homepage_card");
    expect(visitBookingPage("soul-blueprint")).toBe("internal");
  });

  it("a reload after the card tap is not homepage_card", async () => {
    markHomepageCardEntry("soul-blueprint");
    await loadInNewDocument();
    expect(visitBookingPage("soul-blueprint")).toBe("direct");
  });

  it("ignores a card tap older than the TTL, so an abandoned tap cannot label a later visit", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    markHomepageCardEntry("soul-blueprint");
    vi.setSystemTime(Date.now() + HOMEPAGE_CARD_ENTRY_TTL_MS + 1);
    setDocumentLoadPath("/");
    expect(visitBookingPage("soul-blueprint")).toBe("internal");
  });

  it("counts a card tap inside the TTL", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    markHomepageCardEntry("soul-blueprint");
    vi.setSystemTime(Date.now() + HOMEPAGE_CARD_ENTRY_TTL_MS);
    expect(visitBookingPage("soul-blueprint")).toBe("homepage_card");
  });

  it("is internal when the visitor comes back client-side to the page they landed on", () => {
    setReferrer("https://www.google.com/");
    expect(visitBookingPage("soul-blueprint")).toBe("external");
    expect(visitBookingPage("soul-blueprint")).toBe("internal");
  });

  it("falls back to the referrer when the navigation entry URL cannot be parsed", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { name: "not a url" },
    ] as unknown as PerformanceEntryList);
    setReferrer("https://www.google.com/");
    expect(visitBookingPage("soul-blueprint")).toBe("external");
  });

  it("ignores a card tap for a different reading", () => {
    markHomepageCardEntry("birth-chart");
    expect(visitBookingPage("soul-blueprint")).toBe("direct");
  });

  it("is draft when this reading has a saved draft and no card tap", () => {
    saveDraft("soul-blueprint", { currentPage: 1, values: { email: "a@b.co" } });
    expect(visitBookingPage("soul-blueprint")).toBe("draft");
  });

  it("prefers homepage_card over draft", () => {
    saveDraft("soul-blueprint", { currentPage: 1, values: {} });
    markHomepageCardEntry("soul-blueprint");
    expect(visitBookingPage("soul-blueprint")).toBe("homepage_card");
  });

  it("classifies from the referrer when storage is blocked, even with a draft saved", () => {
    saveDraft("soul-blueprint", { currentPage: 1, values: {} });
    blockBrowserStorage();
    expect(visitBookingPage("soul-blueprint")).toBe("direct");
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
    expect(visitBookingPage("soul-blueprint")).toBe(expected);
  });
});
