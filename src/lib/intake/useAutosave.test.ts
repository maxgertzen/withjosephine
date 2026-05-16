import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { FieldValues } from "@/components/IntakeForm/types";

const trackMock = vi.fn();
const trackThrottledMock = vi.fn();
vi.mock("@/lib/analytics", () => ({
  track: (...args: unknown[]) => trackMock(...args),
  trackThrottled: (...args: unknown[]) => trackThrottledMock(...args),
}));

import {
  DRAFT_KEY_PREFIX,
  save as saveDraft,
} from "./localStorageDraft";
import { useAutosave, type UseAutosaveArgs } from "./useAutosave";

const DEFAULT_VALUES: FieldValues = {
  email: "",
  first_name: "",
};

const DEFAULT_SNAPSHOT = JSON.stringify(DEFAULT_VALUES);

type SetupOverrides = Partial<UseAutosaveArgs>;

function setup(overrides: SetupOverrides = {}) {
  const setValues = vi.fn();
  const setCurrentPage = vi.fn();
  const setLastSavedAt = vi.fn();
  const onAfterDiscard = vi.fn();

  const baseArgs: UseAutosaveArgs = {
    values: DEFAULT_VALUES,
    currentPage: 0,
    defaultValues: DEFAULT_VALUES,
    defaultValuesSnapshot: DEFAULT_SNAPSHOT,
    isRestored: true,
    draftScope: "soul-blueprint",
    readingId: "soul-blueprint",
    setValues,
    setCurrentPage,
    setLastSavedAt,
    lastSavedAt: null,
    onAfterDiscard,
  };

  const args = { ...baseArgs, ...overrides };
  const { result, rerender } = renderHook(
    (hookArgs: UseAutosaveArgs) => useAutosave(hookArgs),
    { initialProps: args },
  );

  return {
    result,
    rerender,
    args,
    setValues,
    setCurrentPage,
    setLastSavedAt,
    onAfterDiscard,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  trackMock.mockReset();
  trackThrottledMock.mockReset();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  window.localStorage.clear();
});

describe("useAutosave — valuesUntouched", () => {
  it("returns true when values match defaultValuesSnapshot", () => {
    const { result } = setup();
    expect(result.current.valuesUntouched).toBe(true);
  });

  it("returns false when values diverge from defaultValuesSnapshot", () => {
    const { result } = setup({
      values: { email: "ada@example.com", first_name: "" },
    });
    expect(result.current.valuesUntouched).toBe(false);
  });
});

describe("useAutosave — debounced flush effect", () => {
  it("does NOT autosave when values are untouched", () => {
    setup();
    act(() => {
      vi.advanceTimersByTime(2_000);
    });
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeNull();
    expect(trackThrottledMock).not.toHaveBeenCalled();
  });

  it("fires saveDraft + intake_save_auto after 500ms when values change", () => {
    const { setLastSavedAt } = setup({
      values: { email: "ada@example.com", first_name: "" },
    });
    act(() => {
      vi.advanceTimersByTime(500);
    });
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.values).toEqual({ email: "ada@example.com", first_name: "" });
    expect(setLastSavedAt).toHaveBeenCalledWith(expect.any(Date));
    expect(trackThrottledMock).toHaveBeenCalledWith(
      "intake_save_auto",
      { reading_id: "soul-blueprint", page_number: 1 },
      30_000,
    );
  });

  it("respects justDiscarded one-shot guard after handleDiscardDraft fires", () => {
    const { result, rerender, args } = setup({
      values: { email: "ada@example.com", first_name: "" },
    });

    act(() => {
      result.current.handleDiscardDraft();
    });
    // Simulate the post-discard re-render that fires when parent resets values to defaults.
    rerender({
      ...args,
      values: DEFAULT_VALUES,
    });
    act(() => {
      vi.advanceTimersByTime(700);
    });
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeNull();
  });
});

describe("useAutosave — chipTick interval", () => {
  it("does not start the interval when lastSavedAt is null", () => {
    const { result } = setup();
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current.chipTick).toBe(0);
  });

  it("ticks every 30s when lastSavedAt is set", () => {
    const lastSavedAt = new Date();
    const { result } = setup({ lastSavedAt });
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.chipTick).toBe(1);
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(result.current.chipTick).toBe(2);
  });
});

describe("useAutosave — handleSaveLater", () => {
  it("is a no-op when values are untouched", () => {
    const { result, setLastSavedAt } = setup();
    act(() => {
      result.current.handleSaveLater();
    });
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeNull();
    expect(setLastSavedAt).not.toHaveBeenCalled();
    expect(trackMock).not.toHaveBeenCalled();
  });

  it("saves + bumps chipTick + tracks intake_save_click when values are dirty", () => {
    const { result, setLastSavedAt } = setup({
      values: { email: "ada@example.com", first_name: "" },
    });
    act(() => {
      result.current.handleSaveLater();
    });
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeTruthy();
    expect(setLastSavedAt).toHaveBeenCalled();
    expect(result.current.chipTick).toBe(1);
    expect(trackMock).toHaveBeenCalledWith(
      "intake_save_click",
      { reading_id: "soul-blueprint", page_number: 1 },
    );
  });
});

describe("useAutosave — handleDiscardDraft", () => {
  it("clears localStorage + resets state + fires onAfterDiscard + tracks click", () => {
    saveDraft("soul-blueprint", {
      currentPage: 2,
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    const {
      result,
      setValues,
      setCurrentPage,
      setLastSavedAt,
      onAfterDiscard,
    } = setup({
      values: { email: "ada@example.com", first_name: "Ada" },
    });
    act(() => {
      result.current.handleDiscardDraft();
    });
    expect(window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`)).toBeNull();
    expect(setValues).toHaveBeenCalledWith(DEFAULT_VALUES);
    expect(setCurrentPage).toHaveBeenCalledWith(0);
    expect(setLastSavedAt).toHaveBeenCalledWith(null);
    expect(onAfterDiscard).toHaveBeenCalled();
    expect(trackMock).toHaveBeenCalledWith(
      "intake_clear_draft_click",
      { reading_id: "soul-blueprint", page_number: 1 },
    );
  });
});

describe("useAutosave — flushSave passthrough", () => {
  it("writes envelope + calls setLastSavedAt", () => {
    const { result, setLastSavedAt } = setup({
      values: { email: "ada@example.com", first_name: "" },
    });
    act(() => {
      result.current.flushSave({ email: "ada@example.com", first_name: "" }, 1);
    });
    const raw = window.localStorage.getItem(`${DRAFT_KEY_PREFIX}soul-blueprint`);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.currentPage).toBe(1);
    expect(parsed.values).toEqual({ email: "ada@example.com", first_name: "" });
    expect(setLastSavedAt).toHaveBeenCalledWith(expect.any(Date));
  });
});
