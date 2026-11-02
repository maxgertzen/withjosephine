import type { DocumentLocationResolvers, DocumentResolver } from "sanity/presentation";
import { describe, expect, it } from "vitest";

import { presentationResolve } from "./presentation";

const mainDocuments = (presentationResolve?.mainDocuments ?? []) as DocumentResolver[];
const locations = (presentationResolve?.locations ?? {}) as DocumentLocationResolvers;

const routeIndex = (route: string) => mainDocuments.findIndex((resolver) => resolver.route === route);

describe("presentationResolve", () => {
  it("opens the TikTok links page for /preview/tt, ahead of the legal page wildcard", () => {
    expect(mainDocuments[routeIndex("/preview/tt")]).toMatchObject({ type: "linksPage" });
    expect(routeIndex("/preview/tt")).toBeLessThan(routeIndex("/preview/:slug"));
  });

  it.each(["linksPage", "siteSettings", "landingPage", "theme", "notesSettings"])("lists the TikTok links preview for %s", (type) => {
    expect(locations[type]).toMatchObject({
      locations: expect.arrayContaining([{ title: "TikTok links", href: "/preview/tt" }]),
    });
  });

  it("lists the TikTok links preview for a reading", () => {
    const reading = locations.reading;
    const resolved =
      reading && "resolve" in reading ? reading.resolve?.({ name: "Birth Chart", slug: "birth-chart" }) : null;

    expect(resolved).toMatchObject({
      locations: expect.arrayContaining([{ title: "TikTok links", href: "/preview/tt" }]),
    });
  });
});
