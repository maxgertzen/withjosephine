import { defineField, defineType } from "sanity";

export const emailSharedShell = defineType({
  name: "emailSharedShell",
  title: "Email — Shared Shell (brand + footer)",
  type: "document",
  description:
    "Shared brand wordmark + signoff + footer disclaimer that every customer-facing email renders. Edit here once to change the whole family.",
  groups: [
    { name: "header", title: "Brand header" },
    { name: "footer", title: "Sign-off & footer" },
  ],
  fields: [
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
    prepare: () => ({ title: "Email — Shared Shell (brand + footer)" }),
  },
});
