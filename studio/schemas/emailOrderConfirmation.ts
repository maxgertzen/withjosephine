import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateOrderSlots = slotValidation("emailOrderConfirmation");

export const emailOrderConfirmation = defineType({
  name: "emailOrderConfirmation",
  title: "Order Confirmation → Self-Purchaser",
  type: "document",
  description:
    "Sent to a customer who bought a reading for themselves, right after their Stripe payment succeeds. Confirms the order and tells them their reading will arrive within 7 days.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "dataExport", title: "Data export section" },
  ],
  fields: [
    tokenReferenceField("emailOrderConfirmation"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      initialValue: "Your reading is booked: what happens next",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview text",
      type: "string",
      group: "envelope",
      initialValue: "Your reading is booked: what happens next",
    }),
    defineField({
      name: "heroLine",
      title: "Hero line (after divider)",
      type: "string",
      group: "body",
      initialValue: "Your reading is booked",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'The full body of the email. Bold/italic/link via the toolbar. Use "{firstName}" to insert the customer\'s first name and "{readingName}" to insert the reading name.',
      validation: validateOrderSlots,
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
      name: "dataExportHeading",
      title: "Data export — lead-in text",
      type: "string",
      group: "dataExport",
      description:
        "The GDPR data-export line at the very bottom of the email. This lead-in text is followed inline by the link below.",
      initialValue: "Need a copy of your data?",
    }),
    defineField({
      name: "dataExportButtonLabel",
      title: "Data export — link text",
      type: "string",
      group: "dataExport",
      initialValue: "Request an export",
    }),
  ],
  preview: {
    prepare: () => ({
      title: "Order Confirmation → Self-Purchaser",
      subtitle:
        "Sent to a customer who bought a reading for themselves, right after their Stripe payment succeeds. Confirms the order and tells them their reading will arrive within 7 days.",
    }),
  },
});
