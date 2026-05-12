import { defineField, defineType } from "sanity";

export const emailGiftPurchaseConfirmation = defineType({
  name: "emailGiftPurchaseConfirmation",
  title: "Email — Gift Purchase Confirmation (to purchaser)",
  type: "document",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "selfSend", title: "Self-send variant" },
    { name: "scheduled", title: "Scheduled variant" },
    { name: "shared", title: "Shared copy" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    defineField({
      name: "subjectSelfSend",
      title: "Subject (self-send)",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is ready to share",
    }),
    defineField({
      name: "subjectScheduled",
      title: "Subject (scheduled)",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is scheduled",
    }),
    defineField({
      name: "previewSelfSend",
      title: "Inbox preview (self-send)",
      type: "string",
      group: "envelope",
      initialValue: "Your shareable link is inside.",
    }),
    defineField({
      name: "previewScheduled",
      title: "Inbox preview (scheduled)",
      type: "string",
      group: "envelope",
      description:
        "Inbox preview for the SCHEDULED variant (when the purchaser picked a future send date). {recipientName} is who the gift is for, {sendAtDisplay} is the date+time formatted in the purchaser's timezone (e.g. 'Friday, December 12 at 9:00 AM').",
      initialValue: "We'll send it to {recipientName} on {sendAtDisplay}.",
    }),
    defineField({
      name: "brandName",
      title: "Brand wordmark",
      type: "string",
      group: "header",
      initialValue: "Josephine",
    }),
    defineField({
      name: "brandSubtitle",
      title: "Brand sub-line",
      type: "string",
      group: "header",
      initialValue: "Soul Readings",
    }),
    defineField({
      name: "heroLineSelfSend",
      title: "Hero line — self-send",
      type: "string",
      group: "selfSend",
      initialValue: "A reading, ready for them",
    }),
    defineField({
      name: "heroLineScheduled",
      title: "Hero line — scheduled",
      type: "string",
      group: "scheduled",
      initialValue: "A reading, on its way",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      group: "shared",
      description: 'Use "{purchaserFirstName}".',
      initialValue: "Hi {purchaserFirstName},",
    }),
    defineField({
      name: "detailLineSelfSend",
      title: "Detail paragraph — self-send",
      type: "text",
      rows: 4,
      group: "selfSend",
      description:
        "Body of the SELF-SEND confirmation — the purchaser chose to share the link themselves. The 'private link' phrase is load-bearing: the rendered email contains that actual URL beneath this paragraph. {readingName} is the reading; {recipientName} is who they're giving it to.",
      initialValue:
        "Thank you for gifting a {readingName}. Below is a private link you can share with {recipientName} whenever the timing feels right — folded into a card, sent in a message, however it suits you. They'll see who it's from when they open it.",
    }),
    defineField({
      name: "detailLineScheduled",
      title: "Detail paragraph — scheduled",
      type: "text",
      rows: 4,
      group: "scheduled",
      description:
        "Body of the SCHEDULED confirmation — the purchaser picked a future send date and we'll fire the recipient's email automatically. No link in this email (it goes to the recipient on the chosen date). {readingName} the reading; {recipientName} who it's for; {sendAtDisplay} the date+time we'll send.",
      initialValue:
        "Thank you for gifting a {readingName}. I'll let {recipientName} know about it on {sendAtDisplay} — they'll receive a short note from me with a private link to claim it and share what I need to read for them.",
    }),
    defineField({
      name: "shareButtonLabel",
      title: "Share button label (self-send)",
      type: "string",
      group: "selfSend",
      initialValue: "OPEN GIFT LINK",
    }),
    defineField({
      name: "shareUrlHelper",
      title: "Share helper text (self-send)",
      type: "text",
      rows: 2,
      group: "selfSend",
      description:
        "Sits directly below the share button in the SELF-SEND variant; reminds the purchaser this URL is for one specific person, not a coupon to forward broadly. {recipientName} grounds the message in the actual recipient.",
      initialValue:
        "This link is for {recipientName}. Share it the way you'd give them a handwritten card.",
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "shared",
      initialValue: "The gift",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "shared",
      initialValue: "Delivery within 7 days of claim",
    }),
    defineField({
      name: "refundLine",
      title: "Refund disclosure paragraph",
      type: "text",
      rows: 3,
      group: "shared",
      description: 'Use "{recipientName}".',
      initialValue:
        "If something changes before {recipientName} opens the link, write to me and we'll arrange a full refund. After they've started their intake, the work is on its way and the reading is theirs.",
    }),
    defineField({
      name: "signOffLine1",
      title: "Sign-off line 1",
      type: "string",
      group: "footer",
      initialValue: "With love,",
    }),
    defineField({
      name: "signOffLine2",
      title: "Sign-off line 2",
      type: "string",
      group: "footer",
      initialValue: "Josephine ✦",
    }),
    defineField({
      name: "footerDisclaimer",
      title: "Footer disclaimer",
      type: "string",
      group: "footer",
      initialValue: "Readings are offered for entertainment and personal reflection.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Email — Gift Purchase Confirmation" }),
  },
});
