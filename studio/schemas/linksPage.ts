import { defineArrayMember, defineField, defineType, type ValidationContext } from "sanity";

import {
  LINKS_PAGE_DEFAULTS,
  LINKS_PAGE_MAX_BUTTONS,
  LINKS_PAGE_MAX_SOCIAL_LINKS,
  LINKS_PAGE_MAX_VIDEOS,
  LINKS_PAGE_SITE_STYLE,
  type LinksPageButtonShape,
  type LinksPageContent,
  type LinksPageLetterCase,
  type LinksPageNameSize,
  type LinksPageNameStyle,
  type LinksPageShareWords,
} from "../../src/data/defaults";
import type { LinkDestination } from "@/lib/links/linkKey";
import { SOCIAL_PLATFORMS, socialPlatformTitle } from "@/lib/links/socialPlatforms";
import { isTikTokVideoLink } from "@/lib/links/tiktokVideo";
import { ALL_COLOR_PRESETS, LINKS_PAGE_NAME_FONT_NAMES, LINKS_PAGE_TEXT_FONT_NAMES } from "@/lib/theme/palette";
import { PERSPECTIVE_API_VERSION } from "../lib/draftsClient";
import {
  bothColoursPicked,
  checkButtonTarget,
  checkSocialLink,
  noButtonGoesToTheSamePlace,
  readablePair,
  reuseSiteColoursFor,
  SITE_COLOURS_QUERY,
  SITE_COLOURS_REUSE_MS,
  siteColoursFromTheme,
  type SiteColours,
  type StoredLinkButton,
} from "../lib/linksPageValidation";

const DESTINATION_CHOICES: { title: string; value: LinkDestination }[] = [
  { title: "A reading", value: "reading" },
  { title: "A note", value: "note" },
  { title: "The home page", value: "home" },
  { title: "An email", value: "email" },
  { title: "Another website", value: "web" },
  { title: "A file to download", value: "file" },
];

const BUTTON_SHAPE_TITLES: Record<LinksPageButtonShape, string> = {
  round: "Round",
  square: "Square",
  squareShadow: "Square with a shadow underneath",
};

const NAME_SIZE_TITLES: Record<LinksPageNameSize, string> = { small: "Small", medium: "Medium", large: "Large" };

const NAME_STYLE_TITLES: Record<LinksPageNameStyle, string> = {
  slanted: "Thin and slanted",
  bold: "Bold and straight",
};

const LETTER_CASE_TITLES: Record<LinksPageLetterCase, string> = {
  normal: "Normal letters",
  upper: "ALL CAPITAL LETTERS",
};

const socialLink = defineArrayMember({
  name: "linksPageSocialLink",
  title: "Social link",
  type: "object",
  fields: [
    defineField({
      name: "platform",
      title: "Which one",
      type: "string",
      description: "The little picture next to your name matches this.",
      options: { list: SOCIAL_PLATFORMS.map(({ value, title }) => ({ value, title })) },
      validation: (rule) => rule.required().error("Pick which one this is."),
    }),
    defineField({
      name: "address",
      title: "Link or email address",
      type: "string",
      description: "Copy the link from your profile, starting with https://. For Email, type the email address.",
      validation: (rule) =>
        rule.custom((address, context) =>
          checkSocialLink((context.parent as { platform?: string } | undefined)?.platform, address),
        ),
    }),
  ],
  preview: {
    select: { platform: "platform", address: "address" },
    prepare: ({ platform, address }) => ({
      title: socialPlatformTitle(platform) ?? "Not picked yet",
      subtitle: address,
    }),
  },
});

const tiktokVideo = defineArrayMember({
  name: "linksPageVideo",
  title: "TikTok video",
  type: "object",
  fields: [
    defineField({
      name: "url",
      title: "Video link",
      type: "string",
      description: "On TikTok, open the video, tap Share, then Copy link, and paste it here.",
      validation: (rule) => [
        rule.required().error("Paste the link of the video."),
        rule.custom((url) =>
          !url || isTikTokVideoLink(url as string)
            ? true
            : "This is not the link of one TikTok video. Open the video on TikTok, tap Share, then Copy link.",
        ),
      ],
    }),
  ],
  preview: { select: { title: "url" }, prepare: ({ title }) => ({ title: title || "Video with no link yet" }) },
});

