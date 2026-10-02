import { defineField, defineType } from "sanity";

import { MAX_READING_FACTS, READING_PAGE_DEFAULTS } from "../../src/data/defaults";
import { factsPerRowField, hideFactsField, readingFactsField } from "./readingFacts";

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
      title: "Intake Form",
      type: "object",
      fields: [
        defineField({
          name: "letterTitle",
          title: "Form Heading",
          type: "text",
          rows: 2,
          description:
            "The heading above each reading's intake words and the form, for example 'A few things, before we begin.' Leave blank to use that wording.",
        }),
      ],
      options: { collapsible: true, collapsed: false },
    }),
    defineField({
      name: "readingPageContent",
      title: "Reading Page",
      type: "object",
      description:
        "Words on the reading block above the form, shared by every reading. Leave a field blank to use the built-in wording.",
      fieldsets: [{ name: "facts", title: "Facts row", options: { collapsible: true, collapsed: false } }],
      fields: [
        defineField({
          name: "eyebrow",
          title: "Small Label Above the Promise",
          type: "string",
        }),
        defineField({
          name: "foldRowLabel",
          title: "Folded Row Label",
          type: "string",
          description:
            "Shown to visitors who came from a homepage card, as one row that opens the block. {reading} becomes the reading's subtitle, for example 'About the {reading}'.",
        }),
        hideFactsField({
          fieldset: "facts",
          description: "Leaves out the facts row on every booking page, except readings that have their own facts.",
        }),
        readingFactsField({
          fieldset: "facts",
          description: `Up to ${MAX_READING_FACTS} short facts under the promise, shared by every reading. A reading can replace them with its own. Leave empty to use the built-in three.`,
        }),
        factsPerRowField({
          name: "factsPerRowPhone",
          title: "Facts per row on phones",
          fieldset: "facts",
          initialValue: READING_PAGE_DEFAULTS.factsPerRowPhone,
        }),
        factsPerRowField({
          name: "factsPerRowDesktop",
          title: "Facts per row on computers",
          fieldset: "facts",
          initialValue: READING_PAGE_DEFAULTS.factsPerRowDesktop,
        }),
        defineField({
          name: "factsBalanceRows",
          title: "Balance the rows",
          type: "boolean",
          fieldset: "facts",
          description: "On: rows share the facts evenly (5 facts at 3 per row show as 3 and 2, 4 show as 2 and 2). Off: rows fill up in order (4 show as 3 and 1).",
          initialValue: READING_PAGE_DEFAULTS.factsBalanceRows,
        }),
        defineField({
          name: "factsListOnPhones",
          title: "Show as a list on phones",
          type: "boolean",
          fieldset: "facts",
          description: "On phones, one fact per line with the label on the left and the value on the right. Computers keep the rows.",
          initialValue: READING_PAGE_DEFAULTS.factsListOnPhones,
        }),
        defineField({
          name: "readerName",
          title: "Reader Name",
          type: "string",
        }),
        defineField({
          name: "readerLine",
          title: "Line Under the Reader Name",
          type: "string",
        }),
        defineField({
          name: "hideReaderPhoto",
          title: "Hide the Reader Photo",
          type: "boolean",
          description: "Leaves out the round portrait next to the reader name. The name and line stay.",
          initialValue: false,
        }),
        defineField({
          name: "includedTitle",
          title: "What's Included Title",
          type: "string",
        }),
        defineField({
          name: "howItWorksTitle",
          title: "How It Works Title",
          type: "string",
        }),
        defineField({
          name: "questionsTitle",
          title: "Questions Title",
          type: "string",
        }),
        defineField({
          name: "otherReadingsTitle",
          title: "Other Readings Title",
          type: "string",
        }),
        defineField({
          name: "testimonialLabel",
          title: "Testimonial Label",
          type: "string",
          description: "Small label above the quote on the last page of the form.",
        }),
        defineField({
          name: "minutesTemplate",
          title: "Minutes Wording",
          type: "string",
          description:
            "Added to the page line when a reading has its minutes set. {minutes} becomes the number.",
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
      initialValue: "One moment - taking you to checkout.",
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
