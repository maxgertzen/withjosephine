import { orderRankField, orderRankOrdering } from "@sanity/orderable-document-list";
import { defineField, defineType } from "sanity";

import { isReadingOnSite, OFF_THE_SITE_LABEL } from "../../src/lib/booking/readingVisibility";
import { parseDisplayToCents } from "../../src/lib/pricing";
import { readingBookingPageField } from "./bookingPageSections";

export const reading = defineType({
  name: "reading",
  title: "Reading",
  type: "document",
  groups: [
    { name: "homepageCard", title: "Homepage card only" },
    { name: "bookingPage", title: "Booking page only" },
    { name: "notes", title: "Box on Notes" },
    { name: "setup", title: "Setup" },
  ],
  fields: [
    defineField({
      name: "onSite",
      group: ["homepageCard", "bookingPage", "setup"],
      title: "Show on the site",
      type: "boolean",
      initialValue: true,
      description:
        "On: people can see this reading on the homepage and book it. Off: the reading disappears from the site and nobody can book it or buy it as a gift. Gift codes people already paid for still work. Switch it off instead of deleting a reading that has orders. To change where it sits on the homepage, drag it up or down in the Readings list.",
    }),
    readingBookingPageField("bookingPage"),
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
      group: "homepageCard",
      title: "Promise on the homepage card",
      type: "string",
      description:
        "One line on this reading's homepage card, under the price. The booking page has its own promise: open 'Small label, promise and description' in the Booking page list.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "briefDescription",
      group: "homepageCard",
      title: "Description on the homepage card",
      type: "text",
      rows: 4,
      description:
        "A few sentences under the promise on this reading's homepage card. The booking page has its own description: open 'Small label, promise and description' in the Booking page list.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "notePromise",
      group: "notes",
      title: "Promise in the box on Notes",
      type: "string",
      description:
        "One line under this reading's name in the box at the end of a Note. Leave it blank and the box shows your homepage card promise.",
    }),
    defineField({
      name: "includes",
      group: "homepageCard",
      title: "Lines under 'Learn More' on the homepage card",
      type: "array",
      of: [{ type: "string" }],
      description:
        "People tap 'Learn More' on this reading's homepage card to see these lines. One line per item. Each line gets a small tick.",
    }),
    defineField({
      name: "estimatedMinutes",
      group: "bookingPage",
      title: "Minutes to fill in the form",
      type: "number",
      description:
        "How long the form takes, in minutes. It shows next to the page number, like 'Page 1 of 2 · about 3 minutes'. Leave it blank to leave the minutes out.",
      validation: (rule) => rule.integer().min(1).max(60),
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
    orderRankField({ type: "reading" }),
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
  orderings: [orderRankOrdering],
  preview: {
    select: { title: "name", priceDisplay: "priceDisplay", onSite: "onSite" },
    prepare: ({ title, priceDisplay, onSite }) => ({
      title,
      subtitle: isReadingOnSite({ onSite }) ? priceDisplay : OFF_THE_SITE_LABEL,
    }),
  },
});
