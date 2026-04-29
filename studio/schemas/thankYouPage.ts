import { defineField, defineType } from "sanity";

export const thankYouPage = defineType({
  name: "thankYouPage",
  title: "Thank You Page",
  type: "document",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "Thank you for booking",
    }),
    defineField({
      name: "heroLine",
      title: "Hero Line",
      type: "string",
      description:
        "Cormorant italic hero line shown on the custom /book/thank-you page (e.g. 'Thank you. I've got everything I need.').",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      description: "Rich text body shown on the custom thank-you page beneath the hero line.",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          marks: {
            decorators: [
              { title: "Italic", value: "em" },
              { title: "Strong", value: "strong" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  defineField({
                    name: "href",
                    type: "string",
                    title: "URL",
                    validation: (rule) => rule.required(),
                  }),
                ],
              },
            ],
          },
        },
      ],
    }),
    defineField({
      name: "signOff",
      title: "Sign-Off",
      type: "string",
      description: "Closing line on the custom thank-you page (e.g. 'With love, Josephine ✦').",
    }),
    defineField({
      name: "subheading",
      title: "Subheading",
      type: "text",
      rows: 2,
      initialValue: "I'm really looking forward to reading for you. This is going to be special.",
    }),
    defineField({
      name: "steps",
      title: "What Happens Next",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "icon",
              title: "Icon",
              type: "string",
              options: {
                list: [
                  { title: "Mail", value: "mail" },
                  { title: "FileText", value: "fileText" },
                  { title: "Clock", value: "clock" },
                ],
              },
            }),
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "description", title: "Description", type: "text", rows: 3 }),
          ],
          preview: { select: { title: "title" } },
        },
      ],
    }),
    defineField({
      name: "closingMessage",
      title: "Closing Message",
      type: "text",
      rows: 2,
      initialValue: "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    }),
    defineField({
      name: "returnButtonText",
      title: "Return Button Text",
      type: "string",
      initialValue: "Return to Home",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "metaTitle", title: "Meta Title", type: "string" }),
        defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2 }),
        defineField({ name: "ogImage", title: "OG Image", type: "image" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Thank You Page" }),
  },
});
