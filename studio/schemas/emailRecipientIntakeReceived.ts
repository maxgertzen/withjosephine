import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateRecipientIntakeSlots = slotValidation("emailRecipientIntakeReceived");

export const emailRecipientIntakeReceived = defineType({
  name: "emailRecipientIntakeReceived",
  title: "Email — Recipient Intake Received",
  type: "document",
  description:
    "Sent to a gift recipient immediately after they submit their intake. Confirms the answers landed and sets timing expectations.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailRecipientIntakeReceived"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      description: 'Use "{recipientName}" / "{readingName}" placeholders.',
      validation: validateRecipientIntakeSlots,
      initialValue: "Your reading is in my hands now",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      initialValue: "Your answers landed safely — here's what happens next.",
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
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
      initialValue: "Your reading is in my hands",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      group: "body",
      description: 'Use "{recipientName}" to insert the recipient\'s name.',
      validation: validateRecipientIntakeSlots,
      initialValue: "Hi {recipientName},",
    }),
    defineField({
      name: "thanksLine",
      title: "Thanks paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description: 'Use "{readingName}" / "{purchaserFirstName}" placeholders.',
      validation: validateRecipientIntakeSlots,
    }),
    defineField({
      name: "timelineLine",
      title: "Timeline paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
    }),
    defineField({
      name: "contactLine",
      title: "Contact paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "card",
      initialValue: "Your reading",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "card",
      initialValue: "Delivery within 7 days",
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
    prepare: () => ({ title: "Email — Recipient Intake Received" }),
  },
});
