import { defineField, defineType } from "sanity";

export const notFoundPage = defineType({
  name: "notFoundPage",
  title: "404 Page",
  type: "document",
  fields: [
    defineField({
      name: "tag",
      title: "Tag",
      type: "string",
      initialValue: "✦ Lost in the Stars",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "This page doesn't exist",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
      initialValue:
        "The path you followed leads nowhere — but the one home is always clear.",
    }),
    defineField({
      name: "buttonText",
      title: "Button Text",
      type: "string",
      initialValue: "Return Home",
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
    prepare: () => ({ title: "404 Page" }),
  },
});
