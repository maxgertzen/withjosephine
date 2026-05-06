/**
 * Visual parity test: every text string + brand token rendered by the
 * legacy `sendDay2Started` HTML inline in `src/lib/resend.ts` must be
 * present in the React-rendered output.
 */
import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { Day2Started } from "./Day2Started";
import { assertBrandTokens, visibleText } from "./test-helpers";

const FIRST_NAME = "Ada";

const LEGACY_BODY_LINES = [
  "Hi Ada,",
  "Just a quick note to let you know I've sat down with your chart and your records this week. I always want my clients to know when the work begins, so it doesn't feel like silence on your end.",
  "I'm not going to preview anything — your reading should arrive whole, the way it's meant to. But I wanted you to know it's in good hands, and that I'm taking the time it asks for.",
  "You'll hear from me again when it's ready, within the next five days.",
  "With love,",
  "Josephine ✦",
] as const;

describe("Day2Started — visual parity with legacy resend.ts", () => {
  it("renders every body line from the legacy email", async () => {
    const text = visibleText(await render(<Day2Started firstName={FIRST_NAME} />));
    for (const line of LEGACY_BODY_LINES) {
      expect(text).toContain(line);
    }
  });

  it("uses the Inter sans-family token (legacy parity)", async () => {
    const html = await render(<Day2Started firstName={FIRST_NAME} />);
    expect(html).toMatch(/Inter/);
  });

  it("uses the body color from email tokens (legacy parity)", async () => {
    const html = await render(<Day2Started firstName={FIRST_NAME} />);
    expect(() => assertBrandTokens(html, { body: true })).not.toThrow();
  });

  it("escapes HTML in firstName", async () => {
    const html = await render(<Day2Started firstName="<script>x</script>" />);
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
