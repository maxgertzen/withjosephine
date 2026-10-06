import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { mergeClasses } from "@/lib/utils";

const SIZE_CLASSES = {
  card: { text: "text-sm leading-relaxed", check: "mt-0.5" },
  page: { text: "text-base leading-[1.6]", check: "mt-[0.3rem]" },
};

export type IncludedListProps = {
  items: ReactNode[];
  size: keyof typeof SIZE_CLASSES;
  className?: string;
};

export function IncludedList({ items, size, className }: IncludedListProps) {
  const classes = SIZE_CLASSES[size];
  return (
    <ul className={mergeClasses("m-0 flex list-none flex-col gap-3 p-0", className)}>
      {items.map((item, index) => (
        <li key={index} className={mergeClasses("flex gap-3 font-body text-j-text-muted", classes.text)}>
          <Check
            aria-hidden="true"
            className={mergeClasses("size-4 shrink-0 text-j-ornament", classes.check)}
            strokeWidth={2}
          />
          <div>{item}</div>
        </li>
      ))}
    </ul>
  );
}
