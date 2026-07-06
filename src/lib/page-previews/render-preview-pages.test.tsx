import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

import {
  LISTEN_FIXTURES,
  PREVIEW_SURFACES,
  type PreviewSurface,
  THANKYOU_FIXTURES,
  VERIFY_FIXTURES,
} from "./preview-fixtures-pages";
import { renderPagePreview } from "./render-preview-pages";

const FIXTURE_KEYS: Record<PreviewSurface, string[]> = {
  listen: Object.keys(LISTEN_FIXTURES),
  "magic-link-verify": Object.keys(VERIFY_FIXTURES),
  "thank-you": Object.keys(THANKYOU_FIXTURES),
};

describe.each(PREVIEW_SURFACES)("renderPagePreview, %s", (surface) => {
  it.each(FIXTURE_KEYS[surface])("renders non-empty HTML for state %s", async (stateKey) => {
    const html = await renderPagePreview(surface, stateKey, null, "/* styles */");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<body>");
    expect(html.length).toBeGreaterThan(500);
  });
});

// srcDoc + sandbox="" paint regression guards.
//
// The blank-iframe bug that bit EmailPreview on 2026-05-24 happens when
// react-dom injects `<link rel="expect" blocking="render">` into the rendered
// HTML; Chromium honors that link inside a sandboxed iframe and never paints.
// renderPagePreview should strip those before returning. These tests assert
// the invariant per surface so a regression fails CI instead of silently
// producing a blank Studio preview.
describe.each(PREVIEW_SURFACES)("renderPagePreview srcDoc paint guards, %s", (surface) => {
  it.each(FIXTURE_KEYS[surface])(
    "produces no render-blocking link tags for state %s",
    async (stateKey) => {
      const html = await renderPagePreview(surface, stateKey, null, "/* styles */");
      expect(
        html,
        `renderPagePreview output for ${surface}/${stateKey} contains a render-blocking link tag; sandboxed iframes will never paint`,
      ).not.toMatch(/<link[^>]*\bblocking=["']render["'][^>]*>/);
    },
  );

  it.each(FIXTURE_KEYS[surface])(
    "wraps body content that has at least one rendered child for state %s",
    async (stateKey) => {
      const html = await renderPagePreview(surface, stateKey, null, "/* styles */");
      const parsed = new DOMParser().parseFromString(html, "text/html");
      // textContent ignores image-only, aria-only, and input-value surfaces.
      // Asserting element count guards the same regression (a structurally
      // blank body parse) without false-failing on visual-only fixtures.
      const childCount = parsed.body.children.length;
      expect(
        childCount,
        `renderPagePreview output for ${surface}/${stateKey} parsed with no body children`,
      ).toBeGreaterThan(0);
    },
  );
});
