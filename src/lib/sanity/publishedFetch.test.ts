import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  sanityClient: {
    fetch: vi.fn(),
    config: () => ({
      apiHost: "https://api.sanity.io",
      projectId: "abc123",
      dataset: "production",
      apiVersion: "2025-01-01",
    }),
  },
}));

const unstableCacheSpy = vi.fn();
vi.mock("next/cache", () => ({
  unstable_cache: (cb: (...args: unknown[]) => unknown, keys: string[], opts: unknown) => {
    unstableCacheSpy(keys, opts);
    return cb;
  },
}));

import { sanityClient } from "./client";
import { PUBLISHED_REVALIDATE_SECONDS, publishedFetch } from "./publishedFetch";

const mockRawFetch = vi.mocked(sanityClient).fetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockRawFetch.mockReset();
  unstableCacheSpy.mockReset();
});

describe("publishedFetch", () => {
  it("fetches the published perspective with stega disabled", async () => {
    mockRawFetch.mockResolvedValue({ ok: true });

    await publishedFetch({ query: "*[_type=='landingPage'][0]" });

    const [, , options] = mockRawFetch.mock.calls[0];
    expect(options).toMatchObject({ perspective: "published", stega: false });
  });

  it("applies the revalidate fallback and forwards cache tags to unstable_cache", async () => {
    mockRawFetch.mockResolvedValue(null);

    await publishedFetch({ query: "q", tags: ["landingPage", "siteSettings"] });

    expect(unstableCacheSpy).toHaveBeenCalledWith(expect.anything(), {
      revalidate: PUBLISHED_REVALIDATE_SECONDS,
      tags: ["landingPage", "siteSettings"],
    });
  });

  it("keys the cache by every client setting that picks the data source, so fixture and real responses never share an entry", async () => {
    mockRawFetch.mockResolvedValue(null);

    await publishedFetch({ query: "q", params: { slug: "birth-chart" } });

    expect(unstableCacheSpy.mock.calls[0][0]).toEqual([
      "published-fetch",
      "https://api.sanity.io",
      "abc123",
      "production",
      "2025-01-01",
      "q",
      JSON.stringify({ slug: "birth-chart" }),
    ]);
  });

  it("defaults params to an empty object", async () => {
    mockRawFetch.mockResolvedValue(null);

    await publishedFetch({ query: "q" });

    const [, params] = mockRawFetch.mock.calls[0];
    expect(params).toEqual({});
  });

  it("returns the raw client result", async () => {
    mockRawFetch.mockResolvedValue({ title: "Privacy" });

    const result = await publishedFetch<{ title: string }>({ query: "q" });

    expect(result).toEqual({ title: "Privacy" });
  });
});
