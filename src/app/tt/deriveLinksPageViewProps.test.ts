import { describe, expect, it } from "vitest";

import { LINKS_PAGE_DEFAULTS } from "@/data/defaults";
import { READINGS } from "@/data/readings";
import type {
  SanityLinksPage,
  SanityLinksPageState,
  SanityNotesState,
  SanityReading,
  SanitySiteSettings,
} from "@/lib/sanity/types";

import { deriveLinksPageViewProps } from "./deriveLinksPageViewProps";

const reading = (overrides: Partial<SanityReading>): SanityReading =>
  ({ _id: "r1", name: "Soul Blueprint", slug: "soul-blueprint", onSite: true, ...overrides }) as SanityReading;

const visibleNotes: SanityNotesState = {
  settings: { enabled: true } as SanityNotesState["settings"],
  publishedCount: 2,
};

const siteSettings = {
  socialLinks: [{ platform: "tiktok", url: "https://tiktok.com/@withjosephine", label: "TikTok" }],
} as SanitySiteSettings;

function derive(page: SanityLinksPage | null, extra: Partial<Parameters<typeof deriveLinksPageViewProps>[0]> = {}) {
  const state: SanityLinksPageState = { page, aboutPhotoUrl: "https://cdn.sanity.io/about.jpg" };
  return deriveLinksPageViewProps({
    state,
    readings: [reading({})],
    siteSettings,
    notesState: visibleNotes,
    siteOrigin: "",
    ...extra,
  });
}

describe("deriveLinksPageViewProps defaults", () => {
  it("shows the built-in words, the About photo and one button per on-site reading when nothing is set", () => {
    const props = derive(null, {
      readings: [reading({}), reading({ _id: "r2", name: "Hidden", slug: "hidden", onSite: false })],
    });
    expect(props.name).toBe(LINKS_PAGE_DEFAULTS.name);
    expect(props.intro).toBe(LINKS_PAGE_DEFAULTS.intro);
    expect(props.footerLine).toBe(LINKS_PAGE_DEFAULTS.footerLine);
    expect(props.photoUrl).toContain("https://cdn.sanity.io/about.jpg?");
    expect(props.buttons).toEqual([
      expect.objectContaining({ key: "reading:r1", label: "Soul Blueprint", position: 1 }),
    ]);
    expect(props.colourVariables).toEqual({});
    expect(props.pageColour).toBeUndefined();
  });

  it("falls back to the built-in readings when Sanity has none", () => {
    const props = derive(null, { readings: [] });
    expect(props.buttons.map((button) => button.key)).toEqual(READINGS.map((r) => `reading:${r.id}`));
  });

  it("treats blank words as not set", () => {
    const props = derive({ name: "   ", intro: "", footerLine: undefined });
    expect(props.name).toBe(LINKS_PAGE_DEFAULTS.name);
    expect(props.intro).toBe(LINKS_PAGE_DEFAULTS.intro);
  });
});

describe("deriveLinksPageViewProps buttons", () => {
  it("builds every kind of button in order with keys and tagged links", () => {
    const props = derive({
      buttons: [
        { _key: "a", label: "Book", destination: "reading", reading: { _id: "r1", slug: "soul-blueprint", onSite: true } },
        { _key: "b", label: "Read", destination: "note", note: { _id: "n1", slug: "saturn" }, standOut: true },
        { _key: "c", label: "Home", destination: "home" },
        { _key: "d", label: "Write", destination: "email", email: "hello@withjosephine.com" },
        { _key: "e", label: "Insta", destination: "web", url: "https://instagram.com/withjosephine" },
      ],
    });
    expect(props.buttons.map((b) => [b.label, b.destination, b.position, b.standOut])).toEqual([
      ["Book", "reading", 1, false],
      ["Read", "note", 2, true],
      ["Home", "home", 3, false],
      ["Write", "email", 4, false],
      ["Insta", "web", 5, false],
    ]);
    expect(props.buttons[0].href).toBe(
      "/book/soul-blueprint?utm_source=tiktok&utm_medium=bio&utm_content=reading%3Ar1",
    );
    expect(props.buttons[3].href).toBe("mailto:hello@withjosephine.com");
  });

  it("drops buttons that would lead nowhere or to a hidden page", () => {
    const props = derive(
      {
        buttons: [
          { _key: "a", label: "Off site", destination: "reading", reading: { _id: "r9", slug: "x", onSite: false } },
          { _key: "b", label: "Deleted", destination: "reading", reading: null },
          { _key: "c", label: "Note", destination: "note", note: { _id: "n1", slug: "saturn" } },
          { _key: "d", label: "", destination: "home" },
          { _key: "e", label: "Bad", destination: "web", url: "http://example.com" },
          { _key: "f", label: "Keep", destination: "home" },
        ],
      },
      { notesState: { settings: null, publishedCount: 0 } },
    );
    expect(props.buttons.map((b) => b.label)).toEqual(["Keep"]);
    expect(props.buttons[0].position).toBe(1);
  });

  it("keeps only the first of two buttons that go to the same place", () => {
    const props = derive({
      buttons: [
        { _key: "a", label: "Home", destination: "home" },
        { _key: "b", label: "Home again", destination: "home" },
      ],
    });
    expect(props.buttons.map((b) => b.label)).toEqual(["Home"]);
  });
});

