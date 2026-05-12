import { defineField, defineType } from "sanity";

export const giftClaimPage = defineType({
  name: "giftClaimPage",
  title: "Gift Claim Page",
  type: "document",
  description:
    "Copy for /gift/claim — the page a recipient lands on when they click the link from their gift email. Two states: token missing, and token invalid/already-claimed.",
  fields: [
    defineField({
      name: "seoTitle",
      title: "SEO — Page title",
      type: "string",
      description: "Appears in the browser tab. Recipients only see this in inbox previews and tabs.",
      initialValue: "Claim your gift — Josephine",
    }),
    defineField({
      name: "seoDescription",
      title: "SEO — Meta description",
      type: "text",
      rows: 2,
      description: "One-sentence preview shown to search engines / link previews.",
      initialValue: "Open the reading someone sent you.",
    }),
    defineField({
      name: "noTokenHeading",
      title: "No-token state — heading",
      type: "string",
      description:
        "Shown when someone lands on /gift/claim without a token in the URL — usually because they typed the address from memory instead of opening their email.",
      initialValue: "Open from your email",
    }),
    defineField({
      name: "noTokenBody",
      title: "No-token state — body",
      type: "text",
      rows: 3,
      description: "Tell the recipient where to find their actual gift link.",
      initialValue:
        "Your gift link came in an email — open it from there to claim your reading.",
    }),
    defineField({
      name: "alreadyClaimedHeading",
      title: "Already-claimed state — heading",
      type: "string",
      description:
        "Shown when the token in the URL has been used (the recipient already filled the intake) or expired.",
      initialValue: "This gift has already been opened",
    }),
    defineField({
      name: "alreadyClaimedBody",
      title: "Already-claimed state — body",
      type: "text",
      rows: 3,
      description: "Reassure the recipient + give a recovery path back to the purchaser.",
      initialValue:
        "If you think this is a mistake, reply to the email your gift came in and we’ll help.",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Gift Claim Page" }),
  },
});
