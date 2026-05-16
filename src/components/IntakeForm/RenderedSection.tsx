import { memo } from "react";

import type { SanityFormSection } from "@/lib/sanity/types";

import { type RenderContext,renderField } from "./renderField";

export type RenderedSectionProps = {
  section: SanityFormSection;
  pairedUnknownKeys: Set<string>;
  context: RenderContext;
};

function RenderedSectionImpl({
  section,
  pairedUnknownKeys,
  context,
}: RenderedSectionProps) {
  return (
    <section className="grid grid-cols-1 md:grid-cols-[140px_1fr] md:gap-5 gap-2 py-6 border-t border-j-border-subtle first:border-t-0 first:pt-2">
      {section.marginaliaLabel ? (
        <aside className="font-display italic text-sm text-j-text-muted md:text-right md:pr-4 md:border-r md:border-j-border-subtle md:relative">
          {section.marginaliaLabel}
          <span
            aria-hidden="true"
            className="hidden md:block absolute right-[-3px] top-2 h-1.5 w-1.5 rounded-full bg-j-accent"
          />
        </aside>
      ) : (
        <span aria-hidden="true" className="hidden md:block" />
      )}

      <div>
        {section.transitionLine ? (
          <p className="font-display italic text-base text-j-text-muted mb-2">
            {section.transitionLine}
          </p>
        ) : null}
        <h2 className="font-display italic text-xl text-j-text-heading mb-3">
          {section.sectionTitle}
        </h2>
        {section.clarificationNote ? (
          <p className="font-display italic text-sm text-j-text-muted mb-4">
            {section.clarificationNote}
          </p>
        ) : null}
        {section.sectionDescription ? (
          <p className="font-body text-sm text-j-text-muted leading-relaxed mb-4">
            {section.sectionDescription}
          </p>
        ) : null}

        <div className="flex flex-col gap-6">
          {section.fields
            .filter((field) => {
              if (field.type === "consent") return false;
              if (pairedUnknownKeys.has(field.key)) return false;
              return true;
            })
            .map((field) => renderField(field, context))}
        </div>
      </div>
    </section>
  );
}

export const RenderedSection = memo(RenderedSectionImpl);
