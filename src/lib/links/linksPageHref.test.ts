import { describe, expect, it } from "vitest";

import { linksPageHref } from "./linksPageHref";

describe("linksPageHref", () => {
  it("adds the TikTok bio tags and the button key to links into the site", () => {
    expect(linksPageHref({ destination: "reading", slug: "soul-blueprint" }, "reading:abc")).toBe(
      "/book/soul-blueprint?utm_source=tiktok&utm_medium=bio&utm_content=reading%3Aabc",
    );
    expect(linksPageHref({ destination: "note", slug: "saturn" }, "note:n1")).toBe(
      "/notes/saturn?utm_source=tiktok&utm_medium=bio&utm_content=note%3An1",
    );
    expect(linksPageHref({ destination: "home" }, "home")).toBe(
      "/?utm_source=tiktok&utm_medium=bio&utm_content=home",
    );
  });

  it("points links into the site at the site address when the build knows it", () => {
    expect(linksPageHref({ destination: "home" }, "home", "https://withjosephine.com")).toBe(
      "https://withjosephine.com/?utm_source=tiktok&utm_medium=bio&utm_content=home",
    );
    expect(linksPageHref({ destination: "web", url: "https://example.com" }, "web:x", "https://withjosephine.com")).toBe(
      "https://example.com",
    );
  });

  it("leaves email and outside website links untagged", () => {
    expect(linksPageHref({ destination: "email", email: " hello@withjosephine.com " }, "email:x")).toBe(
      "mailto:hello@withjosephine.com",
    );
    expect(linksPageHref({ destination: "web", url: "https://instagram.com/withjosephine" }, "web:x")).toBe(
      "https://instagram.com/withjosephine",
    );
  });

  it("accepts a website address typed with a capital HTTPS", () => {
    expect(linksPageHref({ destination: "web", url: "HTTPS://example.com/page" }, "web:x")).toBe("HTTPS://example.com/page");
  });

  it("links an uploaded file as a download", () => {
    expect(
      linksPageHref({ destination: "file", fileUrl: "https://cdn.sanity.io/files/p/d/guide.pdf" }, "file:x"),
    ).toBe("https://cdn.sanity.io/files/p/d/guide.pdf?dl=");
    expect(linksPageHref({ destination: "file", fileUrl: "https://evil.example/x.pdf" }, "file:x")).toBeNull();
  });

  it("returns null when there is nowhere to go", () => {
    expect(linksPageHref({ destination: "reading" }, "reading:x")).toBeNull();
    expect(linksPageHref({ destination: "email" }, "email:x")).toBeNull();
    expect(linksPageHref({ destination: "web", url: "javascript:alert(1)" }, "web:x")).toBeNull();
    expect(linksPageHref({ destination: "web", url: "http://example.com" }, "web:x")).toBeNull();
  });
});
