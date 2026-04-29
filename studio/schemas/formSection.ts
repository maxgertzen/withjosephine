import { defineField, defineType } from "sanity";
import { typographyField } from "./_shared/typographyField";

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
      name: "clarificationNote",
      title: "Clarification Note",
      type: "text",
      rows: 3,
      description:
        "Italicised gold marginalia shown alongside the section (e.g. ✦ note about Akashic records).",
    }),
    defineField({
      name: "transitionLine",
      title: "Transition Line",
      type: "text",
      rows: 2,
      description:
        "Italic Cormorant transition shown above the section title on a new page (e.g. 'First — so I can find you in the records.').",
    }),
    defineField({
      name: "pageBoundary",
      title: "Start a New Page",
      type: "boolean",
      description:
        "When true, this section begins a new page in the paginated intake form. The first section never starts a new page.",
      initialValue: false,
    }),
    defineField({
      name: "marginaliaLabel",
      title: "Marginalia Label",
      type: "string",
      description:
        "Short label shown in the page indicator gutter (e.g. 'About you', 'Birth details'). Defaults to a slug of the section title.",
      validation: (rule) => rule.max(80),
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
    typographyField(
      "Optional per-section typography override. Affects the section title and transition copy. Leave blank to inherit.",
    ),
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
