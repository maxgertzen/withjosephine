import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./client", () => ({
  sanityClient: { fetch: vi.fn() },
}));

import { sanityClient } from "./client";
import { publishedFetch, PUBLISHED_REVALIDATE_SECONDS } from "./publishedFetch";

const mockRawFetch = vi.mocked(sanityClient).fetch as ReturnType<typeof vi.fn>;

beforeEach(() => {
  mockRawFetch.mockReset();
});

describe("publishedFetch", () => {
  it("fetches the published perspective with stega disabled", async () => {
    mockRawFetch.mockResolvedValue({ ok: true });

    await publishedFetch({ query: "*[_type=='landingPage'][0]" });

    const [, , options] = mockRawFetch.mock.calls[0];
    expect(options).toMatchObject({ perspective: "published", stega: false });
  });

  it("applies the revalidate fallback and forwards cache tags", async () => {
    mockRawFetch.mockResolvedValue(null);

    await publishedFetch({ query: "q", tags: ["landingPage", "siteSettings"] });

    const [, , options] = mockRawFetch.mock.calls[0];
    expect(options.next).toEqual({
      revalidate: PUBLISHED_REVALIDATE_SECONDS,
      tags: ["landingPage", "siteSettings"],
    });
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
