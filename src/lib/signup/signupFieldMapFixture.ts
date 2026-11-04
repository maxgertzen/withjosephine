import { deriveLinksPageViewProps } from "@/app/tt/deriveLinksPageViewProps";
import type { LinksPageButton } from "@/app/tt/LinksPageView";
import type { EmailOneButtonContent, LinksPageEmailFormWords, NewsletterContent } from "@/data/defaults";
import { stringToPortableTextBlocks } from "@/lib/emails/portableTextBuild";
import type { SanityLinksPageState } from "@/lib/sanity/types";

import { newsletterContent } from "./newsletterContent";

const fieldLabel = (place: string, studioTitle: string, field: string) => `[${place} › ${studioTitle} · ${field}]`;

const NEWSLETTER_PLACE = "Site Settings › Newsletter sign-up at the bottom of every page";
const EMAIL_FORM_PLACE = "Josephine's Link Tree › Words when a button asks for an email";

const NEWSLETTER_TITLES: Record<Exclude<keyof NewsletterContent, "show">, string> = {
  title: "Title above the box",
  line: "Short line under the title",
  emailLabel: "Words inside the email box",
  submit: "Button words",
  sending: "Button words while it sends",
  sent: "Words after sending",
  invalidEmail: "Words when the email is not complete",
  failed: "Words when something goes wrong",
  confirmPromptTitle: "Title on the page the email link opens",
  confirmButton: "Button on the page the email link opens",
  confirmedTitle: "Title after they press that button",
  confirmedBody: "Words after they press that button",
  confirmFailedTitle: "Title when the link in the email does not work",
  confirmFailedBody: "Words when the link in the email does not work",
};

const EMAIL_FORM_TITLES: Record<keyof LinksPageEmailFormWords, string> = {
  prompt: "Line above the email box",
  emailLabel: "Words inside the email box",
  submit: "Button words",
  sending: "Button words while it sends",
  sent: "Words after sending",
  invalidEmail: "Words when the email is not complete",
  failed: "Words when something goes wrong",
};

function labelled<T extends string>(place: string, field: string, titles: Record<T, string>): Record<T, string> {
  return Object.fromEntries(
    (Object.keys(titles) as T[]).map((key) => [key, fieldLabel(place, titles[key], `${field}.${key}`)]),
  ) as Record<T, string>;
}

export const FIELD_MAP_STORED_NEWSLETTER: Partial<NewsletterContent> = {
  show: true,
  ...labelled(NEWSLETTER_PLACE, "newsletter", NEWSLETTER_TITLES),
};

export function fieldMapNewsletterContent(): NewsletterContent {
  return newsletterContent(FIELD_MAP_STORED_NEWSLETTER);
}

const FIELD_MAP_LINKS_PAGE_STATE: SanityLinksPageState = {
  page: {
    showPage: true,
    emailForm: labelled(EMAIL_FORM_PLACE, "emailForm", EMAIL_FORM_TITLES),
    buttons: [
      {
        _key: "guide",
        label: fieldLabel("Josephine's Link Tree › Buttons", "Button words", "buttons[].label"),
        subtitle: fieldLabel("Josephine's Link Tree › Buttons", "Small line under the button words", "buttons[].subtitle"),
        destination: "file",
        askForEmail: true,
        file: { _id: "file-guide", url: "https://cdn.sanity.io/files/p/d/guide.pdf" },
      },
    ],
  },
  aboutPhotoUrl: null,
  readings: [],
  notesState: null,
  siteSettings: { socialLinks: [], newsletter: { show: true } },
};

export function fieldMapLinksPageEmailForm(): { button: LinksPageButton; words: LinksPageEmailFormWords } {
  const props = deriveLinksPageViewProps(FIELD_MAP_LINKS_PAGE_STATE, "");
  const [button] = props.buttons;
  if (!button) throw new Error("field map fixture did not produce the email-first button");
  return { button, words: props.emailFormWords };
}

function fieldMapEmail(place: string): EmailOneButtonContent {
  return {
    subject: fieldLabel(place, "Subject", "subject"),
    preview: fieldLabel(place, "Preview text", "preview"),
    heroLine: fieldLabel(place, "Big line at the top", "heroLine"),
    buttonLabel: fieldLabel(place, "Button words", "buttonLabel"),
    body: stringToPortableTextBlocks(fieldLabel(place, "Words above the button", "body")),
  };
}

export const FIELD_MAP_DOWNLOAD_EMAIL = fieldMapEmail("Emails › Download Link → Links Page Visitor");
export const FIELD_MAP_NEWSLETTER_CONFIRM_EMAIL = fieldMapEmail("Emails › Newsletter: Confirm Your Email");
