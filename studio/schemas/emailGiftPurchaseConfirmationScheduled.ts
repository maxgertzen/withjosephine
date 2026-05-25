import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateScheduledSlots = slotValidation("emailGiftPurchaseConfirmationScheduled");

export const emailGiftPurchaseConfirmationScheduled = defineType({
  name: "emailGiftPurchaseConfirmationScheduled",
  title: "Gift Confirmation → Purchaser (Scheduled)",
  type: "document",
  description:
    "Sent to someone who bought a gift reading and picked a future date for us to email the recipient automatically. No claim link in this email — it goes to the recipient on the scheduled date.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailGiftPurchaseConfirmationScheduled"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is scheduled",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview",
      type: "string",
      group: "envelope",
      description:
        "Inbox preview snippet. {recipientName} is who the gift is for, {sendAtDisplay} is the date+time formatted in the purchaser's timezone.",
      validation: validateScheduledSlots,
      initialValue: "We'll send it to {recipientName} on {sendAtDisplay}.",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "brandName",
      title: "Brand wordmark",
      type: "string",
      group: "header",
      initialValue: "Josephine",
    }),
    defineField({
      hidden: true,
      readOnly: true,
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
      initialValue: "A reading, on its way",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'The full body of the email. No button — the claim email goes to the recipient on the scheduled date. Use "{purchaserFirstName}", "{recipientName}", "{readingName}", "{sendAtDisplay}".',
      validation: validateScheduledSlots,
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
      validation: validateScheduledSlots,
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine1",
      title: "Sign-off line 1",
      type: "string",
      group: "footer",
      initialValue: "With love,",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "signOffLine2",
      title: "Sign-off line 2",
      type: "string",
      group: "footer",
      initialValue: "Josephine ✦",
    }),
    defineField({
      hidden: true,
      readOnly: true,
      name: "footerDisclaimer",
      title: "Footer disclaimer",
      type: "string",
      group: "footer",
      initialValue: "Readings are offered for entertainment and personal reflection.",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Gift Confirmation → Purchaser (Scheduled)",
      subtitle:
        "Sent to someone who bought a gift reading and picked a future date for us to email the recipient automatically. No claim link in this email — it goes to the recipient on the scheduled date.",
    }),
  },
});
