import { defineField, defineType } from "sanity";

export const bookingPage = defineType({
  name: "bookingPage",
  title: "Booking Page",
  type: "document",
  fields: [
    defineField({
      name: "paymentButtonText",
      title: "Payment Button Text",
      type: "string",
      description: "Submit-button label on the final page of the intake form.",
      initialValue: "Continue to payment →",
    }),
    defineField({
      name: "formatNote",
      title: "Format Note",
      type: "string",
      description: "Short description of what the customer receives (shown next to the mic icon). WHAT it is — keep distinct from Delivery Note (WHEN it arrives).",
      initialValue: "A voice note plus a written PDF, made just for you.",
    }),
    defineField({
      name: "deliveryNote",
      title: "Delivery Note",
      type: "string",
      description: "WHEN the reading arrives. Keep distinct from Format Note (WHAT it is) — avoid repeating the words used above.",
      initialValue: "Arrives within 7 days of payment.",
    }),
    defineField({
      name: "whatsIncludedHeading",
      title: "Entry Page — What's Included Heading",
      type: "string",
      description: "Section header above the included-items list on the booking entry page.",
      initialValue: "What's included",
    }),
    defineField({
      name: "bookReadingCtaText",
      title: "Entry Page — Book Reading CTA",
      type: "string",
      description: "Primary CTA button label on the booking entry page (right column).",
      initialValue: "Book this Reading →",
    }),
    defineField({
      name: "seo",
      title: "SEO",
      type: "object",
      fields: [
        defineField({ name: "metaTitle", title: "Meta Title", type: "string" }),
        defineField({ name: "metaDescription", title: "Meta Description", type: "text", rows: 2 }),
        defineField({ name: "ogImage", title: "OG Image", type: "image" }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Booking Page" }),
  },
});
