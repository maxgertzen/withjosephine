import { defineField, defineType } from "sanity";

import { ConsentBannerInput } from "../components/ConsentBannerInput";

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
    defineField({
      name: "consentBanner",
      title: "Analytics Consent Banner",
      description:
        'Shown only to visitors in the EU/EEA, UK, Switzerland, and California (CCPA). Click "Preview consent banner" above to see your edits in a new tab. Layout is fixed; edit copy only.',
      type: "object",
      components: { input: ConsentBannerInput },
      fields: [
        defineField({
          name: "title",
          title: "Title",
          type: "string",
          description: 'Heading at the top of the banner (e.g. "A note on analytics")',
        }),
        defineField({
          name: "body",
          title: "Body Text",
          type: "text",
          rows: 3,
          description:
            'Plain text. Will be followed by the privacy-policy link automatically.',
        }),
        defineField({
          name: "privacyLinkText",
          title: "Privacy-Policy Link Text",
          type: "string",
          description: 'Link text that points to /privacy (e.g. "Read the privacy policy")',
        }),
        defineField({
          name: "acceptLabel",
          title: "Accept Button Label",
          type: "string",
        }),
        defineField({
          name: "declineLabel",
          title: "Decline Button Label",
          type: "string",
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
