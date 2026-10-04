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
