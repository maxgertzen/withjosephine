import { defineField, defineType } from "sanity";

export const emailGiftClaim = defineType({
  name: "emailGiftClaim",
  title: "Email — Gift Claim (to recipient)",
  type: "document",
  groups: [
    { name: "envelope", title: "Inbox preview" },
    { name: "header", title: "Brand header" },
    { name: "firstSend", title: "First-send variant" },
    { name: "reminder", title: "Reminder variant" },
    { name: "shared", title: "Shared copy" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
    defineField({
      name: "subjectFirstSend",
      title: "Subject (first send)",
      type: "string",
      group: "envelope",
      initialValue: "A reading, waiting for you",
    }),
    defineField({
      name: "subjectReminder",
      title: "Subject (reminder)",
      type: "string",
      group: "envelope",
      initialValue: "A reading is still waiting for you",
    }),
    defineField({
      name: "previewFirstSend",
      title: "Inbox preview (first send)",
      type: "string",
      group: "envelope",
      description:
        "The grey snippet shown next to the subject line in most inboxes. Anything in curly braces is auto-filled — {purchaserFirstName} drops in the name of the person who sent the gift. Edit the words around the braces, not the braces themselves.",
      initialValue: "{purchaserFirstName} has sent you a reading.",
    }),
    defineField({
      name: "previewReminder",
      title: "Inbox preview (reminder)",
      type: "string",
      group: "envelope",
      description:
        "Same inbox snippet, used when we follow up on an unclaimed gift seven days later. {purchaserFirstName} is the original sender — kept here on purpose so the recipient remembers whose gift this was.",
      initialValue: "A small reminder about the reading {purchaserFirstName} sent you.",
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
      name: "heroLineFirstSend",
      title: "Hero line — first send",
      type: "string",
      group: "firstSend",
      initialValue: "A reading, for you",
    }),
    defineField({
      name: "heroLineReminder",
      title: "Hero line — reminder",
      type: "string",
      group: "reminder",
      initialValue: "Still here, when you’re ready",
    }),
    defineField({
      name: "greeting",
      title: "Greeting",
      type: "string",
      group: "shared",
      description:
        "First line of the email body. {recipientName} drops in the recipient's first name — falls back to 'there' if the sender didn't include one.",
      initialValue: "Hi {recipientName},",
    }),
    defineField({
      name: "bodyFirstSend",
      title: "Body — first send",
      type: "text",
      rows: 5,
      group: "firstSend",
      description:
        "Main message in the first claim email — sets context for the recipient and tells them what happens after they click the link. {purchaserFirstName} is the sender, {readingName} is the reading they chose. The 'seven days' line aligns with the delivery promise on the website; if you change one, change the other.",
      initialValue:
        "{purchaserFirstName} has given you a {readingName} with me. When you’re ready, the link below opens a short form so I know what to read for you — your birth details, what you’re sitting with, anything you’d like me to keep in mind. After that, the reading lands in your inbox within seven days.",
    }),
    defineField({
      name: "bodyReminder",
      title: "Body — reminder",
      type: "text",
      rows: 5,
      group: "reminder",
      description:
        "Main message in the +7 day reminder — softer tone, asks the recipient to find the original email rather than minting a fresh link. {purchaserFirstName} is the original sender, {readingName} the reading.",
      initialValue:
        "I sent you a note from {purchaserFirstName} a little while ago about a {readingName} they wanted you to have. If you can find that earlier email, the link is inside it. If you can’t, write to hello@withjosephine.com and I’ll send you a fresh one — no rush, the reading is yours whenever you’re ready.",
    }),
    defineField({
      name: "giftMessageLabel",
      title: "Gift-message label",
      type: "string",
      group: "shared",
      description:
        "Header shown above the purchaser's personal note (only renders if they wrote one — otherwise the whole block disappears). {purchaserFirstName} sets the attribution. Keep this short; the note itself sits below it.",
      initialValue: "A note from {purchaserFirstName}",
    }),
    defineField({
      name: "claimButtonLabel",
      title: "Claim button label (first send)",
      type: "string",
      group: "firstSend",
      initialValue: "OPEN YOUR GIFT",
    }),
    defineField({
      name: "claimUrlHelper",
      title: "Claim button helper (first send)",
      type: "text",
      rows: 2,
      group: "firstSend",
      initialValue:
        "This link is for you. Open it from a quiet moment — the form takes about ten minutes.",
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
      initialValue: "Delivered within 7 days of your intake",
    }),
    defineField({
      name: "reminderContactLine",
      title: "Reminder — contact line",
      type: "text",
      rows: 2,
      group: "reminder",
      initialValue:
        "If you can’t find the earlier email, write to hello@withjosephine.com and I’ll send you a fresh link.",
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
    prepare: () => ({ title: "Email — Gift Claim (to recipient)" }),
  },
});
