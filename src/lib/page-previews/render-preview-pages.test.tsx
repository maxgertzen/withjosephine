import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

import { THANKYOU_FIXTURES } from "./preview-fixtures-pages";
import { renderThankYouPagePreview } from "./render-preview-pages";

const STATE_KEYS = Object.keys(THANKYOU_FIXTURES);

describe("renderThankYouPagePreview", () => {
  it.each(STATE_KEYS)("renders non-empty HTML for state %s", async (stateKey) => {
    const html = await renderThankYouPagePreview(stateKey, null, "/* styles */");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<body>");
    expect(html.length).toBeGreaterThan(500);
  });
});

describe("renderThankYouPagePreview srcDoc paint guards", () => {
  it.each(STATE_KEYS)(
    "produces no render-blocking link tags for state %s",
    async (stateKey) => {
      const html = await renderThankYouPagePreview(stateKey, null, "/* styles */");
      expect(
        html,
        `renderThankYouPagePreview output for ${stateKey} contains a render-blocking link tag; sandboxed iframes will never paint`,
      ).not.toMatch(/<link[^>]*\bblocking=["']render["'][^>]*>/);
    },
  );

  it.each(STATE_KEYS)(
    "wraps body content that has at least one rendered child for state %s",
    async (stateKey) => {
      const html = await renderThankYouPagePreview(stateKey, null, "/* styles */");
      const parsed = new DOMParser().parseFromString(html, "text/html");
      // textContent ignores image-only, aria-only, and input-value surfaces.
      // Asserting element count guards the same regression (a structurally
      // blank body parse) without false-failing on visual-only fixtures.
      const childCount = parsed.body.children.length;
      expect(
        childCount,
        `renderThankYouPagePreview output for ${stateKey} parsed with no body children`,
      ).toBeGreaterThan(0);
    },
  );
});
