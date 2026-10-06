import { defineField, defineType } from "sanity";

import { parseDisplayToCents } from "../../src/lib/pricing";
import { hideFactsField, readingFactsField } from "./readingFacts";

const PARAGRAPHS_WITH_BOLD_AND_ITALIC = {
  type: "block",
  styles: [{ title: "Paragraph", value: "normal" }],
  lists: [],
  marks: {
    decorators: [
      { title: "Bold", value: "strong" },
      { title: "Italic", value: "em" },
    ],
    annotations: [],
  },
};

export const reading = defineType({
  name: "reading",
  title: "Reading",
  type: "document",
  groups: [
    { name: "bothPages", title: "Homepage and booking page", default: true },
    { name: "bookingPage", title: "Booking page only" },
    { name: "setup", title: "Setup" },
  ],
  fields: [
    defineField({
      name: "name",
      group: "setup",
      title: "Name",
      type: "string",
      description: 'The reading title without a leading article (e.g. "Soul Blueprint", not "The Soul Blueprint").',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (typeof value !== 'string') return true;
          const match = /^(the|a|an)\s+(.+)$/i.exec(value);
          if (match) {
            return {
              level: 'error' as const,
              message: `Title must not start with an article. Use "${match[2]}" instead of "${value}".`,
            };
          }
          return true;
        }),
    }),
    defineField({
      name: "slug",
      group: "setup",
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tag",
      group: "setup",
      title: "Tag",
      type: "string",
      description: 'Category label (e.g. "Signature", "Astrology", "Soul Records")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      group: "setup",
      title: "Subtitle",
      type: "string",
      description: "Short label shown in booking summary (e.g. 'Soul Blueprint Reading')",
    }),
    defineField({
      name: "intakeIntro",
      group: "bookingPage",
      title: "Intake Intro",
      type: "array",
      of: [PARAGRAPHS_WITH_BOLD_AND_ITALIC],
      description:
        "The words under the heading on this reading's intake form. Write as many paragraphs as you like; bold and italic are available. Leave empty to use the built-in wording.",
    }),
    defineField({
      name: "price",
      group: "setup",
      title: "Price (cents)",
      type: "number",
      description: "Price in cents (e.g. 17900 for $179)",
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: "priceDisplay",
      group: "setup",
      title: "Display Price",
      type: "string",
      description: 'Formatted price shown to visitors (e.g. "$179"). Must agree with Price (cents) above.',
      validation: (rule) =>
        rule.required().custom((value, context) => {
          if (typeof value !== "string") return true;
          const parent = context.parent as { price?: number } | undefined;
          const cents = parent?.price;
          if (typeof cents !== "number") return true;

          const displayCents = parseDisplayToCents(value);
          if (displayCents === null) {
            return {
              level: "warning" as const,
              message: 'Use "$N" or "$N.NN" format (e.g. "$179" or "$179.00").',
            };
          }
          if (displayCents !== cents) {
            return {
              level: "warning" as const,
              message: `Display does not match Price (cents): "${value}" vs ${cents}¢ ($${(cents / 100).toFixed(2)}). Update one to match the other — they describe the same listed price. (The Stripe Payment Link price is independent and can differ; coupons make the actual charged amount diverge by design.)`,
            };
          }
          return true;
        }),
    }),
    defineField({
      name: "valueProposition",
      group: "bothPages",
      title: "Promise",
      type: "string",
      description:
        "One line. Shown on the homepage card under the price, and at the top of the booking page under 'Online reading'.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "briefDescription",
      group: "bothPages",
      title: "Description",
      type: "text",
      rows: 4,
      description: "A few sentences about the reading. Shown under the promise on the homepage card and on the booking page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "includes",
      group: "bothPages",
      title: "What's included",
      type: "array",
      of: [{ type: "string" }],
      description:
        "The checklist. Shown on the homepage card when 'Learn More' is opened, and under 'What's included' on the booking page.",
    }),
    defineField({
      name: "howItWorks",
      group: "bookingPage",
      title: "How it works",
      type: "array",
      of: [{ type: "string" }],
      description:
        "Booking page only, under 'What's included'. One line per item, each with a checkmark. Remove every item to hide the section.",
    }),
    defineField({
      name: "questionsOnPage",
      group: "bookingPage",
      title: "Questions on this page",
      type: "array",
      of: [{ type: "reference", to: [{ type: "faqItem" }] }],
      description:
        "Questions shown under 'Questions' on this reading's booking page. Pick from the FAQ list or create a new one, and drag to set the order. Leave empty to hide the section. The homepage FAQ is not affected.",
    }),
    defineField({
      name: "formTestimonial",
      group: "bookingPage",
      title: "Testimonial on the booking form",
      type: "reference",
      to: [{ type: "testimonial" }],
      options: {
        filter: ({ document }) => ({
          filter: "readingType._ref == $readingId",
          params: { readingId: document._id.replace(/^(drafts|versions\.[^.]+)\./, "") },
        }),
      },
      description:
        "One quote shown on the last page of the form, above the consent checkboxes. Only testimonials linked to this reading are listed. Leave empty to show no quote.",
    }),
    defineField({
      name: "estimatedMinutes",
      group: "bookingPage",
      title: "Minutes to fill in the form",
      type: "number",
      description:
        "Shown in the page line, for example 'Page 1 of 2 · about 3 minutes'. Leave empty to leave the minutes out.",
      validation: (rule) => rule.integer().min(1).max(60),
    }),
    readingFactsField({
      group: "bookingPage",
      description:
        "This reading's own facts row on its booking page. Leave empty to use the shared Facts Row from Booking Form.",
    }),
    hideFactsField({
      group: "bookingPage",
      description: "Leaves out the facts row on this reading's booking page.",
    }),
    defineField({
      name: "stripePaymentLink",
      group: "setup",
      title: "Stripe Payment Link",
      type: "url",
      description: "Stripe Payment Link URL for this reading. Created in Stripe Dashboard → Payment Links.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "requiresBirthChart",
      group: "setup",
      title: "Requires Birth Chart",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "requiresAkashic",
      group: "setup",
      title: "Requires Akashic Details",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "requiresQuestions",
      group: "setup",
      title: "Requires Questions",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "order",
      group: "setup",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "seo",
      group: "setup",
      title: "SEO",
      type: "object",
      fields: [
        defineField({
          name: "metaTitle",
          title: "Meta Title (optional)",
          type: "string",
          description:
            "Leave empty. The title is built from the Subtitle and Price, for example 'Soul Blueprint Reading, $129 | Josephine Soul Readings'. Fill this only to replace it.",
        }),
        defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2 }),
        defineField({ name: "ogImage", title: "OG Image", type: "image" }),
      ],
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
    select: { title: "name", subtitle: "priceDisplay" },
  },
});
