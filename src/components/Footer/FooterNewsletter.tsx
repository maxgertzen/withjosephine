"use client";

import dynamic from "next/dynamic";

import type { NewsletterBlockWords } from "@/lib/signup/newsletterContent";

const EmailSignupForm = dynamic(() => import("@/components/EmailSignupForm").then((module) => module.EmailSignupForm));

const STAR_RULE = "h-px w-20 from-transparent to-j-accent/60";

export function NewsletterStarRule({ className }: { className: string }) {
  return (
    <div aria-hidden="true" className={`flex items-center justify-center gap-3.5 text-xs text-j-ornament ${className}`}>
      <span className={`${STAR_RULE} bg-gradient-to-r`} />✦<span className={`${STAR_RULE} bg-gradient-to-l`} />
    </div>
  );
}

export function FooterNewsletter({ title, line, words, consent }: NewsletterBlockWords) {
  return (
    <section aria-labelledby="footer-newsletter-title" className="mx-auto mb-10 max-w-md text-center">
      <NewsletterStarRule className="mb-5" />
      <h2 id="footer-newsletter-title" className="m-0 font-display text-[1.75rem] italic text-j-text-heading">
        {title}
      </h2>
      <p className="mt-1.5 mb-6 font-body text-sm text-j-text-muted">{line}</p>
      <EmailSignupForm words={words} newsletter={{ box: "required", consent }} look="underline" />
    </section>
  );
}
