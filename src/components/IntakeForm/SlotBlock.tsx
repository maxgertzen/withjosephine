import type { SanityFormFieldOption } from "@/lib/sanity/types";

type SlotBlockProps = {
  count: number;
  selected: SanityFormFieldOption[];
  status: string;
  limitMessage?: string;
};

export function SlotBlock({ count, selected, status, limitMessage }: SlotBlockProps) {
  const slots = Array.from({ length: count }, (_, index) => selected[index] ?? null);

  return (
    <div className="md:static sticky top-0 z-10 bg-j-cream/90 backdrop-blur-sm py-4 mb-4">
      <ul
        aria-label="Selected questions"
        className="grid grid-cols-1 gap-3 list-none p-0 m-0"
      >
        {slots.map((option, index) => {
          const filled = option !== null;
          return (
            <li
              key={index}
              className={[
                "flex flex-col gap-1 rounded-md border p-4 min-h-[68px]",
                filled
                  ? "border-j-border-gold border-solid bg-j-ivory"
                  : "border-j-border-subtle border-dashed bg-transparent",
              ].join(" ")}
              data-slot={index + 1}
              data-filled={filled || undefined}
            >
              <div className="flex items-baseline gap-2">
                <span className="font-display italic font-medium text-lg text-j-deep tracking-wider">
                  {index + 1}.
                </span>
                <span
                  className={
                    filled
                      ? "font-display italic text-base leading-snug text-j-text-heading"
                      : "font-display italic text-2xl text-j-text-muted tracking-widest"
                  }
                >
                  {filled ? option.label : "—"}
                </span>
              </div>
              {filled && option.category ? (
                <span className="font-body text-xs text-j-text-muted tracking-widest mt-auto">
                  {option.category}
                </span>
              ) : (
                <span className="font-body text-xs text-j-text-muted tracking-widest mt-auto">
                  {filled ? null : "Choose one more"}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      <p
        role="status"
        aria-live="polite"
        className={[
          "font-display italic text-base mt-3",
          selected.length === 0 ? "text-j-text-muted" : "text-j-deep font-medium",
        ].join(" ")}
      >
        {status}
      </p>

      {limitMessage ? (
        <p
          role="alert"
          className="font-display italic text-sm text-j-text-heading bg-j-blush/40 border-l-2 border-j-accent rounded-r-md px-4 py-3 mt-2"
        >
          {limitMessage}
        </p>
      ) : null}
    </div>
  );
}
