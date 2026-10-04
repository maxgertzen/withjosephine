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
