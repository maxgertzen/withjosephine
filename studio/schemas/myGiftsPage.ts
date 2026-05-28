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
      title: "Action — Cancel the schedule and send myself",
      type: "string",
      description:
        "Shown on scheduled gifts. Cancels the scheduled send and reverts the gift to self-send mode (link goes back to the purchaser, who then shares it directly or re-schedules with a new date).",
      initialValue: "Cancel the schedule and send it myself",
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
      name: "editRecipientSelfSendIndicator",
      title: "Edit recipient drawer — self-send indicator badge",
      type: "string",
      description:
        "Shown only when the gift is in self-send mode (purchaser hands off the link themselves). Reminds the purchaser they're editing a self-send gift even while we collect a recipient email.",
      initialValue: "Self-send delivery — you share the link yourself",
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
      name: "editRecipientTimezoneLabel",
      title: "Edit recipient drawer — timezone picker label",
      type: "string",
      description:
        "Label above the fallback timezone dropdown (shown only when the browser can't auto-detect the IANA zone, e.g. iOS Safari pre-17).",
      initialValue: "Time zone",
    }),
    defineField({
      name: "editRecipientTimezonePlaceholder",
      title: "Edit recipient drawer — timezone picker placeholder",
      type: "string",
      initialValue: "Pick your time zone",
    }),
    defineField({
      name: "editRecipientTimezoneFallbackHelp",
      title: "Edit recipient drawer — timezone fallback help text",
      type: "string",
      description:
        "Help message shown above the fallback dropdown when timezone auto-detection fails.",
      initialValue:
        "We couldn’t detect your time zone. Pick one below so the email arrives at the right moment.",
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
        "Live preview shown under the edit-recipient drawer's send-at picker. {date} = formatted weekday + month + day + time; {tz} = IANA timezone name.",
      initialValue: "Arrives {date} ({tz}).",
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
    defineField({
      name: "flipToScheduledCtaLabel",
      title: "Flip self-send → scheduled — button label",
      type: "string",
      description:
        "Shown on self-send gifts that haven't been claimed yet. Lets the purchaser convert the gift to scheduled delivery (Josephine emails the recipient on the chosen date).",
      initialValue: "Let Josephine send it for me",
    }),
    defineField({
      name: "flipToScheduledFormTitle",
      title: "Flip self-send → scheduled — form title",
      type: "string",
      initialValue: "Have Josephine deliver the link",
    }),
    defineField({
      name: "flipToScheduledSaveButtonLabel",
      title: "Flip self-send → scheduled — save button label",
      type: "string",
      initialValue: "Schedule it",
    }),
    defineField({
      name: "flipToScheduledSavingLabel",
      title: "Flip self-send → scheduled — saving label",
      type: "string",
      initialValue: "Scheduling…",
    }),
    defineField({
      name: "sendNowCtaLabel",
      title: "Send now — initial CTA",
      type: "string",
      description:
        "Shown on scheduled gifts. Purchaser taps once to arm, taps again to fire the claim email immediately (bypasses the scheduled alarm).",
      initialValue: "Send now",
    }),
    defineField({
      name: "sendNowConfirmCtaLabel",
      title: "Send now — armed confirm CTA",
      type: "string",
      description: "Second click of the 2-stage confirm pattern (replaces the initial CTA).",
      initialValue: "Tap again to send today",
    }),
    defineField({
      name: "sendNowSendingLabel",
      title: "Send now — sending label",
      type: "string",
      description: "Shown on the confirm button while the request is in flight.",
      initialValue: "Sending…",
    }),
    defineField({
      name: "sendNowSessionExpiredError",
      title: "Send now — session-expired error",
      type: "string",
      description:
        "Shown when the purchaser's session expired during the 5s arm window and the confirm tap returns 401.",
      initialValue: "Your session expired. Please refresh and try again.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "My Gifts Page" }),
  },
});
