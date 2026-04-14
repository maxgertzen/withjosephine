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
