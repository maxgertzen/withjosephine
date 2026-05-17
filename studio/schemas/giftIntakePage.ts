import { defineField, defineType } from "sanity";

export const giftIntakePage = defineType({
  name: "giftIntakePage",
  title: "Gift Intake Page",
  type: "document",
  description:
    "Copy that wraps the intake form on /gift/intake — the page a recipient sees after their token is validated and they're ready to fill in their birth details. The form itself is configured in Booking Form; this only covers the chrome around it.",
  fields: [
    defineField({
      name: "seoTitle",
      title: "SEO — Page title",
      type: "string",
      initialValue: "Open your gift — Josephine",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO — Meta description",
      type: "text",
      rows: 2,
      initialValue: "Share your details so Josephine can prepare your reading.",
    }),
    defineField({
      name: "eyebrow",
      title: "Eyebrow tag",
      type: "string",
      description:
        "Small uppercase label above the heading — sets the tone before the recipient reads the larger text.",
      initialValue: "✦ Opening your gift",
    }),
    defineField({
      name: "heading",
      title: "Heading (return visit)",
      type: "string",
      description:
        "Shown when the recipient arrives WITHOUT the ?welcome=1 query (e.g. they bookmarked the URL or returned later).",
      initialValue: "A few things, before we begin.",
    }),
    defineField({
      name: "headingWelcome",
      title: "Heading (first arrival via claim)",
      type: "string",
      description:
        "Shown on first arrival straight after claiming — when /gift/claim redirects with ?welcome=1.",
      initialValue: "Welcome — a few things before we begin.",
    }),
    defineField({
      name: "lede",
      title: "Lede paragraph",
      type: "text",
      rows: 3,
      description:
        "Short paragraph between the heading and the form. Use {readingName} to substitute the reading name (e.g. 'Birth Chart Reading').",
      initialValue:
        "Someone sent you a {readingName}. Share your details and Josephine will prepare your reading.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Gift Intake Page" }),
  },
});