const SHARE_WORD_TITLES: Record<keyof LinksPageShareWords, string> = {
  title: "Title of the share menu",
  copyLink: "Copy button",
  copied: "Words after copying",
  email: "Email button",
  close: "Close button",
  shareButton: "Words read out for the three dots",
};

type ChoiceFieldName = keyof Pick<LinksPageContent, "nameSize" | "nameStyle" | "buttonLetterCase" | "buttonShape">;

const choiceField = <T extends string>(
  name: ChoiceFieldName,
  title: string,
  titles: Record<T, string>,
  options: { description?: string; direction?: "horizontal" } = {},
) =>
  defineField({
    name,
    title,
    type: "string",
    group: "look",
    description: options.description,
    options: {
      list: (Object.keys(titles) as T[]).map((value) => ({ title: titles[value], value })),
      layout: "radio",
      direction: options.direction,
    },
    initialValue: LINKS_PAGE_DEFAULTS[name],
  });

const DESTINATION_TITLES = Object.fromEntries(DESTINATION_CHOICES.map((choice) => [choice.value, choice.title]));

const SITE_STYLE_CHOICE = { title: "Same as the rest of the site", value: LINKS_PAGE_SITE_STYLE };

const hiddenUnless = (destination: LinkDestination) => ({ parent }: { parent?: unknown }) =>
  (parent as { destination?: string } | undefined)?.destination !== destination;

function targetRule(destination: Exclude<LinkDestination, "home">) {
  return (value: unknown, context: ValidationContext) =>
    checkButtonTarget(destination, (context.parent as { destination?: string } | undefined)?.destination, value);
}

const reusedSiteColours = reuseSiteColoursFor(SITE_COLOURS_REUSE_MS);

async function fetchSiteColours(context: ValidationContext): Promise<SiteColours | null> {
  try {
    const themeColours = await context
      .getClient({ apiVersion: PERSPECTIVE_API_VERSION })
      .withConfig({ perspective: "published" })
      .fetch<Record<string, unknown> | null>(SITE_COLOURS_QUERY);
    return siteColoursFromTheme(themeColours);
  } catch {
    return null;
  }
}

type ColourDocument = {
  pageColour?: unknown;
  wordsColour?: unknown;
  buttonColour?: unknown;
  buttonWordsColour?: unknown;
};

type ReadablePairRule = {
  words: keyof ColourDocument;
  background: keyof ColourDocument;
  siteWords: keyof SiteColours;
  siteBackground: keyof SiteColours;
};

const colourField = (name: keyof ColourDocument, title: string, pair?: ReadablePairRule) =>
  defineField({
    name,
    title,
    type: "color",
    group: "look",
    description:
      "Pick one of the site colours or any colour you like. Leave it blank to use the colour from the rest of the site. If two colours are too close to read, the Studio tells you and you cannot publish.",
    options: { colorList: [...ALL_COLOR_PRESETS], disableAlpha: true },
    validation: pair
      ? (rule) =>
          rule.custom(async (_value, context) => {
            const doc = (context.document ?? {}) as ColourDocument;
            const words = doc[pair.words];
            const background = doc[pair.background];
            const site = bothColoursPicked(words, background)
              ? undefined
              : await reusedSiteColours(() => fetchSiteColours(context));
            return readablePair(words, site?.[pair.siteWords], background, site?.[pair.siteBackground]);
          })
      : undefined,
  });

const fontField = (name: string, title: string, fonts: string[]) =>
  defineField({
    name,
    title,
    type: "string",
    group: "look",
    description: "The font for these words.",
    options: { list: [SITE_STYLE_CHOICE, ...fonts.map((font) => ({ title: font, value: font }))] },
    initialValue: LINKS_PAGE_SITE_STYLE,
  });

