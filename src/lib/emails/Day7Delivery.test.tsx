import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_DAY7_DELIVERY_DEFAULTS } from "@/data/defaults";

import { Day7Delivery } from "./Day7Delivery";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  listenUrl: "https://withjosephine.com/listen/sub_123",
};

describe("Day7Delivery — UX-locked verbatim copy", () => {
  it("renders the templated greeting with first name", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />),
    );
    expect(text).toContain("Hi Ada,");
  });

  it("renders the 'is here' line with the reading name", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />),
    );
    expect(text).toContain("Your Soul Blueprint is here.");
  });

  it("renders the comfort line, signed-in disclosure, and follow-up paragraph", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />),
    );
    expect(text).toContain("Open it whenever the timing feels right");
    expect(text).toContain("signs you into your reading for the next seven days");
    expect(text).toContain("If anything you hear sits hard");
  });

  it("renders the open-reading button with the listen URL as its href", async () => {
    const html = await render(
      <Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />,
    );
    expect(linkHrefs(html).has(VARS.listenUrl)).toBe(true);
    expect(visibleText(html)).toContain(EMAIL_DAY7_DELIVERY_DEFAULTS.openButtonLabel);
  });

  it("uses the ink color token for the action button", async () => {
    const html = await render(
      <Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />,
    );
    expect(() => assertBrandTokens(html, { ink: true })).not.toThrow();
  });

  it("falls back to the default SignOff when copy.signOff is null", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} />),
    );
    expect(text).toContain("Josephine ✦");
  });

  it("renders a custom sign-off when copy.signOff is set (Sanity override)", async () => {
    const text = visibleText(
      await render(
        <Day7Delivery
          vars={VARS}
          copy={{ ...EMAIL_DAY7_DELIVERY_DEFAULTS, signOff: "In peace, J." }}
        />,
      ),
    );
    expect(text).toContain("In peace, J.");
  });

  it("escapes HTML in firstName + readingName via templating", async () => {
    const html = await render(
      <Day7Delivery
        vars={{ ...VARS, firstName: "<x-first>", readingName: "<x-reading>" }}
        copy={EMAIL_DAY7_DELIVERY_DEFAULTS}
      />,
    );
    expect(html).not.toContain("<x-first>");
    expect(html).not.toContain("<x-reading>");
    expect(html).toContain("&lt;x-first&gt;");
    expect(html).toContain("&lt;x-reading&gt;");
  });
});
