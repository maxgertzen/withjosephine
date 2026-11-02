import { stegaClean } from "@sanity/client/stega";

import {
  LINKS_PAGE_BUTTON_SHAPES,
  LINKS_PAGE_DEFAULTS,
  LINKS_PAGE_LETTER_CASES,
  LINKS_PAGE_NAME_SIZES,
  LINKS_PAGE_NAME_STYLES,
  LINKS_PAGE_PHOTO_PX,
} from "@/data/defaults";
import { READINGS } from "@/data/readings";
import { isReadingOnSite } from "@/lib/booking/readingVisibility";
import { nonBlank, withNonBlankOverrides } from "@/lib/content/nonBlank";
import { linkKey } from "@/lib/links/linkKey";
import { linksPageAddresses, type LinksPageTarget } from "@/lib/links/linksPageHref";
import { socialLinkHref, socialPlatformTitle } from "@/lib/links/socialPlatforms";
import { isNotesVisible } from "@/lib/notes/notes";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import { type MappedSocialLink, mapSocialLinks } from "@/lib/sanity/mappers";
import type {
  SanityLinksPage,
  SanityLinksPageButton,
  SanityLinksPageState,
  SanityNotesState,
  SanityReading,
  SanitySiteSettings,
} from "@/lib/sanity/types";
import { linksPageColourVariables, safeCssHex } from "@/lib/theme/linksPageStyle";

import type { LinksPageButton, LinksPageViewProps } from "./LinksPageView";

const PHOTO_SOURCE_PX = LINKS_PAGE_PHOTO_PX.max * 2;

type ButtonSource = {
  label: string;
  subtitle?: string;
  standOut: boolean;
  target: LinksPageTarget;
};

function defaultButtonSources(readings: SanityReading[]): ButtonSource[] {
  const shown =
    readings.length > 0
      ? readings.filter(isReadingOnSite).map((reading) => ({ id: reading._id, slug: reading.slug, name: reading.name }))
      : READINGS.map((reading) => ({ id: reading.id, slug: reading.id, name: reading.name }));
  return shown.map((reading) => ({
    label: reading.name,
    standOut: false,
    target: { destination: "reading", documentId: reading.id, slug: reading.slug },
  }));
}

function pickedButtonSource(button: SanityLinksPageButton, notesVisible: boolean): ButtonSource | null {
  const label = nonBlank(button.label);
  if (!label || !button.destination) return null;
  const common = { label, subtitle: nonBlank(button.subtitle), standOut: button.standOut === true };
  switch (button.destination) {
    case "reading":
      if (!button.reading || !isReadingOnSite(button.reading)) return null;
      return {
        ...common,
        target: { destination: "reading", documentId: button.reading._id, slug: button.reading.slug },
      };
    case "note":
      if (!button.note || !notesVisible) return null;
      return {
        ...common,
        target: { destination: "note", documentId: button.note._id, slug: button.note.slug },
      };
    case "home":
      return { ...common, target: { destination: "home" } };
    case "email":
      return { ...common, target: { destination: "email", email: button.email } };
    case "web":
      return { ...common, target: { destination: "web", url: button.url } };
    case "file":
      if (!button.file) return null;
      return {
        ...common,
        target: { destination: "file", documentId: button.file._id, fileUrl: button.file.url },
      };
  }
}

function toButtons(sources: ButtonSource[], siteOrigin: string): LinksPageButton[] {
  const buttons: LinksPageButton[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    const key = linkKey(source.target);
    const addresses = key ? linksPageAddresses(source.target, key, siteOrigin) : null;
    if (!key || !addresses || seen.has(key)) continue;
    seen.add(key);
    buttons.push({
      key,
      label: source.label,
      subtitle: source.subtitle,
      ...addresses,
      destination: source.target.destination,
      standOut: source.standOut,
      position: buttons.length + 1,
    });
  }
  return buttons;
}

