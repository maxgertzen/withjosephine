import { defineField, defineType } from "sanity";

import { MAX_READING_FACTS, READING_PAGE_DEFAULTS } from "../../src/data/defaults";
import { startingBookingPageField } from "./bookingPageSections";
import { factsPerRowField, readingFactsField } from "./readingFacts";

export const bookingForm = defineType({
  name: "bookingForm",
  title: "Booking Form",
  type: "document",
  fields: [
    startingBookingPageField,
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
          name: "showLetterTitle",
          title: "Show the Form Heading",
          type: "boolean",
          description:
            "On: a heading shows above the opening words of the form. Off: no heading, because the reading name at the top of the page is already a heading. To hide the heading and the opening words, switch off 'Form heading and opening words' in the reading's Booking page list.",
          initialValue: false,
        }),
        defineField({
          name: "letterTitle",
          title: "Form Heading",
          type: "text",
          rows: 2,
          hidden: ({ parent }) => !parent?.showLetterTitle,
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
        "Words every reading shares. In a reading's Booking page list they show in grey, and the reading can type its own words instead. Leave a field empty to use the site's own words.",
      fieldsets: [
        { name: "facts", title: "Facts row", options: { collapsible: true, collapsed: false } },
        { name: "navigation", title: "Back links and page line", options: { collapsible: true, collapsed: false } },
      ],
      fields: [
        defineField({
          name: "eyebrow",
          title: "Small Label Above the Promise",
          type: "string",
        }),
        readingFactsField({
          fieldset: "facts",
          description: `Up to ${MAX_READING_FACTS} short facts under the promise, shared by every reading. A reading can replace them with its own.`,
          inherits: "builtIn",
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
          description:
            "Hides the round photo next to the reader name on every reading, unless a reading sets 'Hide the photo' itself. To hide the name too, switch off 'Reader name and photo' in the reading's Booking page list.",
          initialValue: false,
        }),
        defineField({
          name: "otherReadingsTitle",
          title: "Other Readings Title",
          type: "string",
        }),
        defineField({
          name: "switchNoticeTemplate",
          title: "Switched Reading Notice",
          type: "string",
          description:
            "Shown at the top of the form when a visitor picks another reading under Other Readings Title and their name or email carries over. {reading} becomes the reading name.",
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
        defineField({
          name: "backLabel",
          title: "Back Link",
          type: "string",
          fieldset: "navigation",
          description: "The link above the reading name that returns to the previous page.",
        }),
        defineField({
          name: "backToReadingsLabel",
          title: "Back to All Readings Link",
          type: "string",
          fieldset: "navigation",
          description: "Under the form's first page.",
        }),
        defineField({
          name: "previousPageLabel",
          title: "Previous Page Button",
          type: "string",
          fieldset: "navigation",
          description: "Under the form from its second page on.",
        }),
        defineField({
          name: "pageCounterTemplate",
          title: "Page Line",
          type: "string",
          fieldset: "navigation",
          description: "Above the form. {page} becomes the page number and {total} the number of pages.",
        }),
        defineField({
          name: "onePageLabel",
          title: "Page Line for a One-Page Form",
          type: "string",
          fieldset: "navigation",
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
