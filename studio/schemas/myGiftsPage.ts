import { defineField, defineType } from "sanity";

export const myGiftsPage = defineType({
  name: "myGiftsPage",
  title: "My Gifts Page",
  type: "document",
  fields: [
    defineField({
      name: "listHeading",
      title: "List — Heading",
      type: "string",
      description: "Page heading shown to a signed-in purchaser browsing their gifts.",
      initialValue: "Your gifts",
    }),
    defineField({
      name: "listSubheading",
      title: "List — Subheading",
      type: "text",
      rows: 2,
      initialValue: "Every reading you’ve sent, gathered in one quiet place.",
    }),
    defineField({
      name: "emptyHeading",
      title: "Empty state — heading",
      type: "string",
      initialValue: "No gifts here yet.",
    }),
    defineField({
      name: "emptyBody",
      title: "Empty state — body",
      type: "text",
      rows: 2,
      initialValue: "When you send a reading to someone, you’ll find its status here.",
    }),
    defineField({
      name: "emptyCtaLabel",
      title: "Empty state — CTA label",
      type: "string",
      initialValue: "Send a reading",
    }),
    defineField({
      name: "signInHeading",
      title: "Sign-in card — heading",
      type: "string",
      initialValue: "Welcome back",
    }),
    defineField({
      name: "signInBody",
      title: "Sign-in card — body",
      type: "text",
      rows: 2,
      initialValue:
        "Tell us the email you used to send a gift, and we’ll send a fresh link to manage it.",
    }),
    defineField({
      name: "signInButtonLabel",
      title: "Sign-in card — button label",
      type: "string",
      initialValue: "Send me a link",
    }),
    defineField({
      name: "signInFootnote",
      title: "Sign-in card — italic footnote",
      type: "string",
      initialValue: "Your gifts are still here, exactly as you left them.",
    }),
    defineField({
      name: "checkEmailHeading",
      title: "Check-your-email card — heading",
      type: "string",
      initialValue: "Check your email",
    }),
    defineField({
      name: "checkEmailBody",
      title: "Check-your-email card — body",
      type: "text",
      rows: 2,
      initialValue:
        "If we have a gift on file for that email, a fresh link is on its way. It expires in twenty-four hours.",
    }),
    defineField({
      name: "checkEmailResendLabel",
      title: "Check-your-email card — resend link label",
      type: "string",
      initialValue: "Send another",
    }),
    defineField({
      name: "statusScheduledLabel",
      title: "Status label — Scheduled",
      type: "string",
      initialValue: "Scheduled to send",
    }),
    defineField({
      name: "statusSelfSendReadyLabel",
      title: "Status label — Self-send ready",
      type: "string",
      initialValue: "Link ready to share",
    }),
    defineField({
      name: "statusSentLabel",
      title: "Status label — Sent, waiting",
      type: "string",
      initialValue: "Sent — waiting for them to open it",
    }),
    defineField({
      name: "statusPreparingLabel",
      title: "Status label — Recipient preparing",
      type: "string",
      initialValue: "They’re preparing their reading",
    }),
    defineField({
      name: "statusDeliveredLabel",
      title: "Status label — Delivered",
      type: "string",
      initialValue: "Delivered",
    }),
    defineField({
      name: "statusCancelledLabel",
      title: "Status label — Cancelled",
      type: "string",
      initialValue: "Cancelled",
    }),
    defineField({
      name: "editRecipientCtaLabel",
      title: "Action — Edit recipient",
      type: "string",
      initialValue: "Edit recipient",
    }),
    defineField({
      name: "flipToSelfSendCtaLabel",
      title: "Action — Flip to self-send",
      type: "string",
      initialValue: "Send the link myself instead",
    }),
    defineField({
      name: "resendLinkCtaLabel",
      title: "Action — Resend link",
      type: "string",
      initialValue: "Resend the link to me",
    }),
    defineField({
      name: "privacyNote",
      title: "Privacy note",
      type: "text",
      rows: 2,
      description:
        "Italic note reminding the purchaser they only see status, not intake answers or assets.",
      initialValue:
        "We only show you status here — your recipient’s answers, voice note, and PDF stay private to them.",
    }),

    defineField({
      name: "editRecipientFormTitle",
      title: "Edit recipient drawer — heading",
      type: "string",
      initialValue: "Edit recipient",
    }),
    defineField({
      name: "editRecipientFormRecipientNameLabel",
      title: "Edit recipient drawer — name field label",
      type: "string",
      initialValue: "Recipient name",
    }),
    defineField({
      name: "editRecipientFormRecipientEmailLabel",
      title: "Edit recipient drawer — email field label",
      type: "string",
      initialValue: "Recipient email",
    }),
    defineField({
      name: "editRecipientFormSendAtLabel",
      title: "Edit recipient drawer — send-at label",
      type: "string",
      initialValue: "Send at",
    }),
    defineField({
      name: "editRecipientSaveButtonLabel",
      title: "Edit recipient drawer — save button",
      type: "string",
      initialValue: "Save changes",
    }),
    defineField({
      name: "editRecipientSavingLabel",
      title: "Edit recipient drawer — saving label",
      type: "string",
      description: "Shown on the save button while the request is in flight.",
      initialValue: "Saving…",
    }),
    defineField({
      name: "editRecipientCancelButtonLabel",
      title: "Edit recipient drawer — cancel button",
      type: "string",
      initialValue: "Cancel",
    }),
    defineField({
      name: "flipConfirmCtaLabel",
      title: "Flip-to-self-send — confirm CTA",
      type: "string",
      description: "Second click of the 2-stage confirm pattern (replaces the initial CTA).",
      initialValue: "Tap again to confirm",
    }),
    defineField({
      name: "flipSwitchingLabel",
      title: "Flip-to-self-send — switching label",
      type: "string",
      description: "Shown on the confirm button while the request is in flight.",
      initialValue: "Switching…",
    }),
    defineField({
      name: "resendSendingLabel",
      title: "Resend link — sending label",
      type: "string",
      description: "Shown on the resend button while the request is in flight.",
      initialValue: "Sending…",
    }),
    defineField({
      name: "resendThrottledMessage",
      title: "Resend link — rate-limit message",
      type: "string",
      description:
        "Shown when the resend rate limit has been hit (the API would return 429).",
      initialValue: "You’ve already resent this recently. Try again in a little while.",
    }),
    defineField({
      name: "actionGenericError",
      title: "Action errors — generic",
      type: "string",
      initialValue: "Something went wrong. Please try again.",
    }),
    defineField({
      name: "actionNetworkError",
      title: "Action errors — network",
      type: "string",
      initialValue: "Network problem. Please try again.",
    }),
    defineField({
      name: "actionClosedError",
      title: "Action errors — gift no longer editable (409)",
      type: "string",
      description:
        "Shown when an edit hits the API after the claim email already fired — purchaser can no longer change recipient details.",
      initialValue: "This gift can’t be edited anymore.",
    }),
    defineField({
      name: "editRecipientSendAtPreviewTemplate",
      title: "Edit drawer — timezone preview template",
      type: "string",
      description:
        "Live preview shown under the edit-recipient drawer's send-at picker. Use {date} as a placeholder for the formatted weekday + month + day + time string.",
      initialValue: "Arrives {date} in your timezone.",
    }),
    defineField({
      name: "resendRetryAfterHourTemplate",
      title: "Resend link — hour-cap retry message",
      type: "string",
      description:
        "Shown beneath the resend CTA when the 1-per-hour cap is hit. Use {when} as a placeholder for the formatted next-available time.",
      initialValue: "You can resend again at {when}.",
    }),
    defineField({
      name: "resendRetryAfterDayTemplate",
      title: "Resend link — day-cap retry message",
      type: "string",
      description:
        "Shown beneath the resend CTA when the 3-per-day cap is hit. Use {when} as a placeholder for the formatted next-available time.",
      initialValue: "You’ve hit today’s limit. Try again at {when}.",
    }),
    defineField({
      name: "resendRetryFallbackLabel",
      title: "Resend link — retry fallback (when timestamp unparseable)",
      type: "string",
      initialValue: "shortly",
    }),
  ],
  preview: {
    prepare: () => ({ title: "My Gifts Page" }),
  },
});
