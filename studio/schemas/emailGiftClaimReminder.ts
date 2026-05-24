import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftClaimReminderSlots = slotValidation("emailGiftClaimReminder");

export const emailGiftClaimReminder = defineType({
  name: "emailGiftClaimReminder",
  title: "Email — Gift Claim — Reminder (to recipient)",
  type: "document",
  description:
    "Reminder follow-up sent to a gift recipient who hasn't claimed yet. Asks them to find the original email rather than minting a fresh link.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "body", title: "Body" },
    { name: "card", title: "Reading card" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailGiftClaimReminder"),
    defineField({
      name: "subject",
      title: "Subject",
      type: "string",
      group: "envelope",
      initialValue: "A reading is still waiting for you",
    }),
    defineField({
      name: "preview",
      title: "Inbox preview",
      type: "string",
      group: "envelope",
      description:
        "The grey snippet shown next to the subject line. {purchaserFirstName} is the original sender — kept here on purpose so the recipient remembers whose gift this was.",
      validation: validateGiftClaimReminderSlots,
      initialValue: "A small reminder about the reading {purchaserFirstName} sent you.",
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
      initialValue: "Still here, when you’re ready",
    }),
    defineField({
      name: "body",
      title: "Body",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "body",
      description:
        'The full body of the reminder email. Softer tone, asks the recipient to find the original email. Use "{recipientName}", "{purchaserFirstName}", "{readingName}".',
      validation: validateGiftClaimReminderSlots,
    }),
    defineField({
      name: "giftMessageLabel",
      title: "Gift-message label",
      type: "string",
      group: "body",
      description:
        "Header shown above the purchaser's personal note (only renders if they wrote one). {purchaserFirstName} sets the attribution.",
      validation: validateGiftClaimReminderSlots,
      initialValue: "A note from {purchaserFirstName}",
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
      initialValue: "Delivered within 7 days of your intake",
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
    prepare: () => ({ title: "Email — Gift Claim — Reminder (to recipient)" }),
  },
});
