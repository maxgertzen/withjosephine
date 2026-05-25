import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_DAY7_DELIVERY_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { Day7Delivery } from "./Day7Delivery";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
  listenUrl: "https://withjosephine.com/listen/sub_123",
};

describe("Day7Delivery — UX-locked verbatim copy", () => {
  it("renders the templated greeting with first name", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain("Hi Ada,");
  });

  it("renders the 'is here' line with the reading name", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain("Your Soul Blueprint is here.");
  });

  it("renders the comfort line, signed-in disclosure, and follow-up paragraph", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain("Open it whenever the timing feels right");
    expect(text).toContain("signs you into your reading for the next seven days");
    expect(text).toContain("If anything you hear sits hard");
  });

  it("renders the open-reading button with the listen URL as its href", async () => {
    const html = await render(
      <Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
    );
    expect(linkHrefs(html).has(VARS.listenUrl)).toBe(true);
    expect(visibleText(html)).toContain(EMAIL_DAY7_DELIVERY_DEFAULTS.openButtonLabel);
  });

  it("uses the ink color token for the action button", async () => {
    const html = await render(
      <Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
    );
    expect(() => assertBrandTokens(html, { ink: true })).not.toThrow();
  });

  it("renders the italic-serif signOff lines from copy", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain("With love,");
    expect(text).toContain("Josephine ✦");
  });

  it("honors shared-shell overrides on signOffLine1 + signOffLine2", async () => {
    const text = visibleText(
      await render(
        <Day7Delivery
          vars={VARS}
          copy={EMAIL_DAY7_DELIVERY_DEFAULTS}
          shell={{
            ...EMAIL_SHARED_SHELL_DEFAULTS,
            signOffLine1: "In peace,",
            signOffLine2: "J.",
          }}
        />,
      ),
    );
    expect(text).toContain("In peace,");
    expect(text).toContain("J.");
  });

  it("renders the brand header (brandName + brandSubtitle)", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandName);
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandSubtitle);
  });

  it("renders the gold-bordered hero line", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain(EMAIL_DAY7_DELIVERY_DEFAULTS.heroLine);
  });

  it("renders the reading card with readingName + readingPriceDisplay + delivery line", async () => {
    const text = visibleText(
      await render(<Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />),
    );
    expect(text).toContain(EMAIL_DAY7_DELIVERY_DEFAULTS.cardLabel);
    expect(text).toContain(VARS.readingName);
    expect(text).toContain(VARS.readingPriceDisplay);
    expect(text).toContain(EMAIL_DAY7_DELIVERY_DEFAULTS.cardDeliveryLine);
  });

  it("renders the footer disclaimer + mailto/site links", async () => {
    const html = await render(
      <Day7Delivery vars={VARS} copy={EMAIL_DAY7_DELIVERY_DEFAULTS} shell={EMAIL_SHARED_SHELL_DEFAULTS} />,
    );
    expect(visibleText(html)).toContain(EMAIL_SHARED_SHELL_DEFAULTS.footerDisclaimer);
    const links = linkHrefs(html);
    expect(links.has("mailto:hello@withjosephine.com")).toBe(true);
    expect(links.has("https://withjosephine.com")).toBe(true);
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
