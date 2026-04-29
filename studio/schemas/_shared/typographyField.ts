import { defineField } from "sanity";

const FONT_FAMILIES = [
  { title: "Inherit", value: "inherit" },
  { title: "Cormorant Garamond (display)", value: "cormorant" },
  { title: "Inter (body)", value: "inter" },
];

const SIZE_TOKENS = [
  { title: "Inherit", value: "inherit" },
  { title: "Display XL", value: "displayXl" },
  { title: "Display L", value: "displayL" },
  { title: "Display M", value: "displayM" },
  { title: "Body L", value: "bodyL" },
  { title: "Body M", value: "bodyM" },
  { title: "Body S", value: "bodyS" },
  { title: "Caption", value: "caption" },
];

const WEIGHTS = [
  { title: "Inherit", value: "inherit" },
  { title: "Regular (400)", value: "400" },
  { title: "Medium (500)", value: "500" },
  { title: "Semibold (600)", value: "600" },
  { title: "Italic", value: "italic" },
];

const COLOR_TOKENS = [
  { title: "Inherit", value: "inherit" },
  { title: "Body text", value: "bodyText" },
  { title: "Muted", value: "muted" },
  { title: "Deep (interactive)", value: "deep" },
  { title: "Cream", value: "cream" },
  { title: "Gold accent", value: "gold" },
  { title: "Gold light", value: "goldLight" },
];

export const typographyField = (description: string) =>
  defineField({
    name: "typography",
    title: "Typography Override",
    type: "object",
    description,
    fields: [
      defineField({
        name: "fontFamily",
        title: "Font Family",
        type: "string",
        options: { list: FONT_FAMILIES, layout: "dropdown" },
      }),
      defineField({
        name: "sizeToken",
        title: "Size Token",
        type: "string",
        options: { list: SIZE_TOKENS, layout: "dropdown" },
      }),
      defineField({
        name: "weight",
        title: "Weight",
        type: "string",
        options: { list: WEIGHTS, layout: "dropdown" },
      }),
      defineField({
        name: "colorToken",
        title: "Color Token",
        type: "string",
        options: { list: COLOR_TOKENS, layout: "dropdown" },
      }),
    ],
    options: { collapsible: true, collapsed: true },
  });

export const nameFollowupField = () =>
  defineField({
    name: "nameFollowup",
    title: "Name Follow-up",
    type: "object",
    description: "Reveal an inline name input when this option is chosen.",
    fields: [
      defineField({ name: "enabled", title: "Enabled", type: "boolean", initialValue: false }),
      defineField({ name: "label", title: "Label", type: "string" }),
      defineField({ name: "placeholder", title: "Placeholder", type: "string" }),
    ],
    options: { collapsible: true, collapsed: true },
  });