const linkButton = defineArrayMember({
  name: "linkButton",
  title: "Button",
  type: "object",
  fields: [
    defineField({
      name: "label",
      title: "Button words",
      type: "string",
      description: "What the button says.",
      validation: (rule) => [
        rule.required().error("Type what this button says."),
        rule.max(40).error("Keep the button words to 40 letters or fewer."),
      ],
    }),
    defineField({
      name: "destination",
      title: "Where the button goes",
      type: "string",
      description: "Pick one.",
      options: { list: DESTINATION_CHOICES, layout: "radio" },
      validation: (rule) => rule.required().error("Pick where this button goes."),
    }),
    defineField({
      name: "subtitle",
      title: "Small line under the button words",
      type: "string",
      description: "A short second line on the button, like a price or what is inside. Leave blank for none.",
      validation: (rule) => rule.max(80).error("Keep this line to 80 letters or fewer."),
    }),
    defineField({
      name: "reading",
      title: "Which reading",
      type: "reference",
      to: [{ type: "reading" }],
      hidden: hiddenUnless("reading"),
      validation: (rule) => rule.custom(targetRule("reading")),
    }),
    defineField({
      name: "note",
      title: "Which note",
      type: "reference",
      to: [{ type: "article" }],
      weak: true,
      hidden: hiddenUnless("note"),
      validation: (rule) => rule.custom(targetRule("note")),
    }),
    defineField({
      name: "email",
      title: "Email address",
      type: "string",
      hidden: hiddenUnless("email"),
      validation: (rule) => rule.custom(targetRule("email")),
    }),
    defineField({
      name: "url",
      title: "Website address",
      type: "url",
      description: "Starts with https://",
      hidden: hiddenUnless("web"),
      validation: (rule) => rule.custom(targetRule("web")),
    }),
    defineField({
      name: "file",
      title: "File to download",
      type: "file",
      description: "Upload the file (for example a PDF guide). Tapping the button downloads it.",
      options: { accept: ".pdf,application/pdf" },
      hidden: hiddenUnless("file"),
      validation: (rule) => rule.custom(targetRule("file")),
    }),
    defineField({
      name: "standOut",
      title: "Make this button stand out",
      type: "boolean",
      description: "Puts a gold ring around this button.",
      initialValue: false,
    }),
  ],
  preview: {
    select: { title: "label", destination: "destination", standOut: "standOut" },
    prepare: ({ title, destination, standOut }) => ({
      title: title || "Button with no words yet",
      subtitle: [DESTINATION_TITLES[destination] ?? "Not picked yet", standOut ? "Stands out" : null]
        .filter(Boolean)
        .join(" · "),
    }),
  },
});

