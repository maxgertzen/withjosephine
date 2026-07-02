import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { JsonPostResult } from "@/lib/http/jsonPost";

import { useMutationAction } from "./useMutationAction";

const originalFetch = globalThis.fetch;
const fetchMock = vi.fn();

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => {
  fetchMock.mockReset();
  globalThis.fetch = fetchMock as unknown as typeof globalThis.fetch;
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("useMutationAction", () => {
  it("returns happy-path result with no errors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "ok" }, 200));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    const captured: { value: JsonPostResult<unknown> | null } = { value: null };
    await act(async () => {
      captured.value = await result.current.run({ foo: 1 });
    });

    expect(captured.value?.ok).toBe(true);
    expect(result.current.topError).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });

  it("surfaces topError on a plain non-2xx response", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.topError).toBe("http_401");
  });

  it("retry() replays the last run with the same args", async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500))
      .mockResolvedValueOnce(jsonResponse({ id: "ok" }, 200));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run({ payload: "abc" });
    });
    expect(result.current.topError).toBe("http_500");

    const retried: { value: JsonPostResult<unknown> | null } = { value: null };
    await act(async () => {
      retried.value = await result.current.retry();
    });

    expect(retried.value?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondInit.body).toBe(JSON.stringify({ payload: "abc" }));
    expect(result.current.topError).toBeNull();
  });

  it("retry() returns null when no prior run", async () => {
    const { result } = renderHook(() => useMutationAction("/api/x"));
    const captured: { value: JsonPostResult<unknown> | null } = { value: null };
    await act(async () => {
      captured.value = await result.current.retry();
    });
    expect(captured.value).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reset() clears topError + fieldErrors", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "boom" }, 500));
    const { result } = renderHook(() => useMutationAction("/api/x"));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.topError).toBe("http_500");

    act(() => {
      result.current.reset();
    });
    expect(result.current.topError).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });

  it("flips submitting true synchronously on run(), before the request resolves (u7usxewf)", async () => {
    let resolveFetch: (r: Response) => void = () => {};
    fetchMock.mockReturnValueOnce(
      new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      }),
    );
    const { result } = renderHook(() => useMutationAction("/api/x"));

    const captured: { value: Promise<JsonPostResult<unknown>> | null } = {
      value: null,
    };
    act(() => {
      captured.value = result.current.run({ foo: 1 });
    });

    // submitting is set before the awaited POST resolves, so the armed
    // "Send now" button disables + shows its sending label on the click beat.
    expect(result.current.submitting).toBe(true);

    await act(async () => {
      resolveFetch(jsonResponse({ id: "ok" }, 200));
      await captured.value;
    });
    expect(result.current.submitting).toBe(false);
  });

  it("422 with fieldErrors still works (no regression)", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        { fieldErrors: [{ field: "recipientEmail", message: "Bad" }] },
        422,
      ),
    );
    const { result } = renderHook(() => useMutationAction("/api/x"));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.fieldErrors).toEqual({ recipientEmail: "Bad" });
  });
});
