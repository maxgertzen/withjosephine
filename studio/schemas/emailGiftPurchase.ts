import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftPurchaseSlots = slotValidation("emailGiftPurchase");

export const emailGiftPurchase = defineType({
  name: "emailGiftPurchase",
  title: "Gift Purchase → Buyer",
  type: "document",
  description:
    "Sent to someone who bought a reading as a gift, right after their Stripe payment succeeds. Carries the gift code, the gift link, a WhatsApp share link and a button to send the gift by email.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Gift card" },
  ],
  fields: [
    tokenReferenceField("emailGiftPurchase"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateGiftPurchaseSlots,
      initialValue: "Your gift is ready to send",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      validation: validateGiftPurchaseSlots,
      initialValue: "The code and link are inside.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      validation: validateGiftPurchaseSlots,
      initialValue: "A reading, ready for them",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'Shown above the gift card. Use "{firstName}" for the buyer\'s first name and "{readingName}" for the reading name.',
      validation: validateGiftPurchaseSlots,
    }),
    defineField({
      name: "noteLine",
      title: "Note line",
      type: "string",
      group: "body",
      description: "Shown under the body only when the buyer wrote a note.",
      validation: validateGiftPurchaseSlots,
      initialValue: "They'll see your note when they open it.",
    }),
    defineField({
      name: "bodyPostButton",
      title: "Body: after buttons",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description: "Shown under the share link and the send button.",
      validation: validateGiftPurchaseSlots,
    }),
    defineField({
      name: "cardLabel",
      title: "Gift card: label",
      type: "string",
      group: "card",
      validation: validateGiftPurchaseSlots,
      initialValue: "The gift",
    }),
    defineField({
      name: "cardLineTemplate",
      title: "Gift card: line under the code",
      type: "string",
      group: "card",
      validation: validateGiftPurchaseSlots,
      initialValue: "For the {readingName} · does not expire",
    }),
    defineField({
      name: "shareButtonLabel",
      title: "WhatsApp link text",
      type: "string",
      group: "card",
      description: 'The message it shares is "Share message" in Gift settings.',
      validation: validateGiftPurchaseSlots,
      initialValue: "Share on WhatsApp",
    }),
    defineField({
      name: "sendButtonLabel",
      title: "Send-by-email button label",
      type: "string",
      group: "card",
      validation: validateGiftPurchaseSlots,
      initialValue: "Send it by email from Josephine",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Gift Purchase → Buyer",
      subtitle:
        "Sent to someone who bought a reading as a gift, right after their Stripe payment succeeds.",
    }),
  },
});
