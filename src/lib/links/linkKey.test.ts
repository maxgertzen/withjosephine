import { describe, expect, it } from "vitest";

import { linkKey } from "./linkKey";

describe("linkKey", () => {
  it("keys readings and notes by their document id", () => {
    expect(linkKey({ destination: "reading", documentId: "abc" })).toBe("reading:abc");
    expect(linkKey({ destination: "note", documentId: "n1" })).toBe("note:n1");
  });

  it("returns null for a reading or note with nothing picked yet", () => {
    expect(linkKey({ destination: "reading" })).toBeNull();
    expect(linkKey({ destination: "note" })).toBeNull();
  });

  it("uses one fixed key for the home page", () => {
    expect(linkKey({ destination: "home" })).toBe("home");
  });

  it("keys email buttons by address without putting the address in the key", () => {
    const hello = linkKey({ destination: "email", email: "hello@withjosephine.com" });
    expect(hello).toMatch(/^email:[0-9a-f]{8}$/);
    expect(hello).not.toContain("withjosephine");
    expect(linkKey({ destination: "email", email: " Hello@WithJosephine.com " })).toBe(hello);
    expect(linkKey({ destination: "email", email: "other@example.com" })).not.toBe(hello);
    expect(linkKey({ destination: "email" })).toBeNull();
  });

  it("gives two pages on the same website different keys", () => {
    const profile = linkKey({ destination: "web", url: "https://instagram.com/withjosephine" });
    const post = linkKey({ destination: "web", url: "https://instagram.com/p/xyz" });
    expect(profile).toMatch(/^web:[0-9a-f]{8}$/);
    expect(post).toMatch(/^web:[0-9a-f]{8}$/);
    expect(profile).not.toBe(post);
  });

  it("gives the same key to one address written with a trailing slash or a capitalised host", () => {
    expect(linkKey({ destination: "web", url: "https://Instagram.com/withjosephine/" })).toBe(
      linkKey({ destination: "web", url: "https://instagram.com/withjosephine" }),
    );
  });

  it("returns null for a website address that cannot be read", () => {
    expect(linkKey({ destination: "web", url: "not a url" })).toBeNull();
    expect(linkKey({ destination: "web" })).toBeNull();
  });
});
