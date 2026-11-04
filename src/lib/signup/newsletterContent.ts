import { NEWSLETTER_DEFAULTS, type NewsletterConsentWords, type NewsletterContent } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";
import { pick } from "@/lib/pick";

export function newsletterContent(stored: Partial<NewsletterContent> | null | undefined): NewsletterContent {
  const { show: defaultShow, ...defaultWords } = NEWSLETTER_DEFAULTS;
  const { show, ...storedWords } = stored ?? {};
  return { show: show ?? defaultShow, ...withNonBlankOverrides(defaultWords, storedWords) };
}

export function newsletterConsentWords(content: NewsletterContent): NewsletterConsentWords {
  return pick(content, ["consentText", "privacyLinkText"]);
}

export function footerNewsletterWords(content: NewsletterContent) {
  return {
    title: content.title,
    line: content.line,
    words: pick(content, ["emailLabel", "submit", "sending", "sent", "invalidEmail", "failed"]),
    consent: newsletterConsentWords(content),
  };
}