function pageSocialLinks(page: SanityLinksPage | null): MappedSocialLink[] {
  return (page?.socialLinks ?? []).flatMap(({ platform, address }) => {
    if (!platform) return [];
    const url = socialLinkHref(platform, address);
    const label = socialPlatformTitle(platform);
    return url && label ? [{ platform, url, label }] : [];
  });
}

function photoPx(chosen: number | undefined): number {
  const { min, max, step, standard } = LINKS_PAGE_PHOTO_PX;
  if (typeof chosen !== "number" || !Number.isFinite(chosen)) return standard;
  const onTheBar = min + Math.round((chosen - min) / step) * step;
  return Math.min(max, Math.max(min, onTheBar));
}

function oneOf<T extends string>(choices: readonly T[], value: string | undefined, fallback: T): T {
  const clean = value === undefined ? undefined : stegaClean(value);
  return (choices as readonly string[]).includes(clean ?? "") ? (clean as T) : fallback;
}

export function deriveLinksPageViewProps(input: {
  state: SanityLinksPageState | null;
  readings: SanityReading[];
  siteSettings: SanitySiteSettings | null;
  notesState: SanityNotesState | null;
  siteOrigin: string;
}): LinksPageViewProps {
  const { state, readings, siteSettings, notesState, siteOrigin } = input;
  const page = state?.page ?? null;
  const notesVisible = isNotesVisible(notesState);
  const pickedButtons = page?.buttons ?? [];
  const sources =
    pickedButtons.length > 0
      ? pickedButtons
          .map((button) => pickedButtonSource(button, notesVisible))
          .filter((source): source is ButtonSource => source !== null)
      : defaultButtonSources(readings);
  const photo = page?.photoUrl || state?.aboutPhotoUrl || undefined;
  const showSocialLinks = page?.showSocialLinks ?? LINKS_PAGE_DEFAULTS.showSocialLinks;
  const ownSocialLinks = pageSocialLinks(page);

  return {
    photoUrl: photo ? sanityImageUrl(photo, { w: PHOTO_SOURCE_PX, h: PHOTO_SOURCE_PX, fit: "crop" }) : undefined,
    name: nonBlank(page?.name) ?? LINKS_PAGE_DEFAULTS.name,
    intro: nonBlank(page?.intro) ?? LINKS_PAGE_DEFAULTS.intro,
    footerLine: nonBlank(page?.footerLine) ?? LINKS_PAGE_DEFAULTS.footerLine,
    nameSize: oneOf(LINKS_PAGE_NAME_SIZES, page?.nameSize, LINKS_PAGE_DEFAULTS.nameSize),
    photoSize: photoPx(page?.photoSize),
    buttonShape: oneOf(LINKS_PAGE_BUTTON_SHAPES, page?.buttonShape, LINKS_PAGE_DEFAULTS.buttonShape),
    nameStyle: oneOf(LINKS_PAGE_NAME_STYLES, page?.nameStyle, LINKS_PAGE_DEFAULTS.nameStyle),
    buttonLetterCase: oneOf(LINKS_PAGE_LETTER_CASES, page?.buttonLetterCase, LINKS_PAGE_DEFAULTS.buttonLetterCase),
    buttons: toButtons(sources, siteOrigin),
    shareWords:
      (page?.showShareButtons ?? LINKS_PAGE_DEFAULTS.showShareButtons)
        ? withNonBlankOverrides(LINKS_PAGE_DEFAULTS.shareWords, page?.shareWords)
        : undefined,
    videosTitle: nonBlank(page?.videosTitle) ?? LINKS_PAGE_DEFAULTS.videosTitle,
    videoIds: [],
    playVideo: nonBlank(page?.playVideo) ?? LINKS_PAGE_DEFAULTS.playVideo,
    socialLinks: showSocialLinks ? (ownSocialLinks.length > 0 ? ownSocialLinks : mapSocialLinks(siteSettings)) : [],
    colourVariables: linksPageColourVariables(page ?? {}),
    pageColour: safeCssHex(page?.pageColour),
  };
}
