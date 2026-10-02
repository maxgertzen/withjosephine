import { defineArrayMember, defineField, defineType } from "sanity";

import { NotePlatePreview } from "../components/NotePlatePreview";

const lines = (name: string, title: string) =>
  defineField({
    name,
    title,
    type: "array",
    of: [defineArrayMember({ type: "string" })],
  });

export const notePlate = defineType({
  name: "notePlate",
  title: "Plate",
  type: "object",
  description: "A boxed summary inside a note. Leave the second column empty for a one-column Plate.",
  fields: [
    defineField({
      name: "label",
      title: "Label",
      type: "string",
      description: 'Small gold capitals at the top, e.g. "Read together".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "layout",
      title: "Two columns on phones",
      type: "string",
      description: "Wider screens always show two columns side by side.",
      options: {
        list: [
          { title: "Stacked", value: "stacked" },
          { title: "Side by side", value: "sideBySide" },
        ],
        layout: "radio",
        direction: "horizontal",
      },
      initialValue: "stacked",
    }),
    defineField({ name: "leftHeading", title: "First column heading", type: "string" }),
    lines("leftLines", "First column lines"),
    defineField({ name: "rightHeading", title: "Second column heading", type: "string" }),
    lines("rightLines", "Second column lines"),
  ],
  preview: {
    select: {
      label: "label",
      plateLayout: "layout",
      leftHeading: "leftHeading",
      leftLines: "leftLines",
      rightHeading: "rightHeading",
      rightLines: "rightLines",
    },
  },
  components: { preview: NotePlatePreview },
});
