import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GIFT_DEFAULTS } from "@/data/defaults";
import { respond } from "@/test/respond";

import { useGiftCodeCheck } from "./useGiftCodeCheck";

const ENDPOINT = "/api/gift/check";
const CODE = "K7M2QX9PH4TR";

function renderCheck(endpoint: string | null = ENDPOINT) {
  return renderHook(() =>
    useGiftCodeCheck({ readingSlug: "birth-chart", endpoint, messages: GIFT_DEFAULTS }),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useGiftCodeCheck", () => {
  it("returns the empty error for a blank code without posting", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheck();
    await expect(result.current.check("   ")).resolves.toEqual({
      kind: "error",
      message: GIFT_DEFAULTS.redeemSheetEmpty,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns not found for a code that cannot be a gift code without posting", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const { result } = renderCheck();
    await expect(result.current.check("K7M2")).resolves.toEqual({
      kind: "error",
      message: GIFT_DEFAULTS.codeNotFound,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns null without an endpoint", async () => {
    const { result } = renderCheck(null);
    await expect(result.current.check(CODE)).resolves.toBeNull();
  });

  it("returns too many tries for a 429", async () => {
    respond(429, { result: "rate_limited" });
    const { result } = renderCheck();
    let outcome: Awaited<ReturnType<typeof result.current.check>> = null;
    await act(async () => {
      outcome = await result.current.check(CODE);
    });
    expect(outcome).toEqual({ kind: "error", message: GIFT_DEFAULTS.codeTooManyTries });
  });

  it("posts the trimmed code", async () => {
    const fetchSpy = respond(200, { result: "valid", path: "/gift/K7M2QX9PH4TR" });
    const { result } = renderCheck();
    let outcome: Awaited<ReturnType<typeof result.current.check>> = null;
    await act(async () => {
      outcome = await result.current.check("  K7M2 QX9P H4TR ");
    });
    expect(outcome).toEqual({ kind: "valid", path: "/gift/K7M2QX9PH4TR" });
    expect(JSON.parse(String(fetchSpy.mock.calls[0][1]?.body))).toEqual({
      code: "K7M2 QX9P H4TR",
      readingSlug: "birth-chart",
    });
  });

  it("is checking only while the request is in flight", async () => {
    let release: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>((resolve) => {
        release = resolve;
      }),
    );
    const { result } = renderCheck();
    expect(result.current.checking).toBe(false);

    let pending: Promise<unknown> = Promise.resolve();
    act(() => {
      pending = result.current.check(CODE);
    });
    expect(result.current.checking).toBe(true);

    await act(async () => {
      release(new Response(JSON.stringify({ result: "not_found" }), { status: 200 }));
      await pending;
    });
    expect(result.current.checking).toBe(false);
  });

  it("returns the other reading with its message", async () => {
    respond(200, {
      result: "other_reading",
      readingSlug: "soul-blueprint",
      readingName: "Soul Blueprint",
      path: "/gift/K7M2QX9PH4TR",
    });
    const { result } = renderCheck();
    let outcome: Awaited<ReturnType<typeof result.current.check>> = null;
    await act(async () => {
      outcome = await result.current.check(CODE);
    });
    expect(outcome).toEqual({
      kind: "other_reading",
      readingName: "Soul Blueprint",
      path: "/gift/K7M2QX9PH4TR",
      message: "This code is for the Soul Blueprint.",
    });
  });
});