export const linksPage = defineType({
  name: "linksPage",
  title: "TikTok links page",
  type: "document",
  groups: [
    { name: "content", title: "Words and buttons", default: true },
    { name: "videos", title: "TikTok videos" },
    { name: "share", title: "Share menu" },
    { name: "look", title: "Colours and fonts" },
    { name: "sharing", title: "Link preview" },
  ],
  fields: [
    defineField({
      name: "photo",
      title: "Photo at the top",
      type: "image",
      group: "content",
      description: "Leave blank to use the photo from the About part of the home page.",
      options: { hotspot: true },
    }),
    defineField({
      name: "name",
      title: "Name at the top",
      type: "string",
      group: "content",
      description: `Leave blank to show "${LINKS_PAGE_DEFAULTS.name}". Changes show on the page a minute or two after you press Publish.`,
    }),
    defineField({
      name: "intro",
      title: "Short line under the name",
      type: "text",
      rows: 3,
      group: "content",
      description: `The words under your name. Leave blank to show "${LINKS_PAGE_DEFAULTS.intro}"`,
    }),
    defineField({
      name: "buttons",
      title: "Buttons",
      type: "array",
      group: "content",
      description:
        "Top to bottom. Drag to reorder. With no buttons, the page shows one button for each reading on the site.",
      of: [linkButton],
      validation: (rule) => [
        rule.max(LINKS_PAGE_MAX_BUTTONS).error(`You can have up to ${LINKS_PAGE_MAX_BUTTONS} buttons.`),
        rule.custom((buttons) => noButtonGoesToTheSamePlace(buttons as StoredLinkButton[] | undefined)),
      ],
    }),
    defineField({
      name: "showSocialLinks",
      title: "Show the social links",
      type: "boolean",
      group: "content",
      description: "Shows the little social pictures under your name.",
      initialValue: LINKS_PAGE_DEFAULTS.showSocialLinks,
    }),
    defineField({
      name: "socialLinks",
      title: "Social links",
      type: "array",
      group: "content",
      description:
        "The little pictures under your name, in this order. Add as many as you like. Leave the list blank to use the ones from Site Settings.",
      of: [socialLink],
      hidden: ({ document }) => document?.showSocialLinks === false,
      validation: (rule) =>
        rule.max(LINKS_PAGE_MAX_SOCIAL_LINKS).error(`You can have up to ${LINKS_PAGE_MAX_SOCIAL_LINKS} social links.`),
    }),
    defineField({
      name: "videosTitle",
      title: "Title above the videos",
      type: "string",
      group: "videos",
      description: `Leave blank to show "${LINKS_PAGE_DEFAULTS.videosTitle}".`,
    }),
    defineField({
      name: "videos",
      title: "TikTok videos",
      type: "array",
      group: "videos",
      description:
        "Videos shown in a row under the buttons, left to right. Visitors see the video picture first and the video plays when they tap it. Leave the list blank to show no videos.",
      of: [tiktokVideo],
      validation: (rule) => rule.max(LINKS_PAGE_MAX_VIDEOS).error(`You can have up to ${LINKS_PAGE_MAX_VIDEOS} videos.`),
    }),
    defineField({
      name: "playVideo",
      title: "Words read out for the play button",
      type: "string",
      group: "videos",
      description: `Phones read these words aloud to people who cannot see the screen. Leave blank for "${LINKS_PAGE_DEFAULTS.playVideo}".`,
    }),
    defineField({
      name: "showShareButtons",
      title: "Show the share button on each button",
      type: "boolean",
      group: "share",
      description: "Adds three small dots on the right of each button. Tapping them lets visitors send that link to a friend.",
      initialValue: LINKS_PAGE_DEFAULTS.showShareButtons,
    }),
    defineField({
      name: "shareWords",
      title: "Words in the share menu",
      type: "object",
      group: "share",
      description: "Leave any of these blank to use the words shown in grey.",
      hidden: ({ document }) => document?.showShareButtons === false,
      fields: (Object.keys(SHARE_WORD_TITLES) as (keyof LinksPageShareWords)[]).map((word) =>
        defineField({
          name: word,
          title: SHARE_WORD_TITLES[word],
          type: "string",
          placeholder: LINKS_PAGE_DEFAULTS.shareWords[word],
          description: word === "shareButton" ? "Phones read these words aloud, followed by the button words." : undefined,
        }),
      ),
    }),
    defineField({
      name: "footerLine",
      title: "Small line at the bottom",
      type: "string",
      group: "content",
      description: `The words at the very bottom. Leave blank to show "${LINKS_PAGE_DEFAULTS.footerLine}".`,
    }),
    colourField("pageColour", "Page colour"),
    colourField("wordsColour", "Words colour", {
      words: "wordsColour",
      background: "pageColour",
      siteWords: "textPrimary",
      siteBackground: "bgPrimary",
    }),
    colourField("buttonColour", "Button colour"),
    colourField("buttonWordsColour", "Button words colour", {
      words: "buttonWordsColour",
      background: "buttonColour",
      siteWords: "textOnDark",
      siteBackground: "bgInteractive",
    }),
    fontField("nameFont", "Font for the name", LINKS_PAGE_NAME_FONT_NAMES),
    fontField("textFont", "Font for the buttons and lines", LINKS_PAGE_TEXT_FONT_NAMES),
    choiceField("nameStyle", "How the name looks", NAME_STYLE_TITLES, { direction: "horizontal" }),
    choiceField("buttonLetterCase", "Letters on the buttons", LETTER_CASE_TITLES, { direction: "horizontal" }),
    choiceField("nameSize", "Size of the name", NAME_SIZE_TITLES, { description: "How big your name is.", direction: "horizontal" }),
    choiceField("buttonShape", "Button shape", BUTTON_SHAPE_TITLES, { description: "How the buttons look." }),
    defineField({
      name: "seo",
      title: "Link preview",
      type: "object",
      group: "sharing",
      description: "What people see when the link to this page is shared in a message.",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Title in link previews",
          type: "string",
          description: `Leave blank to show "${LINKS_PAGE_DEFAULTS.metaTitle}".`,
        }),
        defineField({
          name: "metaDescription",
          title: "Line in link previews",
          type: "text",
          rows: 2,
          description: `Leave blank to show "${LINKS_PAGE_DEFAULTS.metaDescription}"`,
        }),
        defineField({
          name: "ogImage",
          title: "Picture in link previews",
          type: "image",
          description: "Leave blank to use the picture set for the home page.",
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "TikTok links page" }),
  },
});
