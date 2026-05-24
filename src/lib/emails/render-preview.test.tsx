import { describe, expect, it } from "vitest";

import {
  isPreviewTemplateKey,
  PREVIEW_TEMPLATE_KEYS,
  renderEmailPreview,
} from "./render-preview";
import type { EmailTemplateKey } from "./slots";

describe("render-preview", () => {
  describe("isPreviewTemplateKey", () => {
    it("accepts every key in PREVIEW_TEMPLATE_KEYS", () => {
      for (const key of PREVIEW_TEMPLATE_KEYS) {
        expect(isPreviewTemplateKey(key)).toBe(true);
      }
    });

    it("rejects unknown strings", () => {
      expect(isPreviewTemplateKey("emailNonsense")).toBe(false);
      expect(isPreviewTemplateKey("")).toBe(false);
      expect(isPreviewTemplateKey(null)).toBe(false);
      expect(isPreviewTemplateKey(undefined)).toBe(false);
      expect(isPreviewTemplateKey(42)).toBe(false);
    });
  });

  describe("renderEmailPreview", () => {
    it.each(PREVIEW_TEMPLATE_KEYS.map((key) => [key]))(
      "renders %s to non-empty HTML using only defaults",
      async (key: EmailTemplateKey) => {
        const html = await renderEmailPreview(key, null);
        expect(html.length).toBeGreaterThan(0);
        expect(html).toMatch(/<html\b/i);
        expect(html).toMatch(/<\/html>/i);
      },
    );

    it("merges sanity copy on top of defaults", async () => {
      const customGreeting = "Hello from the test suite";
      const html = await renderEmailPreview("emailMagicLink", {
        greeting: customGreeting,
      });
      expect(html).toContain(customGreeting);
    });

    it("falls back to defaults when sanityCopy is null", async () => {
      const html = await renderEmailPreview("emailOrderConfirmation", null);
      expect(html).toContain("Ada");
    });
  });
});
