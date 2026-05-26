import { act, renderHook, waitFor } from "@testing-library/react";
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
  it("returns happy-path result and exposes no elevation state", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ id: "ok" }, 200));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    const captured: { value: JsonPostResult<unknown> | null } = { value: null };
    await act(async () => {
      captured.value = await result.current.run({ foo: 1 });
    });

    expect(captured.value?.ok).toBe(true);
    expect(result.current.elevationRequired).toBeNull();
    expect(result.current.topError).toBeNull();
    expect(result.current.fieldErrors).toEqual({});
  });

  it("surfaces elevationRequired on 401 with elevation_required body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(
        {
          error: "elevation_required",
          contactMailto: "mailto:help@withjosephine.com?subject=x",
        },
        401,
      ),
    );
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run({ foo: 1 });
    });

    await waitFor(() => {
      expect(result.current.elevationRequired).not.toBeNull();
    });
    expect(result.current.elevationRequired?.contactMailto).toBe(
      "mailto:help@withjosephine.com?subject=x",
    );
    expect(result.current.topError).toBeNull();
  });

  it("falls back to default mailto when contactMailto missing from body", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "elevation_required" }, 401),
    );
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.elevationRequired?.contactMailto).toBe(
      "mailto:hello@withjosephine.com",
    );
  });

  it("does NOT treat plain 401 (no elevation_required) as elevation", async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse({ error: "unauthorized" }, 401));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run();
    });

    expect(result.current.elevationRequired).toBeNull();
    expect(result.current.topError).toBe("http_401");
  });

  it("retry() replays the last run with the same args", async () => {
    fetchMock
      .mockResolvedValueOnce(
        jsonResponse({ error: "elevation_required" }, 401),
      )
      .mockResolvedValueOnce(jsonResponse({ id: "ok" }, 200));
    const { result } = renderHook(() => useMutationAction("/api/x"));

    await act(async () => {
      await result.current.run({ payload: "abc" });
    });
    expect(result.current.elevationRequired).not.toBeNull();

    const retried: { value: JsonPostResult<unknown> | null } = { value: null };
    await act(async () => {
      retried.value = await result.current.retry();
    });

    expect(retried.value?.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, secondInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(secondInit.body).toBe(JSON.stringify({ payload: "abc" }));
    expect(result.current.elevationRequired).toBeNull();
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

  it("reset() clears elevationRequired alongside topError + fieldErrors", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse({ error: "elevation_required" }, 401),
    );
    const { result } = renderHook(() => useMutationAction("/api/x"));
    await act(async () => {
      await result.current.run();
    });
    expect(result.current.elevationRequired).not.toBeNull();

    act(() => {
      result.current.reset();
    });
    expect(result.current.elevationRequired).toBeNull();
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
    expect(result.current.elevationRequired).toBeNull();
  });
});
