import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { FieldValues } from "@/components/IntakeForm/types";

import {
  DRAFT_KEY_PREFIX,
  DRAFT_VERSION,
  LAST_READING_ID_KEY,
  save as saveDraft,
} from "./localStorageDraft";
import {
  __resetSwapNameCacheForTest,
  clampRestoredPage,
  pickPreservedFields,
  useDraftRestore,
} from "./useDraftRestore";

const DEFAULT_VALUES: FieldValues = {
  email: "",
  first_name: "",
  last_name: "",
  signs: [],
};

beforeEach(() => {
  window.localStorage.clear();
  __resetSwapNameCacheForTest();
});

afterEach(() => {
  window.localStorage.clear();
  __resetSwapNameCacheForTest();
});

describe("clampRestoredPage", () => {
  it("returns 0 when rawPage is undefined or NaN", () => {
    expect(clampRestoredPage(undefined, 3)).toBe(0);
    expect(clampRestoredPage(Number.NaN, 3)).toBe(0);
  });

  it("clamps to upper bound when rawPage exceeds totalPages - 1", () => {
    expect(clampRestoredPage(5, 3)).toBe(2);
    expect(clampRestoredPage(99, 1)).toBe(0);
  });

  it("clamps to 0 when rawPage is negative", () => {
    expect(clampRestoredPage(-1, 3)).toBe(0);
  });

  it("returns rawPage unchanged when within bounds", () => {
    expect(clampRestoredPage(1, 3)).toBe(1);
  });

  it("returns 0 when totalPages is 0", () => {
    expect(clampRestoredPage(0, 0)).toBe(0);
    expect(clampRestoredPage(3, 0)).toBe(0);
  });
});

describe("pickPreservedFields", () => {
  it("keeps only SWAP_PRESERVED_KEYS when present", () => {
    const out = pickPreservedFields({
      email: "ada@example.com",
      first_name: "Ada",
      middle_name: "Augusta",
      last_name: "Lovelace",
      legal_full_name: "Augusta Ada King",
      anything_else: "math is good",
      birth_chart_focus: "career",
      signs: ["aries"],
    });
    expect(out).toEqual({
      email: "ada@example.com",
      first_name: "Ada",
      middle_name: "Augusta",
      last_name: "Lovelace",
      legal_full_name: "Augusta Ada King",
      anything_else: "math is good",
    });
    expect("birth_chart_focus" in out).toBe(false);
    expect("signs" in out).toBe(false);
  });

  it("returns an empty object when nothing matches", () => {
    expect(pickPreservedFields({ birth_chart_focus: "x" })).toEqual({});
  });
});

describe("useDraftRestore — fresh mount, no saved draft", () => {
  it("seeds with defaultValues + currentPage 0 + lastSavedAt null after effect", async () => {
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values).toEqual(DEFAULT_VALUES);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.swappedFromReadingName).toBeNull();
  });
});

describe("useDraftRestore — restore existing draft", () => {
  it("loads saved values + currentPage + lastSavedAt", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 1,
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values.email).toBe("ada@example.com");
    expect(result.current.values.first_name).toBe("Ada");
    expect(result.current.currentPage).toBe(1);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it("clamps a stale currentPage past totalPages - 1 (P2.4c stale-key filter)", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 7,
      values: { email: "ada@example.com" },
    });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.currentPage).toBe(2);
  });
});

describe("useDraftRestore — swap detection (P2.4e)", () => {
  it("emits previous readingName when lastReadingId differs and a draft exists", async () => {
    saveDraft("akashic-record", {
      currentPage: 0,
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    window.localStorage.setItem(LAST_READING_ID_KEY, "akashic-record");

    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    expect(result.current.swappedFromReadingName).toBe("Soul Blueprint");
    await waitFor(() =>
      expect(result.current.values.email).toBe("ada@example.com"),
    );
    expect(result.current.values.first_name).toBe("Ada");
  });

  it("dismissSwapToast clears swappedFromReadingName", () => {
    saveDraft("akashic-record", {
      currentPage: 0,
      values: { email: "ada@example.com" },
    });
    window.localStorage.setItem(LAST_READING_ID_KEY, "akashic-record");

    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    expect(result.current.swappedFromReadingName).toBe("Soul Blueprint");
    act(() => result.current.dismissSwapToast());
    expect(result.current.swappedFromReadingName).toBeNull();
  });

  it("does not detect swap when no previous reading was tracked", () => {
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    expect(result.current.swappedFromReadingName).toBeNull();
  });
});

describe("useDraftRestore — writes lastReadingId on mount", () => {
  it("persists current readingId for future swap-detection", () => {
    renderHook(() =>
      useDraftRestore({
        readingId: "birth-chart",
        readingName: "Birth Chart",
        draftScope: "birth-chart",
        defaultValues: DEFAULT_VALUES,
        totalPages: 2,
      }),
    );
    expect(window.localStorage.getItem(LAST_READING_ID_KEY)).toBe("birth-chart");
  });
});

describe("useDraftRestore — corrupted draft is ignored", () => {
  it("ignores a stale draft envelope on a version mismatch", () => {
    window.localStorage.setItem(
      `${DRAFT_KEY_PREFIX}soul-blueprint`,
      JSON.stringify({
        version: DRAFT_VERSION + 99,
        savedAt: new Date().toISOString(),
        currentPage: 2,
        values: { email: "stale@example.com" },
      }),
    );
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        readingName: "Soul Blueprint",
        draftScope: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: 3,
      }),
    );
    expect(result.current.values.email).toBe("");
    expect(result.current.currentPage).toBe(0);
  });
});
