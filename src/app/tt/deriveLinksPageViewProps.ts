import { LINKS_PAGE_BUTTON_SHAPES, LINKS_PAGE_DEFAULTS, LINKS_PAGE_NAME_SIZES } from "@/data/defaults";
import { READINGS } from "@/data/readings";
import { isReadingOnSite } from "@/lib/booking/readingVisibility";
import { nonBlank } from "@/lib/content/nonBlank";
import { linkKey } from "@/lib/links/linkKey";
import { linksPageHref, type LinksPageTarget } from "@/lib/links/linksPageHref";
import { isNotesVisible } from "@/lib/notes/notes";
import { sanityImageUrl } from "@/lib/sanity/imageUrl";
import { mapSocialLinks } from "@/lib/sanity/mappers";
import type {
  SanityLinksPageButton,
  SanityLinksPageState,
  SanityNotesState,
  SanityReading,
  SanitySiteSettings,
} from "@/lib/sanity/types";
import { linksPageColourVariables, safeCssHex } from "@/lib/theme/linksPageStyle";

import type { LinksPageButton, LinksPageViewProps } from "./LinksPageView";

const PHOTO_SOURCE_PX = 224;

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
    const href = key ? linksPageHref(source.target, key, siteOrigin) : null;
    if (!key || !href || seen.has(key)) continue;
    seen.add(key);
    buttons.push({
      key,
      label: source.label,
      subtitle: source.subtitle,
      href,
      destination: source.target.destination,
      standOut: source.standOut,
      position: buttons.length + 1,
    });
  }
  return buttons;
}

function oneOf<T extends string>(choices: readonly T[], value: string | undefined, fallback: T): T {
  return (choices as readonly string[]).includes(value ?? "") ? (value as T) : fallback;
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

  return {
    photoUrl: photo ? sanityImageUrl(photo, { w: PHOTO_SOURCE_PX, h: PHOTO_SOURCE_PX, fit: "crop" }) : undefined,
    name: nonBlank(page?.name) ?? LINKS_PAGE_DEFAULTS.name,
    intro: nonBlank(page?.intro) ?? LINKS_PAGE_DEFAULTS.intro,
    footerLine: nonBlank(page?.footerLine) ?? LINKS_PAGE_DEFAULTS.footerLine,
    nameSize: oneOf(LINKS_PAGE_NAME_SIZES, page?.nameSize, LINKS_PAGE_DEFAULTS.nameSize),
    buttonShape: oneOf(LINKS_PAGE_BUTTON_SHAPES, page?.buttonShape, LINKS_PAGE_DEFAULTS.buttonShape),
    buttons: toButtons(sources, siteOrigin),
    socialLinks: showSocialLinks ? mapSocialLinks(siteSettings) : [],
    colourVariables: linksPageColourVariables(page ?? {}),
    pageColour: safeCssHex(page?.pageColour),
  };
}
