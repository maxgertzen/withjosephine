import { describe, expect, it } from "vitest";

import { SHARE_APPS, shareAppHref } from "./shareTargets";

const URL_TO_SHARE = "https://withjosephine.com/book/soul-blueprint";

describe("shareAppHref", () => {
  it("puts the page address and its title into every app's share link", () => {
    const hrefs = Object.fromEntries(SHARE_APPS.map((app) => [app, shareAppHref(app, URL_TO_SHARE, "Soul Blueprint & more")]));
    expect(hrefs).toEqual({
      whatsapp: "https://wa.me/?text=Soul%20Blueprint%20%26%20more%20https%3A%2F%2Fwithjosephine.com%2Fbook%2Fsoul-blueprint",
      facebook: "https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Fwithjosephine.com%2Fbook%2Fsoul-blueprint",
      x: "https://x.com/intent/post?url=https%3A%2F%2Fwithjosephine.com%2Fbook%2Fsoul-blueprint&text=Soul%20Blueprint%20%26%20more",
      telegram: "https://t.me/share/url?url=https%3A%2F%2Fwithjosephine.com%2Fbook%2Fsoul-blueprint&text=Soul%20Blueprint%20%26%20more",
      email: "mailto:?subject=Soul%20Blueprint%20%26%20more&body=https%3A%2F%2Fwithjosephine.com%2Fbook%2Fsoul-blueprint",
    });
  });
});
