"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { IncludedList } from "@/components/IncludedList";
import { ReadingIcon } from "@/components/ReadingIcon";
import type { ReadingCardLabels } from "@/data/defaults";
import { useReducedMotion } from "@/lib/a11y/useReducedMotion";
import { markEntryClickOnPlainLeftClick } from "@/lib/intake/entryMarker";
import { eyebrowClasses } from "@/lib/textStyles";
import { mergeClasses } from "@/lib/utils";

export interface ReadingCardProps {
  slug: string;
  tag: string;
  name: string;
  price: string;
  valueProposition: string;
  briefDescription: string;
  includes: string[];
  labels: ReadingCardLabels;
  href: string;
  className?: string;
}

export function ReadingCard({
  slug,
  tag,
  name,
  price,
  valueProposition,
  briefDescription,
  includes,
  labels,
  href,
  className,
}: ReadingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <div
      className={mergeClasses(
        "bg-j-ivory border border-j-border-subtle rounded-[20px] p-8 relative overflow-hidden shadow-j-soft",
        className,
      )}
    >
      <GoldDivider className="absolute top-0 left-8 right-8" />

      <ReadingIcon slug={slug} className="absolute top-6 right-6 w-20 h-20 md:w-24 md:h-24" />

      <span className={eyebrowClasses}>{tag}</span>

      <h3 className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-light italic text-j-text-heading leading-tight mt-2">
        {name}
      </h3>

      <p className="font-display text-2xl italic text-j-text-gold-lg mt-2">{price}</p>

      <p className="font-display text-lg italic text-j-text-primary leading-relaxed mt-4">
        {valueProposition}
      </p>

      <p className="font-body text-sm text-j-text-muted leading-relaxed mt-3">{briefDescription}</p>

      {includes.length > 0 ? (
        <>
          <AnimatePresence initial={false}>
            {isExpanded && (
              <motion.div
                key="details"
                id={`reading-details-${slug}`}
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduceMotion ? 0 : 0.3, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <IncludedList items={includes} size="card" className="mt-4" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            aria-expanded={isExpanded}
            className="mt-4 font-body text-sm text-j-text-muted hover:text-j-text-gold tracking-wide transition-colors"
          >
            {isExpanded ? labels.showLessLabel : labels.learnMoreLabel}
          </button>
        </>
      ) : null}

      <div className="mt-6">
        <Button href={href} onClick={markEntryClickOnPlainLeftClick(slug, "homepage_card")}>
          {labels.bookButtonText}
        </Button>
      </div>
    </div>
  );
}
