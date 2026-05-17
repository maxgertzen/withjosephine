import { defineField, defineType } from "sanity";

export const bookingForm = defineType({
  name: "bookingForm",
  title: "Booking Form",
  type: "document",
  fields: [
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
        defineField({
          name: "giftToggleForMeLabel",
          title: "Gift toggle — \"For myself\" label",
          type: "string",
          description: "Active when visitor is booking for themselves.",
        }),
        defineField({
          name: "giftToggleAsGiftLabel",
          title: "Gift toggle — \"As a gift\" label",
          type: "string",
          description: "Active when visitor is gifting the reading.",
        }),
        defineField({
          name: "giftToggleHelper",
          title: "Gift toggle — helper line (optional)",
          type: "text",
          rows: 2,
          description: "Optional short line above or below the toggle. Leave blank to omit.",
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
      name: "nextButtonText",
      title: "Next Page Button Text",
      type: "string",
      description: "Label on the page-advance button shown on every page except the last.",
      initialValue: "Next →",
    }),
    defineField({
      name: "saveAndContinueLaterText",
      title: "Save and Continue Later Text",
      type: "string",
      description: "Label on the centre nav button that saves a draft and lets the visitor leave.",
      initialValue: "Save and continue later",
    }),
    defineField({
      name: "pageIndicatorTagline",
      title: "Page Indicator Tagline",
      type: "string",
      description:
        "Optional short note appended to the page counter (e.g. 'almost done'). Renders as 'Page 2 of 4 · {tagline}'. Leave blank to omit.",
    }),
    defineField({
      name: "nonRefundableNotice",
      title: "Cooling-Off Notice",
      type: "text",
      rows: 3,
      description:
        "Body copy rendered above the cooling-off consent checkbox on the final page. Required.",
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    prepare: () => ({ title: "Booking Form" }),
  },
});
