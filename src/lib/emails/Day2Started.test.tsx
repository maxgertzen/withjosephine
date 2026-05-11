import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_DAY2_STARTED_DEFAULTS } from "@/data/defaults";

import { Day2Started } from "./Day2Started";
import { assertBrandTokens, visibleText } from "./test-helpers";

const VARS = { firstName: "Ada" };

const BODY_LINES = [
  "Hi Ada,",
  "Just a quick note to let you know I’ve sat down with your chart",
  "I’m not going to preview anything",
  "You’ll hear from me again when it’s ready, within the next five days.",
  "With love,",
  "Josephine ✦",
] as const;

describe("Day2Started — Sanity-driven copy with templated firstName", () => {
  it("renders the templated greeting + body paragraphs", async () => {
    const text = visibleText(
      await render(<Day2Started vars={VARS} copy={EMAIL_DAY2_STARTED_DEFAULTS} />),
    );
    for (const line of BODY_LINES) expect(text).toContain(line);
  });

  it("uses the Inter sans-family token", async () => {
    const html = await render(<Day2Started vars={VARS} copy={EMAIL_DAY2_STARTED_DEFAULTS} />);
    expect(html).toMatch(/Inter/);
  });

  it("uses the body color from email tokens", async () => {
    const html = await render(<Day2Started vars={VARS} copy={EMAIL_DAY2_STARTED_DEFAULTS} />);
    expect(() => assertBrandTokens(html, { body: true })).not.toThrow();
  });

  it("renders a custom sign-off when copy.signOff is set (Sanity override)", async () => {
    const text = visibleText(
      await render(
        <Day2Started
          vars={VARS}
          copy={{ ...EMAIL_DAY2_STARTED_DEFAULTS, signOff: "In peace, J." }}
        />,
      ),
    );
    expect(text).toContain("In peace, J.");
  });

  it("escapes HTML in firstName via templating", async () => {
    const html = await render(
      <Day2Started
        vars={{ firstName: "<script>x</script>" }}
        copy={EMAIL_DAY2_STARTED_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;x&lt;/script&gt;");
  });
});
