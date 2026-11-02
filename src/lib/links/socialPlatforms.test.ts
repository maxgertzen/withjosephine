import { describe, expect, it } from "vitest";

import { SOCIAL_PLATFORMS, socialLinkHref, socialPlatformTitle } from "./socialPlatforms";

describe("social platforms", () => {
  it("turns an email address into a mail link and keeps https links", () => {
    expect(socialLinkHref("email", " hello@withjosephine.com ")).toBe("mailto:hello@withjosephine.com");
    expect(socialLinkHref("instagram", "https://instagram.com/withjosephine")).toBe("https://instagram.com/withjosephine");
  });

  it("refuses anything else", () => {
    expect(socialLinkHref("email", "not an email")).toBeNull();
    expect(socialLinkHref("instagram", "http://instagram.com/withjosephine")).toBeNull();
    expect(socialLinkHref("instagram", "javascript:alert(1)")).toBeNull();
    expect(socialLinkHref("instagram", undefined)).toBeNull();
  });

  it("names every platform once", () => {
    const values = SOCIAL_PLATFORMS.map(({ value }) => value);
    expect(new Set(values).size).toBe(values.length);
    expect(socialPlatformTitle("x")).toBe("X (Twitter)");
  });
});
