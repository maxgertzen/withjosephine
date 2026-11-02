import { defineField, defineType, type ValidationContext } from "sanity";

import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  BODY_FONT_NAMES,
  DARK_PRESETS,
  DEFAULT_BODY_FONT,
  DEFAULT_DISPLAY_FONT,
  DISPLAY_FONT_NAMES,
  SKIN_TONE_PRESETS,
  TEXT_PRESETS,
} from "@/lib/theme/palette";

import type { LinksPageColours } from "@/lib/theme/linksPageStyle";

import { publishedValidationClient } from "../lib/draftsClient";
import {
  LINKS_PAGE_COLOURS_QUERY,
  linksPageStaysReadable,
  PUBLISHED_READ_REUSE_MS,
  reuseFor,
} from "../lib/linksPageValidation";

const reusedLinksPageColours = reuseFor<LinksPageColours>(PUBLISHED_READ_REUSE_MS);

async function publishedLinksPageColours(context: ValidationContext): Promise<LinksPageColours | null> {
  try {
    return (await publishedValidationClient(context).fetch<LinksPageColours | null>(LINKS_PAGE_COLOURS_QUERY)) ?? {};
  } catch {
    return null;
  }
}

const semanticColorField = (
  name: string,
  title: string,
  description: string,
  presets: Record<string, string>
) =>
  defineField({
    name,
    title,
    type: "color",
    description,
    options: { colorList: Object.values(presets) },
  });

export const theme = defineType({
  name: "theme",
  title: "Theme",
  type: "document",
  groups: [
    { name: "colors", title: "Colors" },
    { name: "typography", title: "Typography" },
  ],
  fields: [
    defineField({
      name: "colors",
      title: "Colors",
      type: "object",
      group: "colors",
      fields: [
        semanticColorField(
          "bgPrimary",
          "Page Background",
          "Main background color used across all pages",
          BACKGROUND_PRESETS
        ),
        semanticColorField(
          "bgSection",
          "Section Background",
          "Alternating section background (testimonials, about)",
          BACKGROUND_PRESETS
        ),
        semanticColorField(
          "bgDark",
          "Dark Background",
          "Footer and dark sections background",
          DARK_PRESETS
        ),
        semanticColorField(
          "bgInteractive",
          "Button Background",
          "Primary button and interactive element background",
          DARK_PRESETS
        ),
        semanticColorField(
          "textPrimary",
          "Body Text",
          "Main paragraph and body text color",
          TEXT_PRESETS
        ),
        semanticColorField(
          "textHeading",
          "Heading Text",
          "Section headings and titles color",
          { ...DARK_PRESETS, ...TEXT_PRESETS }
        ),
        semanticColorField(
          "textMuted",
          "Muted Text",
          "Secondary text, captions, and metadata",
          TEXT_PRESETS
        ),
        semanticColorField(
          "textOnDark",
          "Text on Dark",
          "Text color used on dark backgrounds and buttons",
          BACKGROUND_PRESETS
        ),
        semanticColorField(
          "accent",
          "Accent Color",
          "Primary accent — decorative lines, highlights, active states",
          ACCENT_PRESETS
        ),
        semanticColorField(
          "accentLight",
          "Accent Light",
          "Lighter accent variant — subtle highlights and hover states",
          ACCENT_PRESETS
        ),
        semanticColorField(
          "blush",
          "Blush",
          "Soft warm tone for decorative orbs and gentle highlights",
          SKIN_TONE_PRESETS
        ),
        semanticColorField(
          "rose",
          "Rose",
          "Deeper warm tone for secondary decorative elements",
          SKIN_TONE_PRESETS
        ),
        semanticColorField(
          "ivory",
          "Ivory",
          "Card and elevated surface background color",
          BACKGROUND_PRESETS
        ),
      ],
      options: {
        columns: 2,
      },
      validation: (rule) =>
        rule
          .custom(async (colours, context) =>
            linksPageStaysReadable(await reusedLinksPageColours(() => publishedLinksPageColours(context)), (colours ?? null) as Record<string, unknown> | null),
          )
          .warning(),
    }),
    defineField({
      name: "displayFont",
      title: "Display Font",
      type: "string",
      group: "typography",
      options: { list: DISPLAY_FONT_NAMES },
      initialValue: DEFAULT_DISPLAY_FONT,
    }),
    defineField({
      name: "bodyFont",
      title: "Body Font",
      type: "string",
      group: "typography",
      options: { list: BODY_FONT_NAMES },
      initialValue: DEFAULT_BODY_FONT,
    }),
  ],
  preview: {
    prepare: () => ({ title: "Theme" }),
  },
});
