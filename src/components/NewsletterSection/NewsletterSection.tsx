"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

import { CelestialOrb } from "@/components/CelestialOrb";
import { NewsletterStarRule } from "@/components/Footer/FooterNewsletter";
import { useNewsletterWords } from "@/components/Footer/NewsletterContext";
import { NEWSLETTER_SECTION_ORB } from "@/lib/celestialPresets";

const EmailSignupForm = dynamic(() => import("@/components/EmailSignupForm").then((module) => module.EmailSignupForm));

export function NewsletterSection({ fallback }: { fallback: ReactNode }) {
  const newsletter = useNewsletterWords();
  if (!newsletter) return fallback;
  const { title, line, words, consent } = newsletter;

  return (
    <section
      aria-labelledby="home-newsletter-title"
      className="relative overflow-hidden bg-j-midnight px-6 py-[88px] text-center"
    >
      <CelestialOrb {...NEWSLETTER_SECTION_ORB} />
      <div className="relative mx-auto max-w-[520px]">
        <NewsletterStarRule className="mb-6" />
        <h2
          id="home-newsletter-title"
          className="m-0 font-display text-[clamp(2rem,5vw,3.2rem)] font-light italic leading-tight text-j-text-on-dark"
        >
          {title}
        </h2>
        <p className="mx-auto mt-3 mb-10 max-w-[460px] font-body text-base text-j-text-on-dark/70">{line}</p>
        <EmailSignupForm words={words} newsletter={{ box: "required", consent }} look="underline-on-dark" />
      </div>
    </section>
  );
}
