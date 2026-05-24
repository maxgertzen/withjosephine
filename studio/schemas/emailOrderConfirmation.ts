import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateOrderSlots = slotValidation("emailOrderConfirmation");

export const emailOrderConfirmation = defineType({
  name: "emailOrderConfirmation",
  title: "Email — Order Confirmation",
  type: "document",
  description:
    "Sent to a customer after their Stripe payment succeeds for a self-purchase. Confirms order receipt and sets timing expectations for the reading.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailOrderConfirmation"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      initialValue: "Your reading is booked — here's what happens next",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      initialValue: "Your reading is booked — here's what happens next",
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
      initialValue: "Your reading is booked",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      group: "body",
      description: 'Use "{firstName}" to insert the customer\'s first name.',
      validation: validateOrderSlots,
      initialValue: "Hi {firstName},",
    }),
    defineField({
      name: "thanksLine",
      title: "Thanks paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description: 'Use "{readingName}" to insert the reading name. Bold/italic/link via toolbar.',
      validation: validateOrderSlots,
    }),
    defineField({
      name: "timelineLine",
      title: "Timeline paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description: "Bold/italic/link via toolbar.",
    }),
    defineField({
      name: "contactLine",
      title: "Contact paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description: "Bold/italic/link via toolbar.",
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
    prepare: () => ({ title: "Email — Order Confirmation" }),
  },
});
