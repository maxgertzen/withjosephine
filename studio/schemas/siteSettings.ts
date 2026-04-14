import { defineField, defineType } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "brandName",
      title: "Brand Name",
      type: "string",
      initialValue: "Josephine",
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
    }),
    defineField({
      name: "navLinks",
      title: "Navigation Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "sectionId", title: "Section ID", type: "string" }),
          ],
          preview: { select: { title: "label", subtitle: "sectionId" } },
        },
      ],
    }),
    defineField({
      name: "navCtaText",
      title: "Nav CTA Text",
      type: "string",
      initialValue: "Book a Reading",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: [
                  { title: "TikTok", value: "tiktok" },
                  { title: "Instagram", value: "instagram" },
                  { title: "YouTube", value: "youtube" },
                  { title: "Facebook", value: "facebook" },
                  { title: "Twitter / X", value: "twitter" },
                ],
              },
            }),
            defineField({ name: "url", title: "URL", type: "url" }),
            defineField({ name: "label", title: "Accessible Label", type: "string" }),
          ],
          preview: { select: { title: "platform", subtitle: "url" } },
        },
      ],
    }),
    defineField({
      name: "copyrightText",
      title: "Copyright Text",
      type: "string",
      initialValue: "Josephine. All rights reserved.",
    }),
    defineField({
      name: "contactEmail",
      title: "Contact Email",
      type: "string",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
