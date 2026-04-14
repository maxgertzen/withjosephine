import { cn } from "@/lib/utils";

interface SectionHeadingProps {
  tag?: string;
  heading: string;
  subheading?: string;
  align?: "center" | "left";
  className?: string;
}

export function SectionHeading({
  tag,
  heading,
  subheading,
  align = "center",
  className,
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {tag && (
        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4">
          {tag}
        </span>
      )}
      <h2 className="font-display text-[clamp(2rem,5vw,3.2rem)] font-light italic text-j-text-heading leading-tight">
        {heading}
      </h2>
      {subheading && (
        <p
          className={cn(
            "font-body text-base text-j-text-muted mt-3 max-w-xl",
            align === "center" && "mx-auto",
          )}
        >
          {subheading}
        </p>
      )}
    </div>
  );
}
