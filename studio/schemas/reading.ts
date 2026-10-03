import { defineField, defineType } from "sanity";

import { parseDisplayToCents } from "../../src/lib/pricing";
import { hideFactsField, readingFactsField } from "./readingFacts";

export const reading = defineType({
  name: "reading",
  title: "Reading",
  type: "document",
  fields: [
    defineField({
      name: "name",
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
      title: "Slug",
      type: "slug",
      options: { source: "name", maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "tag",
      title: "Tag",
      type: "string",
      description: 'Category label (e.g. "Signature", "Astrology", "Soul Records")',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subtitle",
      title: "Subtitle",
      type: "string",
      description: "Short label shown in booking summary (e.g. 'Soul Blueprint Reading')",
    }),
    defineField({
      name: "intakeIntro",
      title: "Intake Intro",
      type: "array",
      of: [
        {
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
        },
      ],
      description:
        "The words under the heading on this reading's intake form. Write as many paragraphs as you like; bold and italic are available. Leave empty to use the built-in wording.",
    }),
    defineField({
      name: "price",
      title: "Price (cents)",
      type: "number",
      description: "Price in cents (e.g. 17900 for $179)",
      validation: (rule) => rule.required().min(0),
    }),
    defineField({
      name: "priceDisplay",
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
      title: "Value Proposition",
      type: "string",
      description: "One-line hook shown on the reading card",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "briefDescription",
      title: "Brief Description",
      type: "text",
      rows: 3,
      description: "Short description shown on the reading card",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "expandedDetails",
      title: "Expanded Details",
      type: "array",
      of: [{ type: "text", rows: 3 }],
      description:
        "Paragraphs shown when the homepage card is expanded. On the booking page, the first paragraph is the line under the promise and the rest go under 'How it works'.",
    }),
    defineField({
      name: "includes",
      title: "What's Included",
      type: "array",
      of: [{ type: "string" }],
      description: "Checklist items under 'What's included' on the booking page",
    }),
    defineField({
      name: "questionsOnPage",
      title: "Questions on this page",
      type: "array",
      of: [{ type: "reference", to: [{ type: "faqItem" }] }],
      description:
        "Questions shown under 'Questions' on this reading's booking page. Pick from the FAQ list or create a new one, and drag to set the order. Leave empty to hide the section. The homepage FAQ is not affected.",
    }),
    defineField({
      name: "formTestimonial",
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
      title: "Minutes to fill in the form",
      type: "number",
      description:
        "Shown in the page line, for example 'Page 1 of 2 · about 3 minutes'. Leave empty to leave the minutes out.",
      validation: (rule) => rule.integer().min(1).max(60),
    }),
    readingFactsField({
      description:
        "This reading's own facts row on its booking page. Leave empty to use the shared Facts Row from Booking Form.",
    }),
    hideFactsField({ description: "Leaves out the facts row on this reading's booking page." }),
    defineField({
      name: "stripePaymentLink",
      title: "Stripe Payment Link",
      type: "url",
      description: "Stripe Payment Link URL for this reading. Created in Stripe Dashboard → Payment Links.",
      validation: (rule) => rule.uri({ scheme: ["https"] }),
    }),
    defineField({
      name: "requiresBirthChart",
      title: "Requires Birth Chart",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "requiresAkashic",
      title: "Requires Akashic Details",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "requiresQuestions",
      title: "Requires Questions",
      type: "boolean",
      initialValue: false,
    }),
    defineField({
      name: "order",
      title: "Display Order",
      type: "number",
      initialValue: 0,
    }),
    defineField({
      name: "seo",
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
