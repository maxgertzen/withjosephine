import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_MAGIC_LINK_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { MagicLink } from "./MagicLink";
import { portableTextToPlainText, stringToPortableTextBlocks } from "./PortableTextBody";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const VARS = {
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=abc123",
  firstName: "Ada",
  readingName: "Soul Blueprint",
  readingPriceDisplay: "$179",
};

const COPY = {
  preview: EMAIL_MAGIC_LINK_DEFAULTS.preview,
  heroLine: EMAIL_MAGIC_LINK_DEFAULTS.heroLine,
  buttonLabel: EMAIL_MAGIC_LINK_DEFAULTS.buttonLabel,
  body: EMAIL_MAGIC_LINK_DEFAULTS.body,
};

describe("MagicLink email", () => {
  it("renders Sanity-supplied body paragraphs", async () => {
    const text = visibleText(await render(<MagicLink vars={VARS} copy={COPY} />));
    for (const paragraph of portableTextToPlainText(COPY.body).split("\n\n")) {
      expect(text).toContain(paragraph);
    }
    expect(text).toContain("Josephine ✦");
  });

  it("renders the magic-link URL as the button href", async () => {
    const html = await render(<MagicLink vars={VARS} copy={COPY} />);
    expect(linkHrefs(html).has(VARS.magicLinkUrl)).toBe(true);
  });

  it("renders the magic-link URL as visible body text for clients that strip button styling", async () => {
    const html = await render(<MagicLink vars={VARS} copy={COPY} />);
    const text = visibleText(html);
    expect(text).toContain(VARS.magicLinkUrl);
    expect(text).toContain("Or copy this link:");
  });

  it("uses the ink color token for the button", async () => {
    const html = await render(<MagicLink vars={VARS} copy={COPY} />);
    expect(() => assertBrandTokens(html, { ink: true })).not.toThrow();
  });

  it("renders the brand header + hero line + buttonLabel", async () => {
    const text = visibleText(await render(<MagicLink vars={VARS} copy={COPY} />));
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandName);
    expect(text).toContain(COPY.heroLine);
    expect(text).toContain(COPY.buttonLabel);
  });

  it("honors shared-shell signoff overrides", async () => {
    const html = await render(
      <MagicLink
        vars={VARS}
        copy={COPY}
        shell={{ ...EMAIL_SHARED_SHELL_DEFAULTS, signOffLine1: "In peace,", signOffLine2: "J." }}
      />,
    );
    expect(visibleText(html)).toContain("In peace,");
    expect(visibleText(html)).toContain("J.");
  });

  it("renders editable single-paragraph body without a default fallback in body slot", async () => {
    const html = await render(
      <MagicLink
        vars={VARS}
        copy={{
          ...COPY,
          body: stringToPortableTextBlocks("Just one line of body copy here."),
        }}
      />,
    );
    const text = visibleText(html);
    expect(text).toContain("Just one line of body copy here.");
    expect(text).not.toContain(portableTextToPlainText(COPY.body).split("\n\n")[0]);
  });

  it("substitutes {firstName} and {readingName} from vars into Sanity-edited copy", async () => {
    const html = await render(
      <MagicLink
        vars={VARS}
        copy={{
          ...COPY,
          heroLine: "Welcome back, {firstName}",
          body: stringToPortableTextBlocks("Your {readingName} ({readingPriceDisplay}) is one tap away."),
        }}
      />,
    );
    const text = visibleText(html);
    expect(text).toContain("Welcome back, Ada");
    expect(text).toContain("Your Soul Blueprint ($179) is one tap away.");
  });

  it("falls through to 'there' when firstName is the fallback value", async () => {
    const html = await render(
      <MagicLink
        vars={{ ...VARS, firstName: "there" }}
        copy={{ ...COPY, heroLine: "Hi {firstName}" }}
      />,
    );
    expect(visibleText(html)).toContain("Hi there");
  });
});
