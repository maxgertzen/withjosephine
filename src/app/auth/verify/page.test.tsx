import { render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/sanity/fetch", () => ({
  fetchMagicLinkVerifyPage: vi.fn(),
}));

import { MAGIC_LINK_VERIFY_PAGE_DEFAULTS } from "@/data/defaults";
import { fetchMagicLinkVerifyPage } from "@/lib/sanity/fetch";

const fetchCopyMock = vi.mocked(fetchMagicLinkVerifyPage);

beforeEach(() => {
  fetchCopyMock.mockReset().mockResolvedValue(null);
});

async function renderPage(searchParams: Record<string, string> = {}) {
  const Page = (await import("./page")).default;
  const tree = await Page({ searchParams: Promise.resolve(searchParams) });
  return render(tree);
}

describe("/auth/verify page", () => {
  it("renders the confirm-email form with token + next embedded", async () => {
    const { getByRole, container } = await renderPage({ token: "abc", next: "/listen/sub_1" });
    expect(getByRole("heading", { name: MAGIC_LINK_VERIFY_PAGE_DEFAULTS.confirmHeading })).toBeTruthy();
    const form = getByRole("button", { name: MAGIC_LINK_VERIFY_PAGE_DEFAULTS.confirmButtonLabel })
      .closest("form");
    expect(form?.getAttribute("action")).toBe("/api/auth/magic-link/verify");
    expect((container.querySelector('input[name="token"]') as HTMLInputElement).value).toBe("abc");
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe(
      "/listen/sub_1",
    );
  });

  it("clamps unsafe `next` to /my-readings", async () => {
    const { container } = await renderPage({ token: "abc", next: "https://evil.example.com" });
    expect((container.querySelector('input[name="next"]') as HTMLInputElement).value).toBe(
      "/my-readings",
    );
  });

  it("renders rested-link state when ?error=rested", async () => {
    const { getByRole } = await renderPage({ token: "abc", error: "rested" });
    expect(getByRole("heading", { name: MAGIC_LINK_VERIFY_PAGE_DEFAULTS.restedHeading })).toBeTruthy();
    expect(
      getByRole("link", { name: MAGIC_LINK_VERIFY_PAGE_DEFAULTS.restedCtaLabel }).getAttribute("href"),
    ).toBe("/my-readings");
  });

  it("renders rested-link state when token is missing", async () => {
    const { getByRole } = await renderPage();
    expect(getByRole("heading", { name: MAGIC_LINK_VERIFY_PAGE_DEFAULTS.restedHeading })).toBeTruthy();
  });

  it("uses Sanity-supplied copy when provided", async () => {
    fetchCopyMock.mockResolvedValue({
      ...MAGIC_LINK_VERIFY_PAGE_DEFAULTS,
      confirmHeading: "Quick — your email",
    });
    const { getByRole } = await renderPage({ token: "abc" });
    expect(getByRole("heading", { name: "Quick — your email" })).toBeTruthy();
  });

  it("email input is type=email and required (validation lives in MagicLinkEmailForm)", async () => {
    const { container } = await renderPage({ token: "abc" });
    const input = container.querySelector('input[name="email"]') as HTMLInputElement;
    expect(input.type).toBe("email");
    expect(input.required).toBe(true);
    // Disabled-until-valid + visible error feedback are exercised in
    // MagicLinkEmailForm.test.tsx — kept here is just the wiring check.
  });
});