describe("deriveLinksPageViewProps look", () => {
  it("passes picked colours through as variables and paints the page colour on the body", () => {
    const props = derive({ pageColour: { hex: "#0D0B1A" }, wordsColour: { hex: "#FAF8F4" } });
    expect(props.colourVariables["--j-bg-primary"]).toBe("#0D0B1A");
    expect(props.colourVariables["--j-text"]).toBe("#FAF8F4");
    expect(props.pageColour).toBe("#0D0B1A");
  });

  it("uses the chosen name size and ignores unknown values", () => {
    expect(derive({ nameSize: "large" }).nameSize).toBe("large");
    expect(derive({ nameSize: "huge" }).nameSize).toBe(LINKS_PAGE_DEFAULTS.nameSize);
  });

  it("hides the social links when switched off", () => {
    expect(derive({}).socialLinks).toHaveLength(1);
    expect(derive({ showSocialLinks: false }).socialLinks).toEqual([]);
  });

  it("prefers the page's own photo over the About photo", () => {
    expect(derive({ photoUrl: "https://cdn.sanity.io/own.jpg" }).photoUrl).toContain("own.jpg");
  });
});

describe("deriveLinksPageViewProps second line, shape and files", () => {
  it("carries the button's second line and a file download", () => {
    const props = derive({
      buttons: [
        {
          _key: "a",
          label: "What Your Moon Sign Is Trying to Protect",
          subtitle: "Free 20-page guide & reflection workbook",
          destination: "file",
          file: { _id: "file-abc-pdf", url: "https://cdn.sanity.io/files/p/d/abc.pdf" },
        },
        { _key: "b", label: "Home", subtitle: "  ", destination: "home" },
      ],
    });
    expect(props.buttons[0]).toEqual(
      expect.objectContaining({
        key: "file:file-abc-pdf",
        subtitle: "Free 20-page guide & reflection workbook",
        href: "https://cdn.sanity.io/files/p/d/abc.pdf?dl=",
        destination: "file",
      }),
    );
    expect(props.buttons[1].subtitle).toBeUndefined();
  });

  it("drops a file button whose file is gone", () => {
    expect(derive({ buttons: [{ _key: "a", label: "Guide", destination: "file", file: null }] }).buttons).toEqual([]);
  });

  it("uses the chosen button shape and ignores unknown values", () => {
    expect(derive({ buttonShape: "squareShadow" }).buttonShape).toBe("squareShadow");
    expect(derive({ buttonShape: "blob" }).buttonShape).toBe(LINKS_PAGE_DEFAULTS.buttonShape);
  });
});

describe("deriveLinksPageViewProps site address", () => {
  it("prefixes links into the site with the site address, leaving outside links alone", () => {
    const props = derive(
      {
        buttons: [
          { _key: "a", label: "Home", destination: "home" },
          { _key: "b", label: "Insta", destination: "web", url: "https://instagram.com/withjosephine" },
        ],
      },
      { siteOrigin: "https://withjosephine.com" },
    );
    expect(props.buttons.map((b) => b.href)).toEqual([
      "https://withjosephine.com/?utm_source=tiktok&utm_medium=bio&utm_content=home",
      "https://instagram.com/withjosephine",
    ]);
  });
});
