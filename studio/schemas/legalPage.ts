import { defineField, defineType } from "sanity";

export const legalPage = defineType({
  name: "legalPage",
  title: "Legal Page",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      description: 'Displayed as the h1 on the page (e.g. "Privacy Policy")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description:
        'Matches the app route. Use "privacy", "terms", or "refund-policy" to replace the default page at /privacy, /terms, or /refund-policy.',
      options: { source: "title", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tag",
      title: "Tag",
      type: "string",
      description: 'Small label above the title (e.g. "✦ Privacy")',
    }),
    defineField({
      name: "lastUpdated",
      title: "Last Updated",
      type: "date",
      description: "Shown beneath the title. Bump this whenever the policy changes.",
      options: { dateFormat: "D MMMM YYYY" },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      description: "Full policy text. Use H2 for section headings, H3 for sub-headings.",
      of: [
        {
          type: "block",
          styles: [
            { title: "Normal", value: "normal" },
            { title: "Heading 2", value: "h2" },
            { title: "Heading 3", value: "h3" },
            { title: "Quote", value: "blockquote" },
          ],
          lists: [
            { title: "Bullet", value: "bullet" },
            { title: "Number", value: "number" },
          ],
          marks: {
            decorators: [
              { title: "Strong", value: "strong" },
              { title: "Emphasis", value: "em" },
            ],
            annotations: [
              {
                name: "link",
                type: "object",
                title: "Link",
                fields: [
                  {
                    name: "href",
                    type: "url",
                    title: "URL",
                    description:
                      "External URL (https://…), internal path (/privacy), or mailto:hello@withjosephine.com",
                    validation: (rule) =>
                      rule.uri({
                        scheme: ["http", "https", "mailto"],
                        allowRelative: true,
                      }),
                  },
                ],
              },
            ],
          },
        },
      ],
      validation: (rule) => rule.required().min(1),
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta Title",
          type: "string",
          description: "Overrides default page title in <head>",
        }),
        defineField({
          name: "metaDescription",
          title: "Meta Description",
          type: "text",
          rows: 2,
        }),
      ],
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      description: "Lower numbers appear first in the Studio list.",
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
    select: { title: "title", subtitle: "slug.current" },
  },
});
