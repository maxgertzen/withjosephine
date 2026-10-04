import { defineField, defineType } from "sanity";

import { GIFT_DEFAULTS, type GiftContent } from "../../src/data/defaults";

type GiftTextField = {
  title: string;
  group: "bookingPage" | "thankYou" | "recipient";
  description: string;
};

const TEXT_FIELDS: Record<keyof GiftContent, GiftTextField> = {
  sheetEyebrow: {
    title: "Sheet eyebrow",
    group: "bookingPage",
    description: "The small line at the top of the gift sheet and the redeem sheet.",
  },
  sheetCancelLabel: {
    title: "Sheet cancel button",
    group: "bookingPage",
    description: "The button that closes the gift sheet and the redeem sheet.",
  },
  shareMessageTemplate: {
    title: "Share message",
    group: "thankYou",
    description:
      "The message in the share sheet and in the Share on WhatsApp link of the buyer email. {buyerName} becomes the buyer's first name.",
  },
  sheetTitleTemplate: {
    title: "Sheet title",
    group: "bookingPage",
    description:
      "The gift sheet heading. {reading} becomes the reading name, {price} the reading price.",
  },
  sheetStepPay: {
    title: "Sheet step: pay",
    group: "bookingPage",
    description: "The first of the three steps on the gift sheet.",
  },
  sheetStepSend: {
    title: "Sheet step: send",
    group: "bookingPage",
    description: "The second of the three steps on the gift sheet.",
  },
  sheetStepRecipient: {
    title: "Sheet step: recipient",
    group: "bookingPage",
    description: "The third of the three steps on the gift sheet.",
  },
  buyerNameLabel: {
    title: "Buyer name label",
    group: "bookingPage",
    description: "The first name field label on the gift sheet.",
  },
  buyerNameHelp: {
    title: "Buyer name help",
    group: "bookingPage",
    description: "The line under the first name field on the gift sheet.",
  },
  buyerNameRequired: {
    title: "Buyer name required",
    group: "bookingPage",
    description:
      "The error under the first name field when it is empty, on the gift sheet and the edit note form.",
  },
  noteLabel: {
    title: "Note label",
    group: "bookingPage",
    description: "The note field label on the gift sheet and the edit note form.",
  },
  noteHelpBeforePayment: {
    title: "Note help",
    group: "bookingPage",
    description: "The line under the note field on the gift sheet while the note is empty.",
  },
  noteCounterTemplate: {
    title: "Note counter",
    group: "bookingPage",
    description:
      "The counter under both note fields from 220 characters. {remaining} becomes the characters left.",
  },
  sheetSubmitFailed: {
    title: "Server error",
    group: "bookingPage",
    description: "The error under the gift sheet and the edit note form when the server fails.",
  },
  sheetNetworkFailed: {
    title: "Network error",
    group: "bookingPage",
    description:
      "The error under the gift sheet and the edit note form when the connection fails.",
  },
  thankYouHeadingTemplate: {
    title: "Heading",
    group: "thankYou",
    description: "The buyer thank-you heading. {buyerName} becomes the buyer's first name.",
  },
  thankYouSubheading: {
    title: "Subheading",
    group: "thankYou",
    description: "The line under the buyer thank-you heading.",
  },
  codeCardLabel: {
    title: "Code card label",
    group: "thankYou",
    description: "The label above the gift code.",
  },
  copyLinkLabel: {
    title: "Copy link button",
    group: "thankYou",
    description: "The button that copies the gift link.",
  },
  linkCopiedLabel: {
    title: "Link copied button",
    group: "thankYou",
    description: "The copy button text after the link is copied.",
  },
  shareLabel: {
    title: "Share button",
    group: "thankYou",
    description: "The button that opens the share menu. Hidden in browsers without one.",
  },
  codeHelpTemplate: {
    title: "Code card help",
    group: "thankYou",
    description: "The line under the gift code buttons. {reading} becomes the reading name.",
  },
  savedNoteLabelTemplate: {
    title: "Saved note label",
    group: "thankYou",
    description: "The label of the saved note card. {buyerName} becomes the buyer's first name.",
  },
  editNoteLabel: {
    title: "Edit note link",
    group: "thankYou",
    description: "The link on the saved note card that opens the edit note form.",
  },
  noteFootnote: {
    title: "Saved note foot",
    group: "thankYou",
    description: "The line at the foot of the saved note card, after the edit note link.",
  },
  addNoteLabel: {
    title: "Add note link",
    group: "thankYou",
    description: "The link in place of the saved note card when there is no note.",
  },
  editNoteHeading: {
    title: "Edit note heading",
    group: "thankYou",
    description: "The heading of the edit note form.",
  },
  fromLabel: {
    title: "From label",
    group: "thankYou",
    description: "The buyer name field label on the edit note form.",
  },
  saveNoteLabel: {
    title: "Save note button",
    group: "thankYou",
    description: "The button on the edit note form.",
  },
  noteSavedNotice: {
    title: "Note saved",
    group: "thankYou",
    description: "The callout after the note is saved.",
  },
  noteLockedNotice: {
    title: "Note locked",
    group: "thankYou",
    description: "The callout when the note can no longer be changed.",
  },
  thankYouOpenedNotice: {
    title: "Gift opened",
    group: "thankYou",
    description: "The line in place of the note once the gift has been opened.",
  },
  pendingHeadingTemplate: {
    title: "Payment pending heading",
    group: "thankYou",
    description:
      "The heading while the payment is still confirming. {buyerName} becomes the buyer's first name.",
  },
  pendingSubheading: {
    title: "Payment pending subheading",
    group: "thankYou",
    description: "The line under the heading while the payment is still confirming.",
  },
  pendingBody: {
    title: "Payment pending card",
    group: "thankYou",
    description: "The card text while the payment is still confirming.",
  },
  priceLine: {
    title: "Price line",
    group: "recipient",
    description: "The price line on the gift booking form.",
  },
  noteCardLabelTemplate: {
    title: "Note card label",
    group: "recipient",
    description:
      "The label of the note card on the gift booking form. {buyerName} becomes the buyer's first name.",
  },
  noteCardFoot: {
    title: "Note card foot",
    group: "recipient",
    description: "The line at the foot of the note card.",
  },
  noteCardLabelNoBuyer: {
    title: "Note card label, no buyer name",
    group: "recipient",
    description: "The note card label when the buyer's name was erased.",
  },
  noteCardNoBuyerBody: {
    title: "Note card text, no buyer name",
    group: "recipient",
    description: "The note card text when the buyer's name was erased.",
  },
  noteCardFootNoBuyer: {
    title: "Note card foot, no buyer name",
    group: "recipient",
    description: "The note card foot when the buyer's name was erased.",
  },
  pageLineGiftTemplate: {
    title: "Page line suffix",
    group: "recipient",
    description:
      "Added to the end of the page line on the gift booking form. {buyerName} becomes the buyer's first name.",
  },
  draftRestoredNotice: {
    title: "Answers restored",
    group: "recipient",
    description: "The line under the note card when saved answers are restored.",
  },
  codeAppliedTemplate: {
    title: "Code applied",
    group: "recipient",
    description: "The applied code line on the last page. {code} becomes the gift code.",
  },
  removeCodeLabel: {
    title: "Remove code link",
    group: "recipient",
    description: "The link beside the applied code on the last page.",
  },
  giftFootTemplate: {
    title: "Nothing to pay line",
    group: "recipient",
    description: "The line on the last page. {buyerName} becomes the buyer's first name.",
  },
  giftFootNoBuyer: {
    title: "Nothing to pay line, no buyer name",
    group: "recipient",
    description: "The line on the last page when the buyer's name was erased.",
  },
  openedNoticeTemplate: {
    title: "Opened email notice",
    group: "recipient",
    description:
      "The line above the send button on the last page. {buyerName} becomes the buyer's first name.",
  },
  sendDetailsLabel: {
    title: "Send button",
    group: "recipient",
    description: "The button on the last page of the gift booking form.",
  },
  sendingDetailsOverlay: {
    title: "Sending overlay",
    group: "recipient",
    description: "The text over the form while the details are sending.",
  },
  openedRaceError: {
    title: "Opened elsewhere error",
    group: "recipient",
    description: "The error when the gift was opened on another device first.",
  },
  alreadyOpenedHeading: {
    title: "Already opened heading",
    group: "recipient",
    description: "The gift link page heading when the gift was already opened.",
  },
  alreadyOpenedBody: {
    title: "Already opened text",
    group: "recipient",
    description: "The gift link page text when the gift was already opened.",
  },
  noLongerActiveHeading: {
    title: "No longer active heading",
    group: "recipient",
    description: "The gift link page heading when the gift was cancelled or the reading removed.",
  },
  noLongerActiveBody: {
    title: "No longer active text",
    group: "recipient",
    description: "The gift link page text when the gift was cancelled or the reading removed.",
  },
  notFoundHeading: {
    title: "Not found heading",
    group: "recipient",
    description: "The gift link page heading when the code does not exist.",
  },
  notFoundBody: {
    title: "Not found text",
    group: "recipient",
    description: "The gift link page text when the code does not exist.",
  },
  rateLimitedHeading: {
    title: "Too many tries heading",
    group: "recipient",
    description: "The gift link page heading after too many tries.",
  },
  rateLimitedBody: {
    title: "Too many tries text",
    group: "recipient",
    description: "The gift link page text after too many tries.",
  },
  bookYourselfTemplate: {
    title: "Book it yourself button",
    group: "recipient",
    description: "The button on every gift link message page. {reading} becomes the reading name.",
  },
  redeemHeading: {
    title: "Redeem sheet heading",
    group: "bookingPage",
    description: "The heading of the redeem sheet.",
  },
  redeemBody: {
    title: "Redeem sheet help",
    group: "bookingPage",
    description: "The line under the redeem sheet heading.",
  },
  codeFieldLabel: {
    title: "Code field label",
    group: "bookingPage",
    description: "The code field label on the redeem sheet.",
  },
  redeemSheetEmpty: {
    title: "Empty code error",
    group: "bookingPage",
    description: "The error when Redeem is pressed with an empty code field.",
  },
  codeChecking: {
    title: "Checking label",
    group: "bookingPage",
    description: "The button text while a gift code is being checked.",
  },
  redeemButtonLabel: {
    title: "Redeem button",
    group: "bookingPage",
    description: "The button on the redeem sheet.",
  },
  codeNotFound: {
    title: "Code not found error",
    group: "bookingPage",
    description: "The error on the redeem sheet and the code field when the code does not exist.",
  },
  codeOtherReadingTemplate: {
    title: "Other reading error",
    group: "bookingPage",
    description:
      "The error when the code is for another reading. {reading} becomes that reading's name.",
  },
  goToReadingTemplate: {
    title: "Go to reading button",
    group: "bookingPage",
    description:
      "The redeem sheet button when the code is for another reading. {reading} becomes that reading's name.",
  },
  codeTooManyTries: {
    title: "Too many tries error",
    group: "bookingPage",
    description: "The error on the redeem sheet, the code field and the send button after too many tries.",
  },
  codeFieldOptionalLabel: {
    title: "Last page code field label",
    group: "bookingPage",
    description: "The code field label on the last page of the booking form.",
  },
  recipientThankYouHeadingTemplate: {
    title: "Thank-you heading",
    group: "recipient",
    description:
      "The recipient thank-you heading. {recipientName} becomes the recipient's first name.",
  },
  recipientThankYouSubheading: {
    title: "Thank-you subheading",
    group: "recipient",
    description: "The line under the recipient thank-you heading.",
  },
  recipientThankYouCardLabelTemplate: {
    title: "Thank-you card label",
    group: "recipient",
    description:
      "The card label on the recipient thank-you page. {buyerName} becomes the buyer's first name.",
  },
  recipientThankYouCardLabelNoBuyer: {
    title: "Thank-you card label, no buyer name",
    group: "recipient",
    description: "The card label on the recipient thank-you page when the buyer's name was erased.",
  },
  recipientThankYouTimelineTemplate: {
    title: "Thank-you timeline",
    group: "recipient",
    description:
      "The text on the recipient thank-you page. {deliveryDays} becomes the delivery phrase from the Thank-you page document.",
  },
  sendOpenLabel: {
    title: "Send by email button",
    group: "thankYou",
    description: "The button on the buyer thank-you page that opens the send form.",
  },
  sendHeading: {
    title: "Send form heading",
    group: "thankYou",
    description: "The heading of the send form, on the thank-you page and the send page.",
  },
  recipientNameLabel: {
    title: "Recipient name label",
    group: "thankYou",
    description: "The name field label on the send form.",
  },
  recipientEmailLabel: {
    title: "Recipient email label",
    group: "thankYou",
    description: "The email field label on the send form.",
  },
  recipientEmailInvalid: {
    title: "Invalid email error",
    group: "thankYou",
    description: "The error under the email field when the address is not valid.",
  },
  recipientEmailIsBuyer: {
    title: "Own email error",
    group: "thankYou",
    description: "The error under the email field when the address is the buyer's own.",
  },
  sendHelpTemplate: {
    title: "Send help, with a note",
    group: "thankYou",
    description:
      "The line above the send button when the gift has a note. {buyerName} becomes the buyer's first name.",
  },
  sendHelpNoNoteTemplate: {
    title: "Send help, no note",
    group: "thankYou",
    description:
      "The line above the send button when the gift has no note. {buyerName} becomes the buyer's first name.",
  },
  sendButtonLabel: {
    title: "Send button",
    group: "thankYou",
    description: "The button on the send form.",
  },
  sendingLabel: {
    title: "Sending label",
    group: "thankYou",
    description: "The send button text while the email is sending.",
  },
  sentHeadingTemplate: {
    title: "Sent heading",
    group: "thankYou",
    description:
      "The card heading right after a send. {recipientName} becomes the recipient's name.",
  },
  sentBodyTemplate: {
    title: "Sent text",
    group: "thankYou",
    description:
      "The card text right after a send. {recipientEmail} becomes the address the buyer typed.",
  },
  resendLinkTemplate: {
    title: "Send again link",
    group: "thankYou",
    description:
      "The link on the card after the first send that opens the form again. {count} becomes the sends left.",
  },
  resendUsedHeading: {
    title: "Sent twice heading",
    group: "thankYou",
    description: "The card heading after both sends are used.",
  },
  resendUsedBody: {
    title: "Sent twice text",
    group: "thankYou",
    description: "The card text after both sends are used.",
  },
  sendPageHeadingTemplate: {
    title: "Send page heading",
    group: "thankYou",
    description:
      "The send page heading when a recipient name is saved from an earlier try. {recipientName} becomes that name.",
  },
  alreadySentHeading: {
    title: "Already sent heading",
    group: "thankYou",
    description: "The card heading when the gift was sent earlier.",
  },
  alreadySentBodyTemplate: {
    title: "Already sent text",
    group: "thankYou",
    description:
      "The card text when the gift was sent earlier. {recipientName} becomes the recipient's name, {date} the send date.",
  },
  sendPageOpenedHeadingTemplate: {
    title: "Opened heading",
    group: "thankYou",
    description: "The send page heading once the recipient has opened the gift.",
  },
  sendPageOpenedBody: {
    title: "Opened text",
    group: "thankYou",
    description: "The send page text once the recipient has opened the gift.",
  },
  sendLinkInvalidHeading: {
    title: "Link not valid heading",
    group: "thankYou",
    description: "The send page heading when the link is not valid or the gift was cancelled.",
  },
  sendLinkInvalidBody: {
    title: "Link not valid text",
    group: "thankYou",
    description: "The send page text when the link is not valid or the gift was cancelled.",
  },
  sendFailedNotice: {
    title: "Send failed error",
    group: "thankYou",
    description: "The error under the send button when the email did not send.",
  },
};

export const giftSettings = defineType({
  name: "giftSettings",
  title: "Gift Settings",
  type: "document",
  groups: [
    { name: "bookingPage", title: "Booking page", default: true },
    { name: "thankYou", title: "Thank-you page" },
    { name: "recipient", title: "Recipient" },
  ],
  fields: (Object.keys(TEXT_FIELDS) as (keyof GiftContent)[]).map((name) =>
    defineField({
      name,
      title: TEXT_FIELDS[name].title,
      type: "string",
      group: TEXT_FIELDS[name].group,
      description: `${TEXT_FIELDS[name].description} Empty shows "${GIFT_DEFAULTS[name]}".`,
      placeholder: GIFT_DEFAULTS[name],
    }),
  ),
  preview: {
    prepare: () => ({ title: "Gift Settings" }),
  },
});
