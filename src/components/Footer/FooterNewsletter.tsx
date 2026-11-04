"use client";

import dynamic from "next/dynamic";

import type { NewsletterConsentWords, SignupFormWords } from "@/data/defaults";

const EmailSignupForm = dynamic(() => import("@/components/EmailSignupForm").then((module) => module.EmailSignupForm));

export type FooterNewsletterProps = {
  title: string;
  line: string;
  words: SignupFormWords;
  consent: NewsletterConsentWords;
};

const STAR_RULE = "h-px w-20 from-transparent to-j-accent/60";

export function FooterNewsletter({ title, line, words, consent }: FooterNewsletterProps) {
  return (
    <section aria-labelledby="footer-newsletter-title" className="mx-auto mb-10 max-w-md text-center">
      <div aria-hidden="true" className="mb-5 flex items-center justify-center gap-3.5 text-xs text-j-ornament">
        <span className={`${STAR_RULE} bg-gradient-to-r`} />✦<span className={`${STAR_RULE} bg-gradient-to-l`} />
      </div>
      <h2 id="footer-newsletter-title" className="m-0 font-display text-[1.75rem] italic text-j-text-heading">
        {title}
      </h2>
      <p className="mt-1.5 mb-6 font-body text-sm text-j-text-muted">{line}</p>
      <EmailSignupForm words={words} consent={consent} newsletterBox="required" look="underline" />
    </section>
  );
}
