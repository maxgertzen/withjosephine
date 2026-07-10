"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { JsonLd } from "@/components/JsonLd/JsonLd";
import { SectionHeading } from "@/components/SectionHeading";
import { useReducedMotion } from "@/lib/a11y/useReducedMotion";
import type { MappedFaqItem } from "@/lib/sanity/mappers";

interface FaqSectionProps {
  items: MappedFaqItem[];
  sectionTag?: string;
  heading?: string;
  nonce?: string;
}

export function FaqSection({
  items,
  sectionTag = "\u2726 FAQ",
  heading = "frequently asked questions",
  nonce,
}: FaqSectionProps) {
  const [openId, setOpenId] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  if (items.length === 0) return null;

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <section id="faq" className="py-24 px-6">
      <SectionHeading tag={sectionTag} heading={heading} />

      <JsonLd data={jsonLd} nonce={nonce} />

      <div className="mt-14 max-w-[700px] mx-auto flex flex-col gap-4">
        {items.map((item) => {
          const isOpen = openId === item.id;

          return (
            <div
              key={item.id}
              className="bg-j-ivory border border-j-border-subtle rounded-[16px] overflow-hidden shadow-j-soft"
            >
              <button
                type="button"
                onClick={() => toggle(item.id)}
                aria-expanded={isOpen}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
              >
                <span
                  id={`faq-question-${item.id}`}
                  className="font-display text-lg italic text-j-text-heading leading-snug"
                >
                  {item.question}
                </span>
                <span
                  className="text-j-accent text-xl transition-transform duration-200"
                  style={{ transform: isOpen ? "rotate(45deg)" : "rotate(0deg)" }}
                  aria-hidden="true"
                >
                  +
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="content"
                    id={`faq-answer-${item.id}`}
                    role="region"
                    aria-labelledby={`faq-question-${item.id}`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: reduceMotion ? 0 : 0.25, ease: "easeInOut" }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-5 font-body text-sm text-j-text-muted leading-relaxed">
                      {item.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
