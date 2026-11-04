import { deriveLinksPageViewProps } from "@/app/tt/deriveLinksPageViewProps";
import type { LinksPageViewProps } from "@/app/tt/LinksPageView";
import type { SanityLinksPage, SanityLinksPageReading } from "@/lib/sanity/types";

const READINGS = [
  { _id: "r1", name: "Soul Blueprint", slug: "soul-blueprint", onSite: true },
  { _id: "r2", name: "Birth Chart Reading", slug: "birth-chart", onSite: true },
  { _id: "r3", name: "Akashic Record Reading", slug: "akashic-record", onSite: true },
] satisfies SanityLinksPageReading[];

const SITE_SOCIAL_LINKS = [
  { platform: "tiktok", url: "https://www.tiktok.com/@withjosephine", label: "TikTok" },
  { platform: "instagram", url: "https://instagram.com/withjosephine", label: "Instagram" },
  { platform: "email", url: "mailto:hello@withjosephine.com", label: "Email" },
];

const FULL_PAGE: SanityLinksPage = {
  name: "Josephine",
  intro: "Your soul has patterns. Your chart reveals them. Your records explain why.",
  footerLine: "withjosephine.com",
  buttons: [
    { _key: "a", label: "Soul Blueprint", destination: "reading", standOut: true, reading: READINGS[0] },
    { _key: "b", label: "Birth Chart Reading", destination: "reading", reading: READINGS[1] },
    { _key: "c", label: "Akashic Record Reading", destination: "reading", reading: READINGS[2] },
    { _key: "d", label: "Read my notes", destination: "home" },
    { _key: "e", label: "Write to me", destination: "email", email: "hello@withjosephine.com" },
  ],
};

function args(page: SanityLinksPage | null): LinksPageViewProps {
  return deriveLinksPageViewProps(
    {
      page,
      aboutPhotoUrl: "/images/josephine-portrait.webp",
      readings: READINGS,
      notesState: null,
      siteSettings: { socialLinks: SITE_SOCIAL_LINKS },
    },
    "",
  );
}

export const LINKS_PAGE_FULL_ARGS = args(FULL_PAGE);

export const LINKS_PAGE_MINIMAL_ARGS = args(null);

export const LINKS_PAGE_DARK_ARGS = args({
  ...FULL_PAGE,
  pageColour: { hex: "#0D0B1A" },
  wordsColour: { hex: "#FAF8F4" },
  buttonColour: { hex: "#FAF8F4" },
  buttonWordsColour: { hex: "#1C1935" },
  nameSize: "large",
});

const BEACONS_VIDEO_IDS = ["7700268561549544711", "7699677717997899015", "7698520041167260936"];

const beaconsLook = args({
  name: "withjosephine",
  intro: "Psychological astrology & Akashic Records readings",
  nameFont: "Zilla Slab",
  nameStyle: "bold",
  textFont: "Bitter",
  socialLinks: [
    { _key: "t", platform: "tiktok", address: "https://www.tiktok.com/@withjosephine" },
    { _key: "e", platform: "email", address: "hello@withjosephine.com" },
  ],
  pageColour: { hex: "#F5F3EF" },
  wordsColour: { hex: "#0D0B1A" },
  buttonColour: { hex: "#1F1E22" },
  buttonWordsColour: { hex: "#FAF8F4" },
  buttonShape: "squareShadow",
  buttons: [
    {
      _key: "a",
      label: "What Your Moon Sign Is Trying to Protect",
      subtitle: "Free 20-page guide & reflection workbook",
      destination: "web",
      url: "https://shop.beacons.ai/withjosephine",
    },
    { _key: "b", label: "Why Your Rising Sign Isn't the Whole Story", subtitle: "Free article", destination: "home" },
    {
      _key: "c",
      label: "Soul Blueprint Reading · $129",
      subtitle: "Your birth chart, Akashic Records & intuitive card pulls",
      destination: "reading",
      reading: READINGS[0],
    },
    {
      _key: "d",
      label: "Birth Chart Reading · $89",
      subtitle: "A deeper understanding of yourself through astrology",
      destination: "reading",
      reading: READINGS[1],
    },
    {
      _key: "e",
      label: "Meet Josephine",
      subtitle: "About me, my approach to readings & FAQs",
      destination: "web",
      url: "https://withjosephine.com/#about",
    },
  ],
});

export const LINKS_PAGE_BEACONS_LOOK_ARGS: LinksPageViewProps = { ...beaconsLook, videoIds: BEACONS_VIDEO_IDS };

export const LINKS_PAGE_EMAIL_FIRST_ARGS: LinksPageViewProps = {
  ...LINKS_PAGE_BEACONS_LOOK_ARGS,
  offersNewsletter: true,
  buttons: LINKS_PAGE_BEACONS_LOOK_ARGS.buttons.map((button, index) =>
    index === 0 ? { ...button, askForEmail: true, shareHref: undefined } : button,
  ),
};
