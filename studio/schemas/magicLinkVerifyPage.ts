import { defineField, defineType } from "sanity";

export const magicLinkVerifyPage = defineType({
  name: "magicLinkVerifyPage",
  title: "Magic Link — Confirm Email Page",
  type: "document",
  fields: [
    defineField({
      name: "confirmHeading",
      title: "Confirm form — heading",
      type: "string",
      description: "Shown on the page the customer lands on after clicking the magic-link email.",
      initialValue: "Confirm your email",
    }),
    defineField({
      name: "confirmBody",
      title: "Confirm form — body",
      type: "text",
      rows: 2,
      initialValue: "Type the email you used to book — we'll open your reading from there.",
    }),
    defineField({
      name: "confirmEmailLabel",
      title: "Confirm form — email label",
      type: "string",
      initialValue: "Email",
    }),
    defineField({
      name: "confirmButtonLabel",
      title: "Confirm form — button label",
      type: "string",
      initialValue: "Continue",
    }),
    defineField({
      name: "confirmFootnote",
      title: "Confirm form — italic footnote",
      type: "string",
      initialValue: "Your reading is still here, exactly as it was.",
    }),
    defineField({
      name: "restedHeading",
      title: "Rested-link state — heading",
      type: "string",
      description:
        "Shown when the link is expired, already used, or input was missing/invalid. Same copy for all failure modes by design (no information leak).",
      initialValue: "This link has rested",
    }),
    defineField({
      name: "restedBody",
      title: "Rested-link state — body",
      type: "text",
      rows: 2,
      initialValue:
        "Magic links are good for one open and twenty-four hours. Head to your reading and ask for a fresh one — it'll arrive in a moment.",
    }),
    defineField({
      name: "restedCtaLabel",
      title: "Rested-link state — CTA label",
      type: "string",
      initialValue: "Send me a fresh link",
    }),
  ],
  preview: {
    prepare: () => ({ title: "Magic Link — Confirm Email Page" }),
  },
});
