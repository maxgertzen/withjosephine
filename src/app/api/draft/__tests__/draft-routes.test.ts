import { describe, expect, it, vi } from "vitest";

// `next/headers` is mocked so draftMode().disable() is observable.
const disableSpy = vi.fn();
vi.mock("next/headers", () => ({
  draftMode: vi.fn(async () => ({
    disable: disableSpy,
    enable: vi.fn(),
    isEnabled: false,
  })),
}));

// `next/navigation.redirect` throws a sentinel matching Next's actual runtime.
class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

describe("/api/draft/disable", () => {
  it("disables draft mode and redirects to /", async () => {
    const { GET } = await import("../disable/route");
    await expect(GET()).rejects.toMatchObject({ url: "/" });
    expect(disableSpy).toHaveBeenCalledOnce();
  });
});

// The `/api/draft/enable` route is now `defineEnableDraftMode` from
// next-sanity — secret validation is delegated to Sanity's API. Behaviour is
// covered by next-sanity's own tests; we'd be testing the framework, not our
// own logic. Verified end-to-end via Studio Presentation in the runbook.
