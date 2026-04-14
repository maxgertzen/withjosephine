import { defineField, defineType } from "sanity";

const colorField = (name: string, title: string, defaultValue: string) =>
  defineField({
    name,
    title,
    type: "string",
    initialValue: defaultValue,
    validation: (rule) => rule.regex(/^#[0-9A-Fa-f]{6}$/, { name: "hex color" }),
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
      title: "Brand Colors",
      type: "object",
      group: "colors",
      fields: [
        colorField("midnight", "Midnight (dark bg)", "#0D0B1A"),
        colorField("deep", "Deep (buttons/interactive)", "#1C1935"),
        colorField("cream", "Cream (main bg)", "#FAF8F4"),
        colorField("warm", "Warm (section bg)", "#F5F0E8"),
        colorField("blush", "Blush", "#E8D5C4"),
        colorField("rose", "Rose", "#BF9B8B"),
        colorField("gold", "Gold (accent)", "#C4A46B"),
        colorField("goldLight", "Gold Light", "#D4BC8B"),
        colorField("text", "Body Text", "#3D3633"),
        colorField("muted", "Muted Text", "#7A6F6A"),
        colorField("ivory", "Ivory", "#FAFAF8"),
      ],
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
