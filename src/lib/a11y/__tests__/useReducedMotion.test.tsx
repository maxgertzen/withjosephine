import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useReducedMotion } from "../useReducedMotion";

type Listener = (event: MediaQueryListEvent) => void;

function createMatchMediaMock(initialMatches: boolean) {
  const listeners = new Set<Listener>();
  let matches = initialMatches;
  const mql = {
    get matches() {
      return matches;
    },
    media: "(prefers-reduced-motion: reduce)",
    addEventListener: vi.fn((_event: string, cb: Listener) => listeners.add(cb)),
    removeEventListener: vi.fn((_event: string, cb: Listener) => listeners.delete(cb)),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
    onchange: null,
  };
  function trigger(next: boolean) {
    matches = next;
    for (const listener of listeners) {
      listener({ matches: next } as MediaQueryListEvent);
    }
  }
  return { mql, trigger };
}

describe("useReducedMotion", () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
  });

  afterEach(() => {
    if (originalMatchMedia) {
      window.matchMedia = originalMatchMedia;
    }
  });

  it("returns true when matchMedia reports a reduce match", () => {
    const { mql } = createMatchMediaMock(true);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(true);
  });

  it("returns false when matchMedia reports no match", () => {
    const { mql } = createMatchMediaMock(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);
  });

  it("reacts to a runtime change event", () => {
    const { mql, trigger } = createMatchMediaMock(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => trigger(true));
    expect(result.current).toBe(true);

    act(() => trigger(false));
    expect(result.current).toBe(false);
  });

  it("removes the listener on unmount (no leak)", () => {
    const { mql } = createMatchMediaMock(false);
    window.matchMedia = vi.fn(() => mql) as unknown as typeof window.matchMedia;

    const { unmount } = renderHook(() => useReducedMotion());
    expect(mql.addEventListener).toHaveBeenCalledTimes(1);
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
