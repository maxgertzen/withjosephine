import { defineField, defineType } from "sanity";

export const bookingGiftForm = defineType({
  name: "bookingGiftForm",
  title: "Booking Gift Form",
  type: "document",
  description:
    "Copy for the /book/[readingId]/gift page. Anything in curly braces is auto-filled — edit the words around them, not the braces themselves.",
  groups: [
    { name: "frame", title: "Page frame" },
    { name: "delivery", title: "Delivery method" },
    { name: "fields", title: "Fields" },
    { name: "sendAt", title: "Send-at picker" },
    { name: "consent", title: "Consent + refund" },
    { name: "submit", title: "Submit + errors" },
  ],
  fields: [
    // Page frame
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      group: "frame",
      initialValue: "A reading, given.",
      description: "Cormorant italic H1 at top of page.",
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: "subheading",
      title: "Subheading (optional)",
      type: "text",
      rows: 2,
      group: "frame",
      description: "Optional warm line beneath the heading.",
    }),

    // Delivery method
    defineField({
      name: "deliveryMethodLabel",
      title: "Delivery method — section label",
      type: "string",
      group: "delivery",
      initialValue: "How should it travel?",
    }),
    defineField({
      name: "deliveryMethodSelfSendLabel",
      title: "Self-send option label",
      type: "string",
      group: "delivery",
      initialValue: "I'll send the link myself",
    }),
    defineField({
      name: "deliveryMethodSelfSendHelper",
      title: "Self-send option helper",
      type: "text",
      rows: 2,
      group: "delivery",
      initialValue:
        "You'll receive a private link by email. Forward it to them in your own words.",
    }),
    defineField({
      name: "deliveryMethodScheduledLabel",
      title: "Scheduled option label",
      type: "string",
      group: "delivery",
      initialValue: "Schedule the email",
    }),
    defineField({
      name: "deliveryMethodScheduledHelper",
      title: "Scheduled option helper",
      type: "text",
      rows: 2,
      group: "delivery",
      initialValue: "We'll email them on the date you choose.",
    }),

    // Fields — labels, placeholders, helpers
    defineField({
      name: "purchaserFirstNameLabel",
      title: "Your first name — label",
      type: "string",
      group: "fields",
      initialValue: "Your first name",
    }),
    defineField({
      name: "purchaserFirstNameHelper",
      title: "Your first name — helper",
      type: "text",
      rows: 2,
      group: "fields",
      initialValue: "So we can tell them who it's from.",
    }),
    defineField({
      name: "purchaserEmailLabel",
      title: "Your email — label",
      type: "string",
      group: "fields",
      initialValue: "Your email",
    }),
    defineField({
      name: "purchaserEmailHelper",
      title: "Your email — helper",
      type: "text",
      rows: 2,
      group: "fields",
      initialValue: "Your receipt + a copy of the gift link will arrive here.",
    }),
    defineField({
      name: "recipientNameLabelSelfSend",
      title: "Recipient name (self-send) — label",
      type: "string",
      group: "fields",
      initialValue: "Who's this for? (optional)",
    }),
    defineField({
      name: "recipientNamePlaceholderSelfSend",
      title: "Recipient name (self-send) — placeholder",
      type: "string",
      group: "fields",
      initialValue: "my sister, Maya, the friend who keeps mentioning her chart…",
    }),
    defineField({
      name: "recipientNameLabelScheduled",
      title: "Recipient name (scheduled) — label",
      type: "string",
      group: "fields",
      initialValue: "Their first name",
    }),
    defineField({
      name: "recipientNameHelperScheduled",
      title: "Recipient name (scheduled) — helper",
      type: "text",
      rows: 2,
      group: "fields",
      initialValue: "We'll address the email to them.",
    }),
    defineField({
      name: "recipientEmailLabel",
      title: "Recipient email — label",
      type: "string",
      group: "fields",
      initialValue: "Their email",
    }),
    defineField({
      name: "recipientEmailHelper",
      title: "Recipient email — helper",
      type: "text",
      rows: 2,
      group: "fields",
      initialValue: "Used only to send the claim email at the time you choose.",
    }),
    defineField({
      name: "giftMessageLabel",
      title: "Gift message — label",
      type: "string",
      group: "fields",
      initialValue: "A note for them (optional)",
    }),
    defineField({
      name: "giftMessagePlaceholder",
      title: "Gift message — placeholder",
      type: "string",
      group: "fields",
      initialValue: "A word for them, if you like…",
    }),

    // Send-at picker
    defineField({
      name: "sendAtSectionLabel",
      title: "Send-at — section label",
      type: "string",
      group: "sendAt",
      initialValue: "When should it arrive?",
    }),
    defineField({
      name: "sendAtPresetNow",
      title: "Preset — send now",
      type: "string",
      group: "sendAt",
      initialValue: "Right away",
    }),
    defineField({
      name: "sendAtPresetWeek",
      title: "Preset — in one week",
      type: "string",
      group: "sendAt",
      initialValue: "On a chosen morning",
    }),
    defineField({
      name: "sendAtPresetMonth",
      title: "Preset — at a specific moment",
      type: "string",
      group: "sendAt",
      initialValue: "At a specific moment",
    }),
    defineField({
      name: "sendAtCustomLabel",
      title: "Custom send-at — date+time label",
      type: "string",
      group: "sendAt",
      initialValue: "Choose the date and time",
    }),

    // Consent + refund
    defineField({
      name: "consentIntro",
      title: "Consent section intro",
      type: "string",
      group: "consent",
      initialValue: "Before this travels onward —",
    }),
    defineField({
      name: "nonRefundableNotice",
      title: "Non-refundable notice",
      type: "text",
      rows: 3,
      group: "consent",
      description: "Body copy rendered above the cooling-off checkbox. Mirrors self-purchase.",
      initialValue:
        "Gifts are non-refundable once payment is complete. You can change the recipient (their name, email, or send-at date) any time before we send them the claim email.",
      validation: (rule) => rule.required(),
    }),
    // Submit + errors
    defineField({
      name: "submitButtonSelfSend",
      title: "Submit button — self-send",
      type: "string",
      group: "submit",
      initialValue: "Send this gift",
    }),
    defineField({
      name: "submitButtonScheduled",
      title: "Submit button — scheduled",
      type: "string",
      group: "submit",
      initialValue: "Prepare this gift",
    }),
    defineField({
      name: "loadingStateCopy",
      title: "Loading state copy",
      type: "string",
      group: "submit",
      initialValue: "One moment — taking you to checkout.",
    }),
    defineField({
      name: "antiAbuseCapHeading",
      title: "Anti-abuse cap — heading",
      type: "string",
      group: "submit",
      initialValue: "A gentle pause",
    }),
    defineField({
      name: "antiAbuseCapBody",
      title: "Anti-abuse cap — body",
      type: "text",
      rows: 2,
      group: "submit",
      initialValue:
        "We're holding a gift for this person already. Please give them a moment to open it before sending another.",
    }),

    // Validation strings — inline field-level errors shown when the purchaser
    // tries to submit with an empty/invalid field.
    defineField({
      name: "firstNameRequiredError",
      title: "Validation — first name required",
      type: "string",
      group: "submit",
      initialValue: "Your first name is required.",
    }),
    defineField({
      name: "emailInvalidError",
      title: "Validation — purchaser email invalid",
      type: "string",
      group: "submit",
      initialValue: "Enter a valid email address.",
    }),
    defineField({
      name: "recipientNameRequiredError",
      title: "Validation — recipient name required",
      type: "string",
      group: "submit",
      initialValue: "Recipient name is required.",
    }),
    defineField({
      name: "recipientEmailRequiredError",
      title: "Validation — recipient email required",
      type: "string",
      group: "submit",
      initialValue: "Enter a valid recipient email.",
    }),
    defineField({
      name: "sendAtRequiredError",
      title: "Validation — send date required",
      type: "string",
      group: "submit",
      initialValue: "Pick when the gift should arrive.",
    }),
    defineField({
      name: "consentRequiredError",
      title: "Validation — consent required",
      type: "string",
      description:
        "Shown on each of the 3 consent checkboxes when left unchecked.",
      group: "submit",
      initialValue: "Required to proceed.",
    }),
    defineField({
      name: "verificationError",
      title: "Top-level — Turnstile verification failed",
      type: "string",
      group: "submit",
      initialValue: "Please complete the verification step and try again.",
    }),
    defineField({
      name: "genericError",
      title: "Top-level — generic submission error",
      type: "string",
      group: "submit",
      initialValue: "Something went wrong. Please try again.",
    }),
    defineField({
      name: "networkError",
      title: "Top-level — network error",
      type: "string",
      group: "submit",
      initialValue: "Network problem. Please try again.",
    }),

    defineField({
      name: "sendAtTimezoneHint",
      title: "Send-at — timezone preview prefix",
      type: "string",
      group: "sendAt",
      description:
        "Prefixes the live preview shown under the date/time picker. Use {date} to substitute the formatted date+time string (e.g. 'This will arrive {date} in your timezone').",
      initialValue: "This will arrive {date} in your timezone.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Booking Gift Form" }),
  },
});
