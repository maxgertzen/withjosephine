import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { respond } from "@/test/respond";

import { useGiftSendLink } from "./useGiftSendLink";

const TOKEN = "gift-id.mac";
const RETRY_WAIT_MS = 3000;

function openAt(hash: string) {
  window.history.replaceState(null, "", `/gift/send${hash}`);
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("useGiftSendLink", () => {
  it("removes the fragment before it asks for the status, and keeps the token", async () => {
    openAt(`#${TOKEN}`);
    const hashAtFetch: string[] = [];
    const replaceState = vi.spyOn(window.history, "replaceState");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(async () => {
      hashAtFetch.push(window.location.hash);
      return new Response(JSON.stringify({ state: "used" }), { status: 200 });
    });

    const { result } = renderHook(() => useGiftSendLink());

    await waitFor(() =>
      expect(result.current).toEqual({ token: TOKEN, status: { state: "used" } }),
    );
    expect(replaceState.mock.invocationCallOrder[0]).toBeLessThan(
      fetchSpy.mock.invocationCallOrder[0],
    );
    expect(hashAtFetch).toEqual([""]);
    expect(window.location.pathname).toBe("/gift/send");
    expect(fetchSpy).toHaveBeenCalledWith("/api/gift/send/status", expect.anything());
    expect(JSON.parse(String(fetchSpy.mock.calls[0]?.[1]?.body))).toEqual({ token: TOKEN });
  });

  it("gives the invalid status without a request when there is no fragment", async () => {
    openAt("");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const { result } = renderHook(() => useGiftSendLink());

    await waitFor(() => expect(result.current.status).toEqual({ state: "invalid" }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("has no status until the reply arrives", () => {
    openAt(`#${TOKEN}`);
    vi.spyOn(globalThis, "fetch").mockReturnValue(new Promise<Response>(() => {}));

    const { result } = renderHook(() => useGiftSendLink());

    expect(result.current.status).toBeNull();
  });

  it("gives the invalid status without a retry when the status request gets a 4xx", async () => {
    openAt(`#${TOKEN}`);
    const fetchSpy = respond(429, { error: "Too many requests" });

    const { result } = renderHook(() => useGiftSendLink());

    await waitFor(() => expect(result.current.status).toEqual({ state: "invalid" }));
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["a network failure", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["a 503", async () => new Response(JSON.stringify({ error: "unavailable" }), { status: 503 })],
  ])("retries the status request after %s and shows the next reply", async (_label, firstReply) => {
    openAt(`#${TOKEN}`);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(firstReply)
      .mockResolvedValueOnce(new Response(JSON.stringify({ state: "used" }), { status: 200 }));

    const { result } = renderHook(() => useGiftSendLink());

    await waitFor(() => expect(result.current.status).toEqual({ state: "used" }), {
      timeout: RETRY_WAIT_MS,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(2);
    expect(result.current.token).toBe(TOKEN);
  });

  it("gives the invalid status after three network failures", async () => {
    openAt(`#${TOKEN}`);
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new TypeError("Failed to fetch"));

    const { result } = renderHook(() => useGiftSendLink());

    await waitFor(() => expect(result.current.status).toEqual({ state: "invalid" }), {
      timeout: RETRY_WAIT_MS,
    });
    expect(fetchSpy).toHaveBeenCalledTimes(3);
  });
});
