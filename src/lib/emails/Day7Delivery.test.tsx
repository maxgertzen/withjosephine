import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";

import { Day7Delivery } from "./Day7Delivery";
import { linkHrefs, visibleText } from "./test-helpers";

const PROPS = {
  firstName: "Ada",
  readingName: "Soul Blueprint",
  listenUrl: "https://withjosephine.com/listen/abc.def",
};

const LEGACY_BODY_LINES = [
  "Hi Ada,",
  "Your Soul Blueprint is ready. Everything is here:",
  "https://withjosephine.com/listen/abc.def",
  "The voice note is best with headphones, somewhere quiet. The PDF is yours to keep — print it, save it, mark it up, whatever feels right. Listen in one sitting if you can; some of it lands across a whole afternoon, not all at once.",
  "If anything you hear sits hard, or if a question opens up after, please write to me. I'd rather know than not.",
  "With love,",
  "Josephine ✦",
] as const;

describe("Day7Delivery — visual parity with legacy resend.tsx", () => {
  it("renders every body line from the legacy email", async () => {
    const text = visibleText(await render(<Day7Delivery {...PROPS} />));
    for (const line of LEGACY_BODY_LINES) {
      expect(text).toContain(line);
    }
  });

  it("includes the listen URL as an anchor href", async () => {
    const html = await render(<Day7Delivery {...PROPS} />);
    expect(linkHrefs(html).has(PROPS.listenUrl)).toBe(true);
  });

  it("uses the ink color #1C1935 from email tokens for the link", async () => {
    const html = await render(<Day7Delivery {...PROPS} />);
    expect(html.toLowerCase()).toContain("#1c1935");
  });

  it("escapes HTML in firstName", async () => {
    const html = await render(<Day7Delivery {...PROPS} firstName="<x>" />);
    expect(html).not.toContain("<x>Y");
    expect(html).toContain("&lt;x&gt;");
  });
});
