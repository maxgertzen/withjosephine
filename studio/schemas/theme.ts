import { defineField, defineType } from "sanity";

const BACKGROUND_PRESETS = {
  "Cream": "#FAF8F4",
  "Warm Linen": "#F5F0E8",
  "Ivory": "#FAFAF8",
  "Snow": "#FFFAFA",
  "Alabaster": "#F2F0EB",
};

const DARK_PRESETS = {
  "Midnight": "#0D0B1A",
  "Deep Indigo": "#1C1935",
  "Charcoal": "#1A1A2E",
  "Obsidian": "#0B0B0F",
};

const ACCENT_PRESETS = {
  "Gold": "#C4A46B",
  "Gold Light": "#D4BC8B",
  "Amber": "#D4A853",
  "Champagne": "#C9B77D",
  "Copper": "#B87333",
};

const SKIN_TONE_PRESETS = {
  "Blush": "#E8D5C4",
  "Rose": "#BF9B8B",
  "Dusty Rose": "#C9A9A6",
  "Mauve": "#C4A4A7",
  "Peach": "#E8C8B8",
};

const TEXT_PRESETS = {
  "Warm Charcoal": "#3D3633",
  "Soft Black": "#2B2826",
  "Muted": "#7A6F6A",
  "Stone": "#5C5652",
};

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
    }),
    defineField({
      name: "displayFont",
      title: "Display Font",
      type: "string",
      group: "typography",
      options: {
        list: [
          "Cormorant Garamond",
          "Playfair Display",
          "EB Garamond",
          "Lora",
          "Crimson Text",
          "Libre Baskerville",
        ],
      },
      initialValue: "Cormorant Garamond",
    }),
    defineField({
      name: "bodyFont",
      title: "Body Font",
      type: "string",
      group: "typography",
      options: {
        list: [
          "Inter",
          "DM Sans",
          "Source Sans 3",
          "Nunito Sans",
          "Work Sans",
        ],
      },
      initialValue: "Inter",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Theme" }),
  },
});
