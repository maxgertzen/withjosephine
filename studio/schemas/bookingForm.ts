import { defineArrayMember, defineField, defineType } from "sanity";

const consentRowField = defineArrayMember({
  type: "object",
  name: "consentRow",
  fields: [
    defineField({
      name: "key",
      title: "Stable Key",
      type: "string",
      description:
        "Stable identifier used by the form runtime (e.g. 'entertainment', 'cooling_off', 'terms_privacy', 'newsletter'). Do not change after first save.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "labelRichText",
      title: "Label (rich text)",
      type: "array",
      description: "Consent label shown beside the checkbox. Supports inline links (Terms, Privacy).",
      of: [
        {
          type: "block",
          styles: [{ title: "Normal", value: "normal" }],
          lists: [],
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
    defineField({ name: "required", title: "Required", type: "boolean", initialValue: true }),
    defineField({
      name: "helperText",
      title: "Helper Text",
      type: "text",
      rows: 2,
      description: "Optional supporting copy shown beneath the consent label.",
    }),
    defineField({
      name: "optionalCaption",
      title: "Optional Caption",
      type: "string",
      description: "Small caption rendered above non-required rows (e.g. 'Optional').",
    }),
  ],
  preview: {
    select: { title: "key", subtitle: "required" },
    prepare(value: { title?: unknown; subtitle?: unknown }) {
      const title = typeof value.title === "string" ? value.title : "consent row";
      const required = value.subtitle === true ? "required" : "optional";
      return { title, subtitle: required };
    },
  },
});

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
      name: "consentBlock",
      title: "Consent Block",
      type: "object",
      description:
        "Trust line + four-row consent group rendered on the final intake page. Stable keys per row power the runtime contract.",
      fields: [
        defineField({
          name: "trustLine",
          title: "Trust Line",
          type: "text",
          rows: 2,
          description: "Italic Cormorant trust paragraph shown above the consent rows.",
        }),
        defineField({
          name: "rows",
          title: "Consent Rows",
          type: "array",
          of: [consentRowField],
          description: "Order matters: entertainment, cooling_off, terms_privacy, newsletter.",
        }),
        defineField({
          name: "hairlineBeforeKey",
          title: "Hairline Before Key",
          type: "string",
          description:
            "Render a 1px gold hairline divider above the row whose key matches this value (e.g. 'newsletter').",
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
      name: "swapToastCopy",
      title: "Reading-Swap Toast Copy",
      type: "text",
      rows: 2,
      description:
        "Shown when the user changes reading mid-form. Use the {readingName} token to interpolate the new reading.",
      initialValue:
        "Switched to {readingName}. Your name and email are saved — start where you left off.",
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
