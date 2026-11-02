import { isValidEmail } from "@/lib/formStyles";
import { isHttpsAddress, type LinkDestination, linkKey } from "@/lib/links/linkKey";
import { socialLinkHref } from "@/lib/links/socialPlatforms";
import { contrastRatio, extractHex, READABLE_CONTRAST, themeColorOrBuiltIn } from "@/lib/theme/palette";

export const COLOURS_TOO_CLOSE =
  "These two colours are too close. People will not be able to read the words.";
export const SAME_PLACE_TWICE = "Two buttons go to the same place. Change one of them.";

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

export const SITE_COLOURS_REUSE_MS = 60_000;

export function reuseSiteColoursFor(
  reuseMs: number,
  now: () => number = Date.now,
): (load: () => Promise<SiteColours | null>) => Promise<SiteColours | null> {
  let loaded: { at: number; colours: Promise<SiteColours | null> } | null = null;
  return (load) => {
    if (!loaded || now() - loaded.at >= reuseMs) {
      const colours = load();
      const entry = { at: now(), colours };
      loaded = entry;
      colours.then((value) => {
        if (value === null && loaded === entry) loaded = null;
      });
    }
    return loaded.colours;
  };
}

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
