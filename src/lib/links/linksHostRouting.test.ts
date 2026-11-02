import { describe, expect, it } from "vitest";

import { isTapCounterPath, routeLinksHost, tapCounterPath } from "./linksHostRouting";

describe("tap counter paths", () => {
  it("puts every tap under /tt/go and recognises only those paths", () => {
    expect(tapCounterPath("reading:abc")).toBe("/tt/go/reading:abc");
    expect(isTapCounterPath(tapCounterPath("home"))).toBe(true);
    expect(isTapCounterPath("/tt")).toBe(false);
    expect(isTapCounterPath("/tt/gone")).toBe(false);
  });
});

describe("routeLinksHost", () => {
  it("serves the links page at the root of links.withjosephine.com", () => {
    expect(routeLinksHost("links.withjosephine.com", "/", "")).toEqual({ kind: "rewrite", pathname: "/tt" });
  });

  it("sends every other path on the links subdomain to the main site, keeping the tags", () => {
    expect(
      routeLinksHost("links.withjosephine.com", "/book/soul-blueprint", "?utm_source=tiktok&utm_content=home"),
    ).toEqual({
      kind: "redirect",
      url: "https://withjosephine.com/book/soul-blueprint?utm_source=tiktok&utm_content=home",
    });
  });

  it("sends the home page button on the subdomain to the main site home page", () => {
    expect(
      routeLinksHost("links.withjosephine.com", "/", "?utm_source=tiktok&utm_medium=bio&utm_content=home"),
    ).toEqual({ kind: "redirect", url: "https://withjosephine.com/?utm_source=tiktok&utm_medium=bio&utm_content=home" });
  });

  it("answers the consent request the links page sends on the subdomain itself, and sends every other API path to the main site", () => {
    expect(routeLinksHost("links.withjosephine.com", "/api/consent", "")).toBeNull();
    expect(routeLinksHost("links.withjosephine.com", "/api/auth/magic-link/verify", "?t=x")).toEqual({
      kind: "redirect",
      url: "https://withjosephine.com/api/auth/magic-link/verify?t=x",
    });
  });

  it("still shows the links page when TikTok adds its own tracking to the bio link", () => {
    expect(routeLinksHost("links.withjosephine.com", "/", "?_t=abc&_r=1")).toEqual({ kind: "rewrite", pathname: "/tt" });
  });

  it("sends the old withjosephine.com/tt link to the subdomain", () => {
    expect(routeLinksHost("withjosephine.com", "/tt", "")).toEqual({
      kind: "redirect",
      url: "https://links.withjosephine.com/",
    });
    expect(routeLinksHost("www.withjosephine.com", "/tt", "?x=1")).toEqual({
      kind: "redirect",
      url: "https://links.withjosephine.com/?x=1",
    });
  });

  it("leaves staging, local and every other main-site path alone", () => {
    expect(routeLinksHost("staging.withjosephine.com", "/tt", "")).toBeNull();
    expect(routeLinksHost("localhost:3000", "/tt", "")).toBeNull();
    expect(routeLinksHost("withjosephine.com", "/", "")).toBeNull();
    expect(routeLinksHost("withjosephine.com", "/tt/go/home", "")).toBeNull();
  });
});
