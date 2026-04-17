import Image from "next/image";

import { CONTACT_EMAIL } from "@/lib/constants";
import type { SanityUnderConstructionPage } from "@/lib/sanity/types";

const DEFAULTS: SanityUnderConstructionPage = {
  tag: "✦ Something Beautiful is Coming",
  heading: "Josephine",
  description: "Coming soon — a space for soul readings, birth charts, and Akashic records.",
  imageAlt: "Mystical gathering around a pyramid of light",
  contactText: "In the meantime, reach out at",
};

interface UnderConstructionProps {
  content?: SanityUnderConstructionPage | null;
}

export function UnderConstruction({ content }: UnderConstructionProps) {
  const { tag, heading, description, imageUrl, imageAlt, contactText } = content ?? DEFAULTS;

  return (
    <div className="min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 py-16 text-center">
      <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
        {tag}
      </span>

      <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-light italic text-j-text-heading leading-tight">
        {heading}
      </h1>

      <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md">{description}</p>

      <Image
        src={imageUrl ?? "/images/under-construction.webp"}
        alt={imageAlt}
        width={480}
        height={480}
        priority
        className="rounded-2xl shadow-j-soft mt-10 max-w-[min(480px,90vw)] h-auto"
      />

      <p className="font-body text-sm text-j-text-muted mt-8">
        {contactText}{" "}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-j-accent hover:underline transition-colors"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </div>
  );
}
