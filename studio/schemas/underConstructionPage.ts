import { defineField, defineType } from "sanity";

export const underConstructionPage = defineType({
  name: "underConstructionPage",
  title: "Under Construction Page",
  type: "document",
  fields: [
    defineField({
      name: "tag",
      title: "Tag",
      type: "string",
      initialValue: "✦ Something Beautiful is Coming",
    }),
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "Josephine",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 2,
      initialValue:
        "Coming soon — a space for soul readings, birth charts, and Akashic records.",
    }),
    defineField({
      name: "image",
      title: "Hero Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "imageAlt",
      title: "Image Alt Text",
      type: "string",
      initialValue: "Mystical gathering around a pyramid of light",
    }),
    defineField({
      name: "contactText",
      title: "Contact Text",
      type: "string",
      initialValue: "In the meantime, reach out at",
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
    prepare: () => ({ title: "Under Construction Page" }),
  },
});
