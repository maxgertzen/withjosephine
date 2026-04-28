import { defineField, defineType } from "sanity";

export const formSection = defineType({
  name: "formSection",
  title: "Form Section",
  type: "document",
  fields: [
    defineField({
      name: "sectionTitle",
      title: "Section Title",
      type: "string",
      description: "Heading shown above this group of fields (e.g. 'About You', 'Birth Details').",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "sectionDescription",
      title: "Section Description",
      type: "text",
      rows: 2,
      description: "Optional supporting copy shown beneath the section title.",
    }),
    defineField({
      name: "fields",
      title: "Fields",
      type: "array",
      description: "Fields rendered in this section, in order.",
      of: [{ type: "reference", to: [{ type: "formField" }] }],
    }),
    defineField({
      name: "appliesToServices",
      title: "Applies To Services",
      type: "array",
      description: "Limit this section to specific readings. Empty means it applies to all services.",
      of: [{ type: "reference", to: [{ type: "reading" }] }],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
  ],
  orderings: [
    {
      title: "Display Order",
      name: "order",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: { title: "sectionTitle" },
  },
});
