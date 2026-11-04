"use client";

import dynamic from "next/dynamic";

import type { SignupFormWords } from "@/data/defaults";

const EmailSignupForm = dynamic(() => import("@/components/EmailSignupForm").then((module) => module.EmailSignupForm));

export type FooterNewsletterProps = SignupFormWords & { title: string; line: string };

export function FooterNewsletter({ title, line, ...words }: FooterNewsletterProps) {
  return (
    <section aria-labelledby="footer-newsletter-title" className="mx-auto mb-8 max-w-md text-center">
      <h2 id="footer-newsletter-title" className="m-0 font-display text-2xl italic text-j-text-heading">
        {title}
      </h2>
      <p className="mt-2 mb-5 font-body text-sm text-j-text-muted">{line}</p>
      <EmailSignupForm words={words} newsletterBox="required" />
    </section>
  );
}
