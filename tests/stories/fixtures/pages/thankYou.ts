import type { ThankYouViewCopy } from "@/app/(authed)/thank-you/[readingId]/ThankYouView";

export const THANK_YOU_BASE_COPY: ThankYouViewCopy = {
  heading: "Thank you. I’ve got everything I need.",
  subheading: "Your reading is in my hands now.",
  readingLabel: "Your Reading",
  confirmationBody:
    "A confirmation email is on its way to your inbox in the next minute or two. If you can’t find it, please check your promotions folder.",
  timelineBody:
    "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used at checkout.",
  contactBody:
    "If anything comes up, just reply to that email or write to me at {email}. It comes straight to me.",
  closingMessage: "With love, Josephine ✦",
  returnButtonText: "Return to Home",
  deliveryDaysPhrase: "seven days",
};

export const THANK_YOU_READING = {
  name: "Soul Blueprint",
  price: "$179",
  cents: 17900,
} as const;

export const THANK_YOU_GIFT_PURCHASER_COPY: ThankYouViewCopy = {
  ...THANK_YOU_BASE_COPY,
  heading: "Thank you, {purchaserFirstName}. Your gift is on its way.",
  subheading:
    "I'll take it from here. The recipient will receive a note from me with their claim link.",
  readingLabel: "Your gift",
  confirmationBody:
    "A confirmation is on its way to your inbox. When the gift is ready to be opened, the recipient will receive their own note with a claim link.",
  timelineBody:
    "I’ll begin the recipient’s reading within the next two days of them claiming the gift. Their voice note and PDF will arrive within {deliveryDays}, sent to the email they use to claim.",
};

export const THANK_YOU_GIFT_PURCHASER_SELF_SEND_COPY: ThankYouViewCopy = {
  ...THANK_YOU_GIFT_PURCHASER_COPY,
  subheading:
    "Your gift link is ready in the email I just sent, share it with them whenever feels right.",
  confirmationBody:
    "A confirmation is on its way to your inbox with the share link inside. Forward it to the recipient when you're ready, they'll claim from there.",
};

export const THANK_YOU_GIFT_RECIPIENT_COPY: ThankYouViewCopy = {
  ...THANK_YOU_BASE_COPY,
  heading: "Thank you, {recipientName}. Your reading is in my hands now.",
  subheading: "I've received everything I need to begin.",
  timelineBody:
    "I’ll begin your reading within the next two days, and I’ll send a short note when I do. Your voice note and PDF will arrive within {deliveryDays}, sent to the email you used to claim this gift.",
};
