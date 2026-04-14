"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { Button } from "@/components/Button";
import { GoldDivider } from "@/components/GoldDivider";
import { mergeClasses } from "@/lib/utils";

export interface ReadingCardProps {
  tag: string;
  name: string;
  price: string;
  valueProposition: string;
  briefDescription: string;
  expandedDetails: string[];
  href: string;
  className?: string;
}

export function ReadingCard({
  tag,
  name,
  price,
  valueProposition,
  briefDescription,
  expandedDetails,
  href,
  className,
}: ReadingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={mergeClasses(
        "bg-j-ivory border border-j-border-subtle rounded-[20px] p-8 relative overflow-hidden shadow-j-soft",
        className
      )}
    >
      <GoldDivider className="absolute top-0 left-8 right-8" />

      <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body">
        {tag}
      </span>

      <h3 className="font-display text-[clamp(1.8rem,4vw,2.4rem)] font-light italic text-j-text-heading leading-tight mt-2">
        {name}
      </h3>

      <p className="font-display text-2xl italic text-j-accent mt-2">
        {price}
      </p>

      <p className="font-display text-lg italic text-j-text-primary leading-relaxed mt-4">
        {valueProposition}
      </p>

      <p className="font-body text-sm text-j-text-muted leading-relaxed mt-3">
        {briefDescription}
      </p>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <ul className="mt-4 space-y-3">
              {expandedDetails.map((detail, index) => (
                <li key={index} className="flex gap-3">
                  <span className="mt-0.5 flex-shrink-0">
                    <Check className="w-4 h-4 text-j-accent" strokeWidth={2} />
                  </span>
                  <span className="font-body text-sm text-j-text-muted leading-relaxed">
                    {detail}
                  </span>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="mt-4 font-body text-sm text-j-text-muted hover:text-j-accent tracking-wide transition-colors cursor-pointer"
      >
        {isExpanded ? "Show Less \u2191" : "Learn More \u2193"}
      </button>

      <div className="mt-6">
        <Button href={href}>Book This Reading</Button>
      </div>
    </div>
  );
}
