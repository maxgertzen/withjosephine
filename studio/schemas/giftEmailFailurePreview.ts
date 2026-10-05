import { buildFailurePreview, type EmailFailurePreviewInput } from "./emailFailurePreview";

export const GIFT_EMAIL_TYPE_LABELS: Record<string, string> = {
  gift_confirmation: "Gift confirmation",
  gift_send: "Gift email",
  gift_opened: "Gift opened",
};

export const GIFT_RECIPIENT_LABELS: Record<string, string> = {
  buyer: "The buyer",
  recipient: "The recipient",
};

export function prepareGiftEmailFailurePreview(failure: EmailFailurePreviewInput) {
  const emailLabel = (failure.emailType && GIFT_EMAIL_TYPE_LABELS[failure.emailType]) || "Email";
  const sentTo = failure.recipient ? GIFT_RECIPIENT_LABELS[failure.recipient]?.toLowerCase() : undefined;
  return buildFailurePreview(emailLabel, sentTo, failure);
}
