import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { EMAIL_MAGIC_LINK_DEFAULTS } from "@/data/defaults";

import { MagicLink } from "./MagicLink";
import { assertBrandTokens, linkHrefs, visibleText } from "./test-helpers";

const PROPS = {
  magicLinkUrl: "https://withjosephine.com/api/auth/magic-link/verify?token=abc123",
  preview: EMAIL_MAGIC_LINK_DEFAULTS.preview,
  greeting: EMAIL_MAGIC_LINK_DEFAULTS.greeting,
  body: EMAIL_MAGIC_LINK_DEFAULTS.body,
  signOff: EMAIL_MAGIC_LINK_DEFAULTS.signOff,
};

describe("MagicLink email", () => {
  it("renders Sanity-supplied greeting + body paragraphs", async () => {
    const text = visibleText(await render(<MagicLink {...PROPS} />));
    expect(text).toContain(PROPS.greeting);
    for (const paragraph of PROPS.body) {
      expect(text).toContain(paragraph);
    }
    expect(text).toContain("Josephine ✦");
  });

  it("renders the magic-link URL as an anchor href", async () => {
    const html = await render(<MagicLink {...PROPS} />);
    expect(linkHrefs(html).has(PROPS.magicLinkUrl)).toBe(true);
  });

  it("uses the ink color token for the link", async () => {
    const html = await render(<MagicLink {...PROPS} />);
    expect(() => assertBrandTokens(html, { ink: true })).not.toThrow();
  });

  it("renders a custom sign-off when supplied (Sanity override)", async () => {
    const html = await render(<MagicLink {...PROPS} signOff="In peace, J." />);
    expect(visibleText(html)).toContain("In peace, J.");
  });

  it("renders editable single-paragraph body without a default fallback in body slot", async () => {
    const html = await render(
      <MagicLink {...PROPS} body={["Just one line of body copy here."]} />,
    );
    const text = visibleText(html);
    expect(text).toContain("Just one line of body copy here.");
    expect(text).not.toContain(PROPS.body[0]);
  });
});
