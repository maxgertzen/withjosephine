import { defineArrayMember, defineField, defineType, type ValidationContext } from "sanity";

import {
  LINKS_PAGE_DEFAULTS,
  LINKS_PAGE_MAX_BUTTONS,
  LINKS_PAGE_NAME_SIZES,
  LINKS_PAGE_SITE_STYLE,
} from "../../src/data/defaults";
import type { LinkDestination } from "@/lib/links/linkKey";
import { ALL_COLOR_PRESETS, BODY_FONT_NAMES, DISPLAY_FONT_NAMES } from "@/lib/theme/palette";
import { PERSPECTIVE_API_VERSION } from "../lib/draftsClient";
import {
  bothColoursPicked,
  checkButtonTarget,
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
];

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
      description: "Shows the links you set in Site Settings.",
      initialValue: LINKS_PAGE_DEFAULTS.showSocialLinks,
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
    fontField("nameFont", "Font for the name", DISPLAY_FONT_NAMES),
    fontField("textFont", "Font for the buttons and lines", BODY_FONT_NAMES),
    defineField({
      name: "nameSize",
      title: "Size of the name",
      type: "string",
      group: "look",
      description: "How big your name is.",
      options: {
        list: LINKS_PAGE_NAME_SIZES.map((size) => ({ title: size[0].toUpperCase() + size.slice(1), value: size })),
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: LINKS_PAGE_DEFAULTS.nameSize,
    }),
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
