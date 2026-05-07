import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  clear,
  clearAll,
  DRAFT_KEY_PREFIX,
  DRAFT_TTL_MS,
  DRAFT_VERSION,
  getLastReadingId,
  LAST_READING_ID_KEY,
  restore,
  save,
  setLastReadingId,
} from "./localStorageDraft";

const READING = "soul-blueprint";
const KEY = `${DRAFT_KEY_PREFIX}${READING}`;

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("localStorageDraft.save", () => {
  it("writes a versioned envelope under josephine.intake.draft.<readingId>", () => {
    const envelope = save(READING, { currentPage: 2, values: { email: "a@b.c" } });
    expect(envelope).not.toBeNull();
    const raw = window.localStorage.getItem(KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(DRAFT_VERSION);
    expect(parsed.currentPage).toBe(2);
    expect(parsed.values).toEqual({ email: "a@b.c" });
    expect(typeof parsed.savedAt).toBe("string");
  });
});

describe("localStorageDraft.restore", () => {
  it("returns null when the key is absent", () => {
    expect(restore(READING)).toBeNull();
  });

  it("returns the saved envelope when fresh", () => {
    save(READING, { currentPage: 0, values: { fullName: "Ada" } });
    const restored = restore(READING);
    expect(restored?.values).toEqual({ fullName: "Ada" });
    expect(restored?.currentPage).toBe(0);
  });

  it("returns null and clears the key when older than the idle TTL", () => {
    const stale = {
      version: DRAFT_VERSION,
      savedAt: new Date(Date.now() - DRAFT_TTL_MS - 1000).toISOString(),
      currentPage: 0,
      values: {},
    };
    window.localStorage.setItem(KEY, JSON.stringify(stale));
    expect(restore(READING)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("clears drafts last saved 73h ago (past 72h idle cutoff)", () => {
    const ms73h = 73 * 60 * 60 * 1000;
    const stale = {
      version: DRAFT_VERSION,
      savedAt: new Date(Date.now() - ms73h).toISOString(),
      currentPage: 0,
      values: {},
    };
    window.localStorage.setItem(KEY, JSON.stringify(stale));
    expect(restore(READING)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("preserves drafts last saved 71h ago (under 72h idle cutoff)", () => {
    const ms71h = 71 * 60 * 60 * 1000;
    const fresh = {
      version: DRAFT_VERSION,
      savedAt: new Date(Date.now() - ms71h).toISOString(),
      currentPage: 1,
      values: { email: "still@here.com" },
    };
    window.localStorage.setItem(KEY, JSON.stringify(fresh));
    const restored = restore(READING);
    expect(restored?.values).toEqual({ email: "still@here.com" });
    expect(restored?.currentPage).toBe(1);
  });

  it("returns null and clears the key on version mismatch", () => {
    const mismatched = {
      version: DRAFT_VERSION + 99,
      savedAt: new Date().toISOString(),
      currentPage: 0,
      values: {},
    };
    window.localStorage.setItem(KEY, JSON.stringify(mismatched));
    expect(restore(READING)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("returns null and clears the key when JSON is malformed", () => {
    window.localStorage.setItem(KEY, "{not-json");
    expect(restore(READING)).toBeNull();
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });
});

describe("localStorageDraft.clear / clearAll", () => {
  it("removes the specified readingId key", () => {
    save(READING, { currentPage: 0, values: {} });
    expect(window.localStorage.getItem(KEY)).toBeTruthy();
    clear(READING);
    expect(window.localStorage.getItem(KEY)).toBeNull();
  });

  it("clearAll removes every josephine.intake.draft.* key and the lastReadingId", () => {
    save("soul-blueprint", { currentPage: 0, values: {} });
    save("akashic-record", { currentPage: 0, values: {} });
    setLastReadingId("akashic-record");
    clearAll();
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeNull();
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}akashic-record`)).toBeNull();
    expect(window.localStorage.getItem(LAST_READING_ID_KEY)).toBeNull();
  });
});

describe("localStorageDraft.lastReadingId", () => {
  it("returns null when never set", () => {
    expect(getLastReadingId()).toBeNull();
  });

  it("round-trips through setLastReadingId", () => {
    setLastReadingId("birth-chart");
    expect(getLastReadingId()).toBe("birth-chart");
  });
});
