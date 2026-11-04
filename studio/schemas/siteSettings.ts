import { defineField, defineType } from "sanity";

import { NEWSLETTER_DEFAULTS, type NewsletterContent, type SignupFormWords } from "../../src/data/defaults";
import { SIGNUP_FORM_WORD_TITLES } from "./_shared/signupFormWords";

type NewsletterWordField = {
  name: Exclude<keyof NewsletterContent, "show">;
  title: string;
  description?: string;
  long?: true;
};

const NEWSLETTER_WORD_FIELDS: NewsletterWordField[] = [
  { name: "title", title: "Title above the box" },
  { name: "line", title: "Short line under the title", long: true },
  {
    name: "consentText",
    title: "Words next to the tick box",
    description:
      "Visitors tick this box to say yes to your newsletter. Each sign-up saves the exact words shown at that moment, so change them only when you mean it. The box always shows.",
    long: true,
  },
  { name: "privacyLinkText", title: "Link to the privacy page, after those words" },
  ...(Object.keys(SIGNUP_FORM_WORD_TITLES) as (keyof SignupFormWords)[]).map((name) => ({
    name,
    title: SIGNUP_FORM_WORD_TITLES[name],
    description:
      name === "sent"
        ? "Shown after they press the button. They still need to tap the link in the email we send them."
        : undefined,
  })),
  { name: "confirmPromptTitle", title: "Title on the page the email link opens" },
  { name: "confirmButton", title: "Button on the page the email link opens", description: "They join the newsletter when they press this button." },
  { name: "confirmedTitle", title: "Title after they press that button" },
  { name: "confirmedBody", title: "Words after they press that button", long: true },
  { name: "confirmFailedTitle", title: "Title when the link in the email does not work" },
  { name: "confirmFailedBody", title: "Words when the link in the email does not work", long: true },
];

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({
      name: "brandName",
      title: "Brand Name",
      type: "string",
      initialValue: "Josephine",
    }),
    defineField({
      name: "logo",
      title: "Logo",
      type: "image",
    }),
    defineField({
      name: "favicon",
      title: "Favicon",
      type: "image",
    }),
    defineField({
      name: "navLinks",
      title: "Navigation Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "sectionId", title: "Section ID", type: "string" }),
          ],
          preview: { select: { title: "label", subtitle: "sectionId" } },
        },
      ],
    }),
    defineField({
      name: "navCtaText",
      title: "Nav CTA Text",
      type: "string",
      initialValue: "Book a Reading",
    }),
    defineField({
      name: "socialLinks",
      title: "Social Links",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({
              name: "platform",
              title: "Platform",
              type: "string",
              options: {
                list: [
                  { title: "TikTok", value: "tiktok" },
                  { title: "Instagram", value: "instagram" },
                  { title: "YouTube", value: "youtube" },
                  { title: "Facebook", value: "facebook" },
                  { title: "Twitter / X", value: "twitter" },
                ],
              },
            }),
            defineField({ name: "url", title: "URL", type: "url" }),
            defineField({ name: "label", title: "Accessible Label", type: "string" }),
          ],
          preview: { select: { title: "platform", subtitle: "url" } },
        },
      ],
    }),
    defineField({
      name: "copyrightText",
      title: "Copyright Text",
      type: "string",
      initialValue: "Josephine. All rights reserved.",
    }),
    defineField({
      name: "contactEmail",
      title: "Contact Email",
      type: "string",
    }),
    defineField({
      name: "newsletter",
      title: "Newsletter sign-up at the bottom of every page",
      type: "object",
      description:
        "A small box at the bottom of every page where visitors can type their email to get your newsletter. The words next to the tick box also show on the links page form.",
      fields: [
        defineField({
          name: "show",
          title: "Show the newsletter box",
          type: "boolean",
          description: "Turn on to show the box at the bottom of every page.",
          initialValue: NEWSLETTER_DEFAULTS.show,
        }),
        ...NEWSLETTER_WORD_FIELDS.map(({ name, title, description, long }) => {
          const common = {
            name,
            title,
            description: description ?? "Leave blank to use the words shown in grey.",
            placeholder: NEWSLETTER_DEFAULTS[name],
          };
          return long ? defineField({ ...common, type: "text", rows: 2 }) : defineField({ ...common, type: "string" });
        }),
      ],
    }),
    defineField({
      name: "consentBanner",
      title: "Analytics Consent Banner",
      description:
        "Shown only to visitors in the EU/EEA, UK, Switzerland, and California (CCPA). To preview your edits, open the Presentation tab in the Studio toolbar — the banner force-renders on any page while you're editing. Layout is fixed; edit copy only.",
      type: "object",
      fields: [
        defineField({
          name: "hideInPreview",
          title: "Hide banner in Studio preview",
          type: "boolean",
          description:
            "Tick this to hide the banner inside the Studio Presentation iframe so you can edit pages underneath. Real visitors are unaffected — the banner still shows for GDPR/CCPA regions in production.",
          initialValue: false,
        }),
        defineField({
          name: "title",
          title: "Title",
          type: "string",
          description: 'Heading at the top of the banner (e.g. "A note on analytics")',
        }),
        defineField({
          name: "body",
          title: "Body Text",
          type: "text",
          rows: 3,
          description:
            'Plain text. Will be followed by the privacy-policy link automatically.',
        }),
        defineField({
          name: "privacyLinkText",
          title: "Privacy-Policy Link Text",
          type: "string",
          description: 'Link text that points to /privacy (e.g. "Read the privacy policy")',
        }),
        defineField({
          name: "acceptLabel",
          title: "Accept Button Label",
          type: "string",
        }),
        defineField({
          name: "declineLabel",
          title: "Decline Button Label",
          type: "string",
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: "Site Settings" }),
  },
});
