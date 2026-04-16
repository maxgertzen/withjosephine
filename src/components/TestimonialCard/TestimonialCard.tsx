import { mergeClasses } from "@/lib/utils";

export interface TestimonialCardProps {
  quote: string;
  name: string;
  detail: string;
  className?: string;
}

export function TestimonialCard({ quote, name, detail, className }: TestimonialCardProps) {
  return (
    <figure
      className={mergeClasses(
        "bg-j-warm border border-j-border-subtle rounded-[20px] p-8 relative shadow-j-soft",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className="block font-display text-[5rem] leading-none text-j-gold/20 select-none -mb-6"
      >
        &ldquo;
      </span>

      <blockquote>
        <p className="font-display text-lg italic text-j-text leading-relaxed">{quote}</p>
      </blockquote>

      <figcaption className="mt-5">
        <span className="block font-body text-sm text-j-text">{name}</span>
        <span className="block font-body text-xs text-j-muted mt-0.5">{detail}</span>
      </figcaption>
    </figure>
  );
}
