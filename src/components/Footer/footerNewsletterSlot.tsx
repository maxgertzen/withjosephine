import type { NewsletterContent } from "@/data/defaults";
import { shownNewsletterWords } from "@/lib/signup/newsletterContent";

import { FooterNewsletter } from "./FooterNewsletter";
import type { NewsletterSlotValue } from "./NewsletterContext";

export function footerNewsletterSlot(stored: Partial<NewsletterContent> | null | undefined): NewsletterSlotValue {
  const words = shownNewsletterWords(stored);
  return words && { words, footerBox: <FooterNewsletter {...words} /> };
}
