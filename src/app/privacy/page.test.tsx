import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchLegalPageFresh: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "",
}));

import { fetchLegalPageFresh } from "@/lib/sanity/fetch";

const fetchFreshMock = vi.mocked(fetchLegalPageFresh);

beforeEach(() => {
  fetchFreshMock.mockReset().mockResolvedValue(null);
});

// Guards against re-staticifying these routes: revalidateTag is off on this
// stack, so dropping force-dynamic silently reintroduces the stale-content bug.
describe.each(["../privacy/page", "../terms/page", "../refund-policy/page"])(
  "legal route %s",
  (modulePath) => {
    it("is force-dynamic", async () => {
      const mod = await import(modulePath);
      expect(mod.dynamic).toBe("force-dynamic");
    });
  },
);

describe("/privacy page", () => {
  it("renders fresh Sanity title + lastUpdated via the uncached fetcher", async () => {
    fetchFreshMock.mockResolvedValue({
      _id: "legalPage-privacy",
      title: "Privacy Policy",
      slug: "privacy",
      tag: "Legal",
      lastUpdated: "2026-07-07",
      body: [],
    });

    const Page = (await import("./page")).default;
    const { getByRole, getByText } = render(await Page());

    expect(fetchFreshMock).toHaveBeenCalledWith("privacy");
    expect(getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeTruthy();
    expect(getByText("Last updated: 7 July 2026")).toBeTruthy();
  });
});
