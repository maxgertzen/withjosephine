import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateSelfSendSlots = slotValidation("emailGiftPurchaseConfirmationSelfSend");

export const emailGiftPurchaseConfirmationSelfSend = defineType({
  name: "emailGiftPurchaseConfirmationSelfSend",
  title: "Email — Gift Purchase Confirmation — Self-Send (to purchaser)",
  type: "document",
  description:
    "Sent to the purchaser after they buy a gift reading and choose to share the claim link themselves. Includes the private claim URL.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailGiftPurchaseConfirmationSelfSend"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is ready to share",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview",
      type: "string",
      group: "envelope",
      initialValue: "Your shareable link is inside.",
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
      name: "heroLine",
      title: "Hero line",
      type: "string",
      group: "header",
      initialValue: "A reading, ready for them",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'The full body of the email above the share button. Use "{purchaserFirstName}", "{recipientName}", "{readingName}".',
      validation: validateSelfSendSlots,
    }),
    defineField({
      name: "shareButtonLabel",
      title: "Share button label",
      type: "string",
      group: "body",
      initialValue: "OPEN GIFT LINK",
    }),
    defineField({
      name: "shareUrlHelper",
      title: "Share helper text",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        "Small text shown directly below the share button. {recipientName} grounds the message in the actual recipient.",
      validation: validateSelfSendSlots,
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "card",
      initialValue: "The gift",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "card",
      initialValue: "Delivery within 7 days of claim",
    }),
    defineField({
      name: "refundLine",
      title: "Refund disclosure paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "card",
      description: 'Stays separate from the body. Use "{recipientName}", "{myGiftsUrl}".',
      validation: validateSelfSendSlots,
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
    prepare: () => ({
      title: "Email — Gift Purchase Confirmation — Self-Send",
    }),
  },
});
