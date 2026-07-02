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
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body copy" },
    { name: "card", title: "Reading card" },
    { name: "dataExport", title: "Data export section" },
    { name: "footer", title: "Sign-off & footer" },
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
      title: "Hero line (after divider)",
      type: "string",
      group: "header",
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
      title: "Data export — heading",
      type: "string",
      group: "dataExport",
      description:
        "Small heading for the GDPR data-export section shown beneath the reading card.",
      initialValue: "Your data, your right",
    }),
    defineField({
      name: "dataExportBlurb",
      title: "Data export — blurb",
      type: "text",
      rows: 3,
      group: "dataExport",
      description:
        "One or two sentences explaining the customer can download the data held for this order.",
      initialValue:
        "You can download everything we hold for this reading, your intake, consent, and payment records, whenever you like. It is your right under GDPR.",
    }),
    defineField({
      name: "dataExportButtonLabel",
      title: "Data export — button label",
      type: "string",
      group: "dataExport",
      initialValue: "Request my data export",
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
      title: "Order Confirmation → Self-Purchaser",
      subtitle:
        "Sent to a customer who bought a reading for themselves, right after their Stripe payment succeeds. Confirms the order and tells them their reading will arrive within 7 days.",
    }),
  },
});
