import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftOpenedSlots = slotValidation("emailGiftOpened");

export const emailGiftOpened = defineType({
  name: "emailGiftOpened",
  title: "Gift Opened → Buyer",
  type: "document",
  description:
    "Sent to the person who bought a gift, once the recipient opens it and sends their details. It never includes the recipient's answers.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
  ],
  fields: [
    tokenReferenceField("emailGiftOpened"),
    defineField({
      name: "subjectTemplate",
      title: "Subject",
      type: "string",
      group: "envelope",
      validation: validateGiftOpenedSlots,
      initialValue: "{recipientName} opened your gift",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      validation: validateGiftOpenedSlots,
      initialValue: "Their reading is with me now.",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      validation: validateGiftOpenedSlots,
      initialValue: "Your gift was opened",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'Use "{firstName}" for the buyer\'s first name, "{recipientName}" for the recipient\'s first name and "{readingName}" for the reading name.',
      validation: validateGiftOpenedSlots,
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Gift Opened → Buyer",
      subtitle:
        "Sent to the person who bought a gift, once the recipient opens it and sends their details.",
    }),
  },
});
