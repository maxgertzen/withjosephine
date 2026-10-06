import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { FieldValues } from "@/components/IntakeForm/types";

import {
  DRAFT_KEY_PREFIX,
  DRAFT_VERSION,
  LAST_READING_ID_KEY,
  save as saveDraft,
  setLastReadingId,
} from "./localStorageDraft";
import { pickCarriedOverFields, useDraftRestore } from "./useDraftRestore";

const TOTAL_PAGES = 3;

const DEFAULT_VALUES: FieldValues = {
  email: "",
  first_name: "",
  last_name: "",
  signs: [],
};

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  window.localStorage.clear();
});

describe("pickCarriedOverFields", () => {
  it("keeps only the carried-over keys when present", () => {
    const out = pickCarriedOverFields({
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

  it("skips blank values so they never overwrite a filled field", () => {
    expect(pickCarriedOverFields({ email: "", first_name: "  ", last_name: "Lovelace" })).toEqual({
      last_name: "Lovelace",
    });
  });

  it("returns an empty object when nothing matches", () => {
    expect(pickCarriedOverFields({ birth_chart_focus: "x" })).toEqual({});
  });
});

describe("useDraftRestore — fresh mount, no saved draft", () => {
  it("seeds with defaultValues + currentPage 0 + lastSavedAt null after effect", async () => {
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values).toEqual(DEFAULT_VALUES);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.lastSavedAt).toBeNull();
    expect(result.current.nameOrEmailCarriedOver).toBe(false);
  });
});

describe("useDraftRestore — restore existing draft", () => {
  it("loads saved values + lastSavedAt but always resumes on the first page", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 1,
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values.email).toBe("ada@example.com");
    expect(result.current.values.first_name).toBe("Ada");
    expect(result.current.currentPage).toBe(0);
    expect(result.current.lastSavedAt).toBeInstanceOf(Date);
  });

  it("ignores a saved page index and resumes on the first page", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 7,
      values: { email: "ada@example.com" },
    });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );
    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values.email).toBe("ada@example.com");
    expect(result.current.currentPage).toBe(0);
  });

  it("resumes on the last page when asked to", async () => {
    saveDraft("soul-blueprint", { currentPage: 0, values: { email: "ada@example.com" } });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
        initialPage: "last",
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.currentPage).toBe(TOTAL_PAGES - 1);
  });

  it("reports a restore from a saved draft", async () => {
    saveDraft("soul-blueprint", { currentPage: 0, values: { email: "ada@example.com" } });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.restoredFromDraft).toBe(true);
  });

  it("reports no restore from a draft on a fresh mount", async () => {
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.restoredFromDraft).toBe(false);
  });

  it("restores the answers of a draft saved with a gift code, without the code among them", async () => {
    saveDraft("soul-blueprint", {
      currentPage: 0,
      values: { email: "anna@example.com", first_name: "Anna" },
      giftCode: "K7M2QX9PH4TR",
    });
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values).toEqual({
      ...DEFAULT_VALUES,
      email: "anna@example.com",
      first_name: "Anna",
    });
  });
});

describe("useDraftRestore - a draft saved with a gift code", () => {
  const GIFT_CODE = "K7M2QX9PH4TR";

  function restoreGiftForm(giftCode: string | undefined) {
    return renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
        giftCode,
      }),
    );
  }

  it("opens on the last page when the draft was left there with this gift's code", async () => {
    saveDraft("soul-blueprint", {
      currentPage: TOTAL_PAGES - 1,
      values: { email: "anna@example.com" },
      giftCode: GIFT_CODE,
    });
    const { result } = restoreGiftForm(GIFT_CODE);

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.currentPage).toBe(TOTAL_PAGES - 1);
  });

  it.each([
    { draftCode: GIFT_CODE, draftPage: 0, routeCode: GIFT_CODE, case: "left on an earlier page" },
    { draftCode: "Q9PH4TRK7M2X", draftPage: TOTAL_PAGES - 1, routeCode: GIFT_CODE, case: "for another code" },
    { draftCode: undefined, draftPage: TOTAL_PAGES - 1, routeCode: GIFT_CODE, case: "without a code" },
    { draftCode: GIFT_CODE, draftPage: TOTAL_PAGES - 1, routeCode: undefined, case: "outside gift mode" },
  ])("opens on the first page for a draft $case", async ({ draftCode, draftPage, routeCode }) => {
    saveDraft("soul-blueprint", {
      currentPage: draftPage,
      values: { email: "anna@example.com" },
      giftCode: draftCode,
    });
    const { result } = restoreGiftForm(routeCode);

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.currentPage).toBe(0);
  });
});

describe("useDraftRestore — carry-over from the last reading (P2.4e)", () => {
  it("carries name and email over from the last reading's draft and reports it", async () => {
    saveDraft("akashic-record", {
      currentPage: 0,
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    setLastReadingId("akashic-record");

    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.nameOrEmailCarriedOver).toBe(true));
    expect(result.current.values.email).toBe("ada@example.com");
    expect(result.current.values.first_name).toBe("Ada");
  });

  it("reports no name or email carry-over when the last reading's draft has neither filled in", async () => {
    saveDraft("akashic-record", {
      currentPage: 0,
      values: { email: "", first_name: "  ", anything_else: "a note", birth_chart_focus: "career" },
    });
    setLastReadingId("akashic-record");

    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.nameOrEmailCarriedOver).toBe(false);
  });

  it("keeps this reading's own filled email when the last reading's draft has it blank", async () => {
    saveDraft("soul-blueprint", { currentPage: 0, values: { email: "ada@example.com" } });
    saveDraft("akashic-record", { currentPage: 0, values: { email: "", anything_else: "a note" } });
    setLastReadingId("akashic-record");

    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.values.email).toBe("ada@example.com");
  });

  it("reports no carry-over when no previous reading was tracked", async () => {
    const { result } = renderHook(() =>
      useDraftRestore({
        readingId: "soul-blueprint",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );

    await waitFor(() => expect(result.current.isRestored).toBe(true));
    expect(result.current.nameOrEmailCarriedOver).toBe(false);
  });
});

describe("useDraftRestore — writes lastReadingId on mount", () => {
  it("persists current readingId for future swap-detection", () => {
    renderHook(() =>
      useDraftRestore({
        readingId: "birth-chart",
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
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
        defaultValues: DEFAULT_VALUES,
        totalPages: TOTAL_PAGES,
      }),
    );
    expect(result.current.values.email).toBe("");
    expect(result.current.currentPage).toBe(0);
  });
});
