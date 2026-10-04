import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftRecipientSlots = slotValidation("emailGiftRecipientConfirmation");

export const emailGiftRecipientConfirmation = defineType({
  name: "emailGiftRecipientConfirmation",
  title: "Gift Confirmation → Recipient",
  type: "document",
  description:
    "Sent to someone who received a reading as a gift, right after they send their details. Takes the place of the order confirmation for a gift.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "dataExport", title: "Data export section" },
  ],
  fields: [
    tokenReferenceField("emailGiftRecipientConfirmation"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateGiftRecipientSlots,
      initialValue: "Your reading is in my hands now",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      validation: validateGiftRecipientSlots,
      initialValue: "Your answers landed safely. Here's what happens next.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      validation: validateGiftRecipientSlots,
      initialValue: "Your reading is in my hands",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'Use "{firstName}" for the recipient\'s first name, "{buyerName}" for the buyer\'s first name and "{readingName}" for the reading name.',
      validation: validateGiftRecipientSlots,
    }),
    defineField({
      name: "buyerNameFallback",
      title: "Buyer name when it is missing",
      type: "string",
      group: "body",
      description: 'Used for "{buyerName}" when the buyer\'s name was erased.',
      validation: validateGiftRecipientSlots,
      initialValue: "Someone",
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card: label",
      type: "string",
      group: "card",
      validation: validateGiftRecipientSlots,
      initialValue: "Your reading",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card: delivery line",
      type: "string",
      group: "card",
      validation: validateGiftRecipientSlots,
      initialValue: "Delivery within 7 days",
    }),
    defineField({
      name: "dataExportHeading",
      title: "Data export: lead-in text",
      type: "string",
      group: "dataExport",
      description: "The data export line at the bottom of the email, followed by the link below.",
      validation: validateGiftRecipientSlots,
      initialValue: "Need a copy of your data?",
    }),
    defineField({
      name: "dataExportButtonLabel",
      title: "Data export: link text",
      type: "string",
      group: "dataExport",
      validation: validateGiftRecipientSlots,
      initialValue: "Request an export",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Gift Confirmation → Recipient",
      subtitle:
        "Sent to someone who received a reading as a gift, right after they send their details.",
    }),
  },
});
