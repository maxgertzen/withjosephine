import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetCloudflareContext } = vi.hoisted(() => ({
  mockGetCloudflareContext: vi.fn(),
}));

vi.mock("@opennextjs/cloudflare", () => ({
  getCloudflareContext: mockGetCloudflareContext,
}));

import { runMirror } from "./runMirror";

describe("runMirror", () => {
  beforeEach(() => {
    mockGetCloudflareContext.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schedules via ctx.waitUntil when CF context is available", () => {
    const waitUntil = vi.fn();
    mockGetCloudflareContext.mockReturnValue({ ctx: { waitUntil } });

    const promise = Promise.resolve();
    runMirror(promise);

    expect(waitUntil).toHaveBeenCalledTimes(1);
    expect(waitUntil).toHaveBeenCalledWith(promise);
  });

  it("falls back to detached execution when getCloudflareContext throws", async () => {
    mockGetCloudflareContext.mockImplementation(() => {
      throw new Error("not in request context");
    });

    const observed = vi.fn();
    runMirror(Promise.resolve().then(() => observed()));
    await Promise.resolve();
    await Promise.resolve();

    expect(observed).toHaveBeenCalledTimes(1);
  });

  it("falls back to detached execution when ctx is undefined", async () => {
    mockGetCloudflareContext.mockReturnValue({ ctx: undefined });

    const observed = vi.fn();
    runMirror(Promise.resolve().then(() => observed()));
    await Promise.resolve();
    await Promise.resolve();

    expect(observed).toHaveBeenCalledTimes(1);
  });

  it("falls back to detached execution when waitUntil is missing on ctx", async () => {
    mockGetCloudflareContext.mockReturnValue({ ctx: {} });

    const observed = vi.fn();
    runMirror(Promise.resolve().then(() => observed()));
    await Promise.resolve();
    await Promise.resolve();

    expect(observed).toHaveBeenCalledTimes(1);
  });

  it("does not throw when the detached promise rejects", async () => {
    mockGetCloudflareContext.mockReturnValue({ ctx: undefined });
    vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() =>
      runMirror(Promise.reject(new Error("mirror failed"))),
    ).not.toThrow();
    await Promise.resolve();
    await Promise.resolve();
  });
});
