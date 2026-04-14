import { defineField, defineType } from "sanity";

const BACKGROUND_PRESETS = [
  { title: "Cream", value: "#FAF8F4" },
  { title: "Warm Linen", value: "#F5F0E8" },
  { title: "Ivory", value: "#FAFAF8" },
  { title: "Snow", value: "#FFFAFA" },
  { title: "Alabaster", value: "#F2F0EB" },
];

const DARK_PRESETS = [
  { title: "Midnight", value: "#0D0B1A" },
  { title: "Deep Indigo", value: "#1C1935" },
  { title: "Charcoal", value: "#1A1A2E" },
  { title: "Obsidian", value: "#0B0B0F" },
];

const ACCENT_PRESETS = [
  { title: "Gold", value: "#C4A46B" },
  { title: "Gold Light", value: "#D4BC8B" },
  { title: "Amber", value: "#D4A853" },
  { title: "Champagne", value: "#C9B77D" },
  { title: "Copper", value: "#B87333" },
];

const SKIN_TONE_PRESETS = [
  { title: "Blush", value: "#E8D5C4" },
  { title: "Rose", value: "#BF9B8B" },
  { title: "Dusty Rose", value: "#C9A9A6" },
  { title: "Mauve", value: "#C4A4A7" },
  { title: "Peach", value: "#E8C8B8" },
];

const TEXT_PRESETS = [
  { title: "Warm Charcoal", value: "#3D3633" },
  { title: "Soft Black", value: "#2B2826" },
  { title: "Muted", value: "#7A6F6A" },
  { title: "Stone", value: "#5C5652" },
];

const semanticColorField = (
  name: string,
  title: string,
  description: string,
  colorList: { title: string; value: string }[]
) =>
  defineField({
    name,
    title,
    type: "color",
    description,
    options: { colorList },
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
          [...DARK_PRESETS, ...TEXT_PRESETS]
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
