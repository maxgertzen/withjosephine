import { isValidEmail } from "@/lib/formStyles";
import { isHttpsAddress, type LinkDestination, linkKey } from "@/lib/links/linkKey";
import { socialLinkHref } from "@/lib/links/socialPlatforms";
import type { LinksPageColours } from "@/lib/theme/linksPageStyle";
import { contrastRatio, extractHex, READABLE_CONTRAST, themeColorOrBuiltIn } from "@/lib/theme/palette";

export const COLOURS_TOO_CLOSE =
  "These two colours are too close. People will not be able to read the words.";
export const SAME_PLACE_TWICE = "Two buttons go to the same place. Change one of them.";
export const LINKS_PAGE_HARD_TO_READ =
  "With this colour, some words on Josephine's Link Tree would be hard to read. Pick another colour here, or open Josephine's Link Tree and change its colours.";

export const SITE_COLOURS_QUERY = `*[_id == "theme"][0].colors{bgPrimary, textPrimary, bgInteractive, textOnDark}`;

export type SiteColours = {
  bgPrimary: string;
  textPrimary: string;
  bgInteractive: string;
  textOnDark: string;
};

export function siteColoursFromTheme(themeColours: Record<string, unknown> | null): SiteColours {
  return {
    bgPrimary: themeColorOrBuiltIn(themeColours, "bgPrimary"),
    textPrimary: themeColorOrBuiltIn(themeColours, "textPrimary"),
    bgInteractive: themeColorOrBuiltIn(themeColours, "bgInteractive"),
    textOnDark: themeColorOrBuiltIn(themeColours, "textOnDark"),
  };
}

export const PUBLISHED_READ_REUSE_MS = 60_000;

export function reuseFor<T>(
  reuseMs: number,
  now: () => number = Date.now,
): (load: () => Promise<T | null>) => Promise<T | null> {
  let loaded: { at: number; answer: Promise<T | null> } | null = null;
  return (load) => {
    if (!loaded || now() - loaded.at >= reuseMs) {
      const answer = load();
      const entry = { at: now(), answer };
      loaded = entry;
      answer.then((value) => {
        if (value === null && loaded === entry) loaded = null;
      });
    }
    return loaded.answer;
  };
}

export type ReadablePairRule = {
  words: keyof LinksPageColours;
  background: keyof LinksPageColours;
  siteWords: keyof SiteColours;
  siteBackground: keyof SiteColours;
};

export const LINKS_PAGE_READABLE_PAIRS = {
  words: { words: "wordsColour", background: "pageColour", siteWords: "textPrimary", siteBackground: "bgPrimary" },
  buttonWords: {
    words: "buttonWordsColour",
    background: "buttonColour",
    siteWords: "textOnDark",
    siteBackground: "bgInteractive",
  },
} as const satisfies Record<string, ReadablePairRule>;

export const LINKS_PAGE_COLOURS_QUERY = `*[_type == "linksPage"][0]{pageColour, wordsColour, buttonColour, buttonWordsColour}`;

export function bothColoursPicked(words: unknown, background: unknown): boolean {
  return extractHex(words) !== undefined && extractHex(background) !== undefined;
}

export function readablePair(
  pickedWords: unknown,
  siteWords: string | undefined,
  pickedBackground: unknown,
  siteBackground: string | undefined,
): true | string {
  const words = extractHex(pickedWords) ?? siteWords;
  const background = extractHex(pickedBackground) ?? siteBackground;
  if (!words || !background) return true;
  return contrastRatio(words, background) >= READABLE_CONTRAST ? true : COLOURS_TOO_CLOSE;
}

export type StoredLinkButton = {
  destination?: LinkDestination;
  reading?: { _ref?: string };
  note?: { _ref?: string };
  file?: { asset?: { _ref?: string } };
  email?: string;
  url?: string;
};

function pickedDocumentId(button: StoredLinkButton): string | undefined {
  if (button.destination === "reading") return button.reading?._ref;
  if (button.destination === "note") return button.note?._ref;
  if (button.destination === "file") return button.file?.asset?._ref;
  return undefined;
}

function buttonKey(button: StoredLinkButton): string | null {
  if (!button.destination) return null;
  return linkKey({
    destination: button.destination,
    documentId: pickedDocumentId(button),
    email: button.email,
    url: button.url,
  });
}

export function noButtonGoesToTheSamePlace(buttons: StoredLinkButton[] | undefined): true | string {
  const keys = (buttons ?? []).map(buttonKey).filter((key): key is string => key !== null);
  return new Set(keys).size === keys.length ? true : SAME_PLACE_TWICE;
}

const PICK_WHERE_IT_GOES: Record<Exclude<LinkDestination, "home">, string> = {
  reading: "Pick which reading this button goes to.",
  note: "Pick which note this button goes to.",
  email: "Type the email address this button opens.",
  web: "Type the website address this button opens.",
  file: "Upload the file this button downloads.",
};

const NOT_AN_EMAIL = "This does not look like an email address.";
const NOT_HTTPS = "The address must start with https://";

export function checkSocialLink(platform: string | undefined, address: unknown): true | string {
  if (!platform) return true;
  if (socialLinkHref(platform, typeof address === "string" ? address : undefined)) return true;
  return platform === "email" ? NOT_AN_EMAIL : NOT_HTTPS;
}

export function checkButtonTarget(
  destination: Exclude<LinkDestination, "home">,
  pickedDestination: string | undefined,
  value: unknown,
): true | string {
  if (pickedDestination !== destination) return true;
  const fileMissing = destination === "file" && !(value as { asset?: { _ref?: string } } | undefined)?.asset?._ref;
  if (!value || fileMissing) return PICK_WHERE_IT_GOES[destination];
  if (destination === "email" && !isValidEmail(String(value))) return NOT_AN_EMAIL;
  if (destination === "web" && !isHttpsAddress(String(value))) return NOT_HTTPS;
  return true;
}

export function linksPageStaysReadable(
  linksPage: LinksPageColours | null,
  themeColours: Record<string, unknown> | null,
): true | string {
  if (!linksPage) return true;
  const site = siteColoursFromTheme(themeColours);
  const unreadable = Object.values(LINKS_PAGE_READABLE_PAIRS).some((pair) => {
    const words = linksPage[pair.words];
    const background = linksPage[pair.background];
    const onlyOnePicked = (extractHex(words) === undefined) !== (extractHex(background) === undefined);
    return onlyOnePicked && readablePair(words, site[pair.siteWords], background, site[pair.siteBackground]) !== true;
  });
  return unreadable ? LINKS_PAGE_HARD_TO_READ : true;
}
