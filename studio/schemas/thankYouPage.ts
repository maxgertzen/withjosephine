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
      name: "subheading",
      title: "Subheading",
      type: "text",
      rows: 2,
      initialValue: "I'm really looking forward to reading for you. This is going to be special.",
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
