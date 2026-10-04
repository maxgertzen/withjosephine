import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftToRecipientSlots = slotValidation("emailGiftToRecipient");

export const emailGiftToRecipient = defineType({
  name: "emailGiftToRecipient",
  title: "Gift → Recipient",
  type: "document",
  description:
    "Sent to the person receiving a gift when the buyer asks Josephine to email it. Carries the buyer's note when there is one, a button to open the gift and the gift code.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailGiftToRecipient"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateGiftToRecipientSlots,
      initialValue: "A reading, waiting for you",
    }),
    defineField({
      name: "previewTemplate",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      validation: validateGiftToRecipientSlots,
      initialValue: "{buyerName} has sent you a reading.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      validation: validateGiftToRecipientSlots,
      initialValue: "A reading, for you",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'Shown with or without a note. Use "{firstName}" for the recipient\'s name, "{buyerName}" for the buyer\'s first name, "{readingName}" for the reading name and "{code}" for the gift code.',
      validation: validateGiftToRecipientSlots,
    }),
    defineField({
      name: "noteLabelTemplate",
      title: "Note card: label",
      type: "string",
      group: "body",
      description: "Shown above the buyer's note, only when the buyer wrote one.",
      validation: validateGiftToRecipientSlots,
      initialValue: "A note from {buyerName}",
    }),
    defineField({
      name: "openButtonLabel",
      title: "Open-gift button label",
      type: "string",
      group: "body",
      validation: validateGiftToRecipientSlots,
      initialValue: "Open your gift",
    }),
    defineField({
      name: "codeFallbackTemplate",
      title: "Line under the button",
      type: "string",
      group: "body",
      validation: validateGiftToRecipientSlots,
      initialValue: "The code is {code}, if the button doesn’t work.",
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card: label",
      type: "string",
      group: "card",
      validation: validateGiftToRecipientSlots,
      initialValue: "The gift",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card: delivery line",
      type: "string",
      group: "card",
      validation: validateGiftToRecipientSlots,
      initialValue: "Delivered within 7 days of your intake",
    }),
    defineField({
      name: "privacyLineTemplate",
      title: "Privacy line",
      type: "string",
      group: "footer",
      description: "Shown under the reading card.",
      validation: validateGiftToRecipientSlots,
      initialValue:
        "{buyerName} gave me your name and email address to send you this gift. Your email address is used for this email only and deleted once it is sent.",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Gift → Recipient",
      subtitle: "Sent to the person receiving a gift when the buyer asks Josephine to email it.",
    }),
  },
});
