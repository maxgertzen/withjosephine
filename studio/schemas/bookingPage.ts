import { defineField, defineType } from "sanity";

export const bookingPage = defineType({
  name: "bookingPage",
  title: "Booking Page",
  type: "document",
  fields: [
    defineField({
      name: "emailLabel",
      title: "Email Label",
      type: "string",
      initialValue: "Your Email Address",
    }),
    defineField({
      name: "emailDisclaimer",
      title: "Email Disclaimer",
      type: "string",
      initialValue: "Your email is only used for this reading. I'll never share it.",
    }),
    defineField({
      name: "paymentButtonText",
      title: "Payment Button Text",
      type: "string",
      initialValue: "Continue to Payment",
    }),
    defineField({
      name: "securityNote",
      title: "Security Note",
      type: "string",
      initialValue: "Secure checkout · Your details are safe",
    }),
    defineField({
      name: "formatNote",
      title: "Format Note",
      type: "string",
      description: "Short description of what the customer receives (shown next to the mic icon).",
      initialValue: "Detailed voice note recording + a supporting PDF created entirely for you.",
    }),
    defineField({
      name: "closingMessage",
      title: "Closing Message",
      type: "text",
      rows: 2,
      initialValue: "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    }),
    defineField({
      name: "deliveryNote",
      title: "Delivery Note",
      type: "string",
      initialValue: "You'll receive your voice note and PDF within 7 days of payment.",
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
