import type { NewsletterContent } from "@/data/defaults";
import { footerNewsletterWords, newsletterContent } from "@/lib/signup/newsletterContent";

import { FooterNewsletter } from "./FooterNewsletter";

export function footerNewsletterSlot(stored: Partial<NewsletterContent> | null | undefined) {
  const content = newsletterContent(stored);
  return content.show ? <FooterNewsletter {...footerNewsletterWords(content)} /> : null;
}
