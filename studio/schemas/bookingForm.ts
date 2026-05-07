import { defineField, defineType } from "sanity";

export const bookingForm = defineType({
  name: "bookingForm",
  title: "Booking Form",
  type: "document",
  fields: [
    defineField({
      name: "title",
      title: "Page Title",
      type: "string",
      description: "Heading shown at the top of the intake form page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "intro",
      title: "Intro Copy",
      type: "text",
      rows: 4,
      description: "Welcome paragraph displayed above the first form section.",
    }),
    defineField({
      name: "description",
      title: "Description",
      type: "text",
      rows: 4,
      description: "Secondary descriptive copy shown beneath the intro.",
    }),
    defineField({
      name: "sections",
      title: "Sections",
      type: "array",
      description: "Sections rendered in order. Each section contains its own fields.",
      of: [{ type: "reference", to: [{ type: "formSection" }] }],
    }),
    defineField({
      name: "entryPageContent",
      title: "Entry Page Content",
      type: "object",
      description:
        "Verbatim copy slots for the /book/[readingId] entry page. Each slot is sourced from SPEC §11.",
      fields: [
        defineField({ name: "letterOpener", title: "Letter Opener", type: "text", rows: 2 }),
        defineField({ name: "letterBridge", title: "Letter Bridge", type: "text", rows: 2 }),
        defineField({ name: "letterClosing", title: "Letter Closing", type: "text", rows: 2 }),
        defineField({ name: "dropCapCta", title: "Drop-Cap CTA", type: "text", rows: 2 }),
        defineField({ name: "dropCapCaption", title: "CTA Caption", type: "text", rows: 2 }),
        defineField({
          name: "changeReadingLinkText",
          title: "Change-Reading Link Text",
          type: "text",
          rows: 2,
        }),
        defineField({
          name: "aboutJosephineLinkText",
          title: "About Josephine Link Text",
          type: "text",
          rows: 2,
        }),
        defineField({
          name: "letterTitle",
          title: "Letter Title (optional)",
          type: "text",
          rows: 2,
          description: "Optional headline above the letter copy. Leave blank to omit.",
        }),
      ],
      options: { collapsible: true, collapsed: false },
    }),
    defineField({
      name: "pagination",
      title: "Pagination",
      type: "object",
      description: "Per-reading pagination overrides. Leave empty to derive pages from section boundaries.",
      fields: [
        defineField({
          name: "overrides",
          title: "Overrides",
          type: "array",
          of: [
            {
              type: "object",
              name: "paginationOverride",
              fields: [
                defineField({
                  name: "readingSlug",
                  title: "Reading Slug",
                  type: "string",
                  validation: (rule) => rule.required(),
                }),
                defineField({
                  name: "pageCount",
                  title: "Page Count",
                  type: "number",
                  validation: (rule) => rule.min(1).max(10),
                }),
              ],
              preview: { select: { title: "readingSlug", subtitle: "pageCount" } },
            },
          ],
        }),
      ],
      options: { collapsible: true, collapsed: true },
    }),
    defineField({
      name: "loadingStateCopy",
      title: "Loading State Copy",
      type: "string",
      description: "Shown in the submit overlay while we hand off to Stripe.",
      initialValue: "One moment — taking you to checkout.",
    }),
    defineField({
      name: "confirmationMessage",
      title: "Confirmation Message",
      type: "text",
      rows: 4,
      description: "Message shown to the user after a successful submission.",
    }),
    defineField({
      name: "nonRefundableNotice",
      title: "Non-Refundable Notice (legacy)",
      type: "text",
      rows: 3,
      description:
        "Legacy no-refund disclosure. Superseded by Consent Block → cooling_off row. Kept for historical data; do not show in new flows.",
    }),
  ],
  preview: {
    select: { title: "title" },
  },
});
