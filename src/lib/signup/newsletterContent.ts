import { NEWSLETTER_DEFAULTS, type NewsletterContent } from "@/data/defaults";
import { withNonBlankOverrides } from "@/lib/content/nonBlank";

export function newsletterContent(stored: Partial<NewsletterContent> | null | undefined): NewsletterContent {
  const { show: defaultShow, ...defaultWords } = NEWSLETTER_DEFAULTS;
  const { show, ...storedWords } = stored ?? {};
  return { show: show ?? defaultShow, ...withNonBlankOverrides(defaultWords, storedWords) };
}

export function footerNewsletterWords(content: NewsletterContent) {
  const { title, line, emailLabel, submit, sending, sent, invalidEmail, failed } = content;
  return { title, line, emailLabel, submit, sending, sent, invalidEmail, failed };
}
