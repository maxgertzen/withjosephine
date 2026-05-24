import { defineField, defineType } from "sanity";

import { tokenReferenceField } from "../lib/tokenHelp";
import { slotValidation } from "../lib/validateSlots";

const validateGiftPurchaseSlots = slotValidation("emailGiftPurchaseConfirmation");

export const emailGiftPurchaseConfirmation = defineType({
  name: "emailGiftPurchaseConfirmation",
  title: "Email — Gift Purchase Confirmation (to purchaser)",
  type: "document",
  description:
    "Sent to the purchaser after they buy a gift reading. Has self-send (they share the claim link themselves) and scheduled (we send to recipient on a chosen date) variants.",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "selfSend", title: "Self-send variant" },
    { name: "scheduled", title: "Scheduled variant" },
    { name: "shared", title: "Shared copy" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    tokenReferenceField("emailGiftPurchaseConfirmation"),
    defineField({
      name: "subjectSelfSend",
      title: "Subject (self-send)",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is ready to share",
    }),
    defineField({
      name: "subjectScheduled",
      title: "Subject (scheduled)",
      type: "string",
      group: "envelope",
      initialValue: "Your gift is scheduled",
    }),
    defineField({
      name: "previewSelfSend",
      title: "Inbox preview (self-send)",
      type: "string",
      group: "envelope",
      initialValue: "Your shareable link is inside.",
    }),
    defineField({
      name: "previewScheduled",
      title: "Inbox preview (scheduled)",
      type: "string",
      group: "envelope",
      description:
        "Inbox preview for the SCHEDULED variant (when the purchaser picked a future send date). {recipientName} is who the gift is for, {sendAtDisplay} is the date+time formatted in the purchaser's timezone (e.g. 'Friday, December 12 at 9:00 AM').",
      validation: validateGiftPurchaseSlots,
      initialValue: "We'll send it to {recipientName} on {sendAtDisplay}.",
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
      name: "heroLineSelfSend",
      title: "Hero line — self-send",
      type: "string",
      group: "selfSend",
      initialValue: "A reading, ready for them",
    }),
    defineField({
      name: "heroLineScheduled",
      title: "Hero line — scheduled",
      type: "string",
      group: "scheduled",
      initialValue: "A reading, on its way",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      group: "shared",
      description: 'Use "{purchaserFirstName}".',
      validation: validateGiftPurchaseSlots,
      initialValue: "Hi {purchaserFirstName},",
    }),
    defineField({
      name: "detailLineSelfSend",
      title: "Detail paragraph — self-send",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "selfSend",
      description:
        "Body of the SELF-SEND confirmation — the purchaser chose to share the link themselves. The 'private link' phrase is load-bearing: the rendered email contains that actual URL beneath this paragraph. {readingName} is the reading; {recipientName} is who they're giving it to.",
      validation: validateGiftPurchaseSlots,
    }),
    defineField({
      name: "detailLineScheduled",
      title: "Detail paragraph — scheduled",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "scheduled",
      description:
        "Body of the SCHEDULED confirmation — the purchaser picked a future send date and we'll fire the recipient's email automatically. No link in this email (it goes to the recipient on the chosen date). {readingName} the reading; {recipientName} who it's for; {sendAtDisplay} the date+time we'll send.",
      validation: validateGiftPurchaseSlots,
    }),
    defineField({
      name: "shareButtonLabel",
      title: "Share button label (self-send)",
      type: "string",
      group: "selfSend",
      initialValue: "OPEN GIFT LINK",
    }),
    defineField({
      name: "shareUrlHelper",
      title: "Share helper text (self-send)",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "selfSend",
      description:
        "Sits directly below the share button in the SELF-SEND variant; reminds the purchaser this URL is for one specific person, not a coupon to forward broadly. {recipientName} grounds the message in the actual recipient.",
      validation: validateGiftPurchaseSlots,
    }),
    defineField({
      name: "cardLabel",
      title: "Reading card — label",
      type: "string",
      group: "shared",
      initialValue: "The gift",
    }),
    defineField({
      name: "cardDeliveryLine",
      title: "Reading card — delivery line",
      type: "string",
      group: "shared",
      initialValue: "Delivery within 7 days of claim",
    }),
    defineField({
      name: "refundLine",
      title: "Refund disclosure paragraph",
      type: "array",
      of: [{ type: "block", styles: [{ title: "Normal", value: "normal" }], lists: [] }],
      group: "shared",
      description: 'Use "{recipientName}".',
      validation: validateGiftPurchaseSlots,
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
    prepare: () => ({ title: "Email — Gift Purchase Confirmation" }),
  },
});
