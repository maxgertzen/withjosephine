import type { MappedTestimonial } from "@/lib/sanity/mappers";
import { smallCapsClasses } from "@/lib/textStyles";

export type FormTestimonial = Pick<MappedTestimonial, "quote" | "name"> &
  Partial<Pick<MappedTestimonial, "detail">> & { label: string };

export function TestimonialLine({ label, quote, name, detail }: FormTestimonial) {
  return (
    <figure className="m-0 border-y border-j-border-subtle py-4">
      <p className={`${smallCapsClasses} m-0 text-j-text-muted`}>
        {label}
      </p>
      <blockquote className="m-0 mt-1.5">
        <p className="m-0 font-display text-[1.1rem] italic leading-[1.55] text-j-text">
          &ldquo;{quote}&rdquo;
        </p>
      </blockquote>
      <figcaption className="mt-2 font-body text-[0.8rem] text-j-text-muted">
        {detail ? `${name} · ${detail}` : name}
      </figcaption>
    </figure>
  );
}
