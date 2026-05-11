import { defineField, defineType } from "sanity";

export const thankYouPage = defineType({
  name: "thankYouPage",
  title: "Thank You Page",
  type: "document",
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      initialValue: "Thank you for booking",
    }),
    defineField({
      name: "subheading",
      title: "Subheading",
      type: "text",
      rows: 2,
      initialValue: "I'm really looking forward to reading for you. This is going to be special.",
    }),
    defineField({
      name: "readingLabel",
      title: "Reading Card Label",
      type: "string",
      description: 'Small label above the reading name on the order card (e.g. "Your Reading").',
      initialValue: "Your Reading",
    }),
    defineField({
      name: "confirmationBody",
      title: "Confirmation Email Paragraph",
      type: "text",
      rows: 3,
      description:
        "First paragraph below the order card. Describes what the customer will receive in their inbox.",
      initialValue:
        "A confirmation email is on its way to your inbox in the next minute or two — it includes a copy of the answers you shared so you have them on hand. If you can't find it, please check your promotions folder.",
    }),
    defineField({
      name: "timelineBody",
      title: "Timeline Paragraph",
      type: "text",
      rows: 3,
      description:
        "Second paragraph. Sets expectations for delivery time. Use {deliveryDays} as a placeholder for the highlighted '7 days' phrase.",
      initialValue:
        "I'll begin your reading within the next two days, and I'll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.",
    }),
    defineField({
      name: "deliveryDaysPhrase",
      title: "Highlighted Delivery Phrase",
      type: "string",
      description:
        'The accented phrase substituted into the timeline paragraph at {deliveryDays} (e.g. "seven days").',
      initialValue: "seven days",
    }),
    defineField({
      name: "contactBody",
      title: "Contact Paragraph",
      type: "text",
      rows: 3,
      description:
        "Third paragraph inviting the customer to reply if anything's off. Use {email} as a placeholder for the contact email link from Site Settings.",
      initialValue:
        "If anything comes up — a question, a detail you forgot to mention, or anything that doesn't look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
    }),
    defineField({
      name: "closingMessage",
      title: "Closing Message",
      type: "text",
      rows: 2,
      initialValue: "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
    }),
    defineField({
      name: "returnButtonText",
      title: "Return Button Text",
      type: "string",
      initialValue: "Return to Home",
    }),
    defineField({
      name: "overrides",
      title: "Per-reading overrides",
      type: "array",
      description:
        "Optional. Override specific fields for individual readings. Any field left empty falls back to the default above. Add one entry per reading that needs custom copy.",
      of: [
        {
          type: "object",
          name: "thankYouOverride",
          fields: [
            defineField({
              name: "reading",
              title: "Reading",
              type: "reference",
              to: [{ type: "reading" }],
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: "heading",
              title: "Heading override",
              type: "string",
            }),
            defineField({
              name: "subheading",
              title: "Subheading override",
              type: "text",
              rows: 2,
            }),
            defineField({
              name: "confirmationBody",
              title: "Confirmation paragraph override",
              type: "text",
              rows: 3,
            }),
            defineField({
              name: "timelineBody",
              title: "Timeline paragraph override",
              type: "text",
              rows: 3,
              description: "Use {deliveryDays} as a placeholder if you want the accented phrase.",
            }),
            defineField({
              name: "contactBody",
              title: "Contact paragraph override",
              type: "text",
              rows: 3,
              description: "Use {email} as a placeholder for the contact email link.",
            }),
            defineField({
              name: "closingMessage",
              title: "Closing message override",
              type: "text",
              rows: 2,
            }),
          ],
          preview: {
            select: { readingName: "reading.name" },
            prepare: ({ readingName }) => ({
              title: readingName ? `Override · ${readingName}` : "Override (reading not set)",
            }),
          },
        },
      ],
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
    prepare: () => ({ title: "Thank You Page" }),
  },
});
