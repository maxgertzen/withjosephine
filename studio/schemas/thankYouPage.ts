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
      validation: (rule) => rule.required(),
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
      validation: (rule) => rule.required(),
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
      validation: (rule) => rule.required(),
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
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "closingMessage",
      title: "Closing Message",
      type: "text",
      rows: 2,
      initialValue: "I can't wait to connect with you through your reading.\nWith love, Josephine ✦",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "returnButtonText",
      title: "Return Button Text",
      type: "string",
      initialValue: "Return to Home",
    }),
    defineField({
      name: "giftPurchaserHeading",
      title: "Gift purchaser heading",
      type: "string",
      description:
        "Shown to a purchaser landing here after paying for a gift. Use {purchaserFirstName} as a placeholder for the purchaser's first name.",
      initialValue: "Thank you, {purchaserFirstName}. Your gift is on its way.",
    }),
    defineField({
      name: "giftPurchaserSubheading",
      title: "Gift purchaser subheading (scheduled delivery)",
      type: "text",
      rows: 2,
      description:
        "Shown when the purchaser scheduled the gift for Josephine to deliver. Self-send mode uses the dedicated self-send subheading field below.",
      initialValue: "I'll take it from here. The recipient will receive a note from me with their claim link.",
    }),
    defineField({
      name: "giftPurchaserBody",
      title: "Gift purchaser body (scheduled delivery)",
      type: "text",
      rows: 3,
      description:
        "Replaces the standard confirmation paragraph for scheduled-delivery gift purchasers. {recipientName} resolves to the recipient's name when known. Self-send mode uses the dedicated self-send body field below.",
      initialValue:
        "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link — they'll share their intake details with me from there.",
    }),
    defineField({
      name: "giftPurchaserSelfSendSubheading",
      title: "Gift purchaser subheading (self-send delivery)",
      type: "text",
      rows: 2,
      description:
        "Shown to a purchaser who picked self-send delivery — they hand off the claim link themselves; Josephine doesn't send anything to the recipient.",
      initialValue:
        "Your gift link is ready in the email I just sent — share it with them whenever feels right.",
    }),
    defineField({
      name: "giftPurchaserSelfSendBody",
      title: "Gift purchaser body (self-send delivery)",
      type: "text",
      rows: 3,
      description:
        "Replaces the standard confirmation paragraph for self-send gift purchasers. Frames the next step as forwarding the link, not waiting on a scheduled send.",
      initialValue:
        "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready — they'll claim from there.",
    }),
    defineField({
      name: "giftPurchaserReadingLabel",
      title: "Gift purchaser reading-card label",
      type: "string",
      description:
        'Small label above the reading name on the gift-purchaser order card. Defaults to "Your gift" so the framing matches the purchase context.',
      initialValue: "Your gift",
    }),
    defineField({
      name: "giftPurchaserTimelineBody",
      title: "Gift purchaser timeline paragraph",
      type: "text",
      rows: 3,
      description:
        "Second paragraph on the gift-purchaser thank-you page. Recipient-perspective copy — the purchaser isn't getting the reading themselves. Use {deliveryDays} for the accented delivery-time phrase.",
      initialValue:
        "I'll begin the recipient's reading within the next two days of them claiming the gift, and I'll send them a short note when I do. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.",
    }),
    defineField({
      name: "giftPurchaserContactBody",
      title: "Gift purchaser contact paragraph",
      type: "text",
      rows: 3,
      description:
        "Third paragraph for gift purchasers — invites them to reach out if anything's off with the gift itself. Use {email} for the contact email link.",
      initialValue:
        "If anything comes up with the gift — a wrong recipient email, a change of plan, anything that doesn't look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
    }),
    defineField({
      name: "giftRecipientHeading",
      title: "Gift recipient heading",
      type: "string",
      description:
        "Shown to a recipient who's just finished filling in their intake on a redeemed gift. Use {recipientName} as a placeholder to address them by name.",
      initialValue: "Thank you, {recipientName}. Your reading is in my hands now.",
    }),
    defineField({
      name: "giftRecipientSubheading",
      title: "Gift recipient subheading",
      type: "text",
      rows: 2,
      initialValue: "I've received everything I need to begin.",
    }),
    defineField({
      name: "giftRecipientBody",
      title: "Gift recipient body",
      type: "text",
      rows: 3,
      initialValue:
        "I'll begin your reading within the next two days, and I'll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.",
    }),
    defineField({
      name: "giftRecipientContactBody",
      title: "Gift recipient contact paragraph",
      type: "text",
      rows: 3,
      description:
        "Optional third paragraph for the recipient. Invites them to reach out if anything's off. Use {email} for the contact email link.",
      initialValue:
        "If anything comes up — a question, a detail you forgot to mention, or anything that doesn't look right in your confirmation — just reply to that email or write to me at {email}. It comes straight to me.",
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
