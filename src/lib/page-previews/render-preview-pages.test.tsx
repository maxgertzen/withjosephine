import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn(), back: vi.fn(), forward: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "",
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}));

import {
  GIFT_CLAIM_FIXTURE_KEYS,
  GIFT_INTAKE_FIXTURES,
  LISTEN_FIXTURES,
  MY_GIFTS_FIXTURES,
  MY_READINGS_FIXTURES,
  PREVIEW_SURFACES,
  type PreviewSurface,
  VERIFY_FIXTURES,
} from "./preview-fixtures-pages";
import { renderPagePreview } from "./render-preview-pages";

const FIXTURE_KEYS: Record<PreviewSurface, string[]> = {
  listen: Object.keys(LISTEN_FIXTURES),
  "my-readings": Object.keys(MY_READINGS_FIXTURES),
  "my-gifts": Object.keys(MY_GIFTS_FIXTURES),
  "gift-claim": GIFT_CLAIM_FIXTURE_KEYS,
  "magic-link-verify": Object.keys(VERIFY_FIXTURES),
  "gift-intake": Object.keys(GIFT_INTAKE_FIXTURES),
};

describe.each(PREVIEW_SURFACES)("renderPagePreview — %s", (surface) => {
  it.each(FIXTURE_KEYS[surface])("renders non-empty HTML for state %s", async (stateKey) => {
    const html = await renderPagePreview(surface, stateKey, null, "/* styles */");
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain("<body>");
    expect(html.length).toBeGreaterThan(500);
  });
});
