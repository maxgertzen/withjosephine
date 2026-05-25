import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_MAGIC_LINK_DEFAULTS, EMAIL_SHARED_SHELL_DEFAULTS } from "@/data/defaults";

import { MagicLink } from "./MagicLink";
import { portableTextToPlainText, stringToPortableTextBlocks } from "./PortableTextBody";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const PROPS = {
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=abc123",
  preview: EMAIL_MAGIC_LINK_DEFAULTS.preview,
  heroLine: EMAIL_MAGIC_LINK_DEFAULTS.heroLine,
  buttonLabel: EMAIL_MAGIC_LINK_DEFAULTS.buttonLabel,
  greeting: EMAIL_MAGIC_LINK_DEFAULTS.greeting,
  body: EMAIL_MAGIC_LINK_DEFAULTS.body,
};

describe("MagicLink email", () => {
  it("renders Sanity-supplied greeting + body paragraphs", async () => {
    const text = visibleText(await render(<MagicLink {...PROPS} />));
    expect(text).toContain(PROPS.greeting);
    for (const paragraph of portableTextToPlainText(PROPS.body).split("\n\n")) {
      expect(text).toContain(paragraph);
    }
    expect(text).toContain("Josephine ✦");
  });

  it("renders the magic-link URL as the button href", async () => {
    const html = await render(<MagicLink {...PROPS} />);
    expect(linkHrefs(html).has(PROPS.magicLinkUrl)).toBe(true);
  });

  it("uses the ink color token for the button", async () => {
    const html = await render(<MagicLink {...PROPS} />);
    expect(() => assertBrandTokens(html, { ink: true })).not.toThrow();
  });

  it("renders the brand header + hero line + buttonLabel", async () => {
    const text = visibleText(await render(<MagicLink {...PROPS} />));
    expect(text).toContain(EMAIL_SHARED_SHELL_DEFAULTS.brandName);
    expect(text).toContain(PROPS.heroLine);
    expect(text).toContain(PROPS.buttonLabel);
  });

  it("honors shared-shell signoff overrides", async () => {
    const html = await render(
      <MagicLink
        {...PROPS}
        shell={{ ...EMAIL_SHARED_SHELL_DEFAULTS, signOffLine1: "In peace,", signOffLine2: "J." }}
      />,
    );
    expect(visibleText(html)).toContain("In peace,");
    expect(visibleText(html)).toContain("J.");
  });

  it("renders editable single-paragraph body without a default fallback in body slot", async () => {
    const html = await render(
      <MagicLink
        {...PROPS}
        body={stringToPortableTextBlocks("Just one line of body copy here.")}
      />,
    );
    const text = visibleText(html);
    expect(text).toContain("Just one line of body copy here.");
    expect(text).not.toContain(portableTextToPlainText(PROPS.body).split("\n\n")[0]);
  });
});
