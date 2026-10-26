import { Check } from "lucide-react";
import type { ReactNode } from "react";

import { mergeClasses } from "@/lib/utils";

const SIZE_CLASSES = {
  card: { text: "text-sm leading-relaxed", check: "mt-0.5" },
  page: { text: "text-base leading-[1.6]", check: "mt-[0.3rem]" },
};

type IncludedListSize = keyof typeof SIZE_CLASSES;

export const includedListClasses = "m-0 flex list-none flex-col gap-3 p-0";

export function IncludedListRow({ size, children }: { size: IncludedListSize; children: ReactNode }) {
  const classes = SIZE_CLASSES[size];
  return (
    <li className={mergeClasses("flex gap-3 font-body text-j-text-muted", classes.text)}>
      <Check
        aria-hidden="true"
        className={mergeClasses("size-4 shrink-0 text-j-ornament", classes.check)}
        strokeWidth={2}
      />
      <span>{children}</span>
    </li>
  );
}

export type IncludedListProps = {
  items: string[];
  size: IncludedListSize;
  className?: string;
};

export function IncludedList({ items, size, className }: IncludedListProps) {
  return (
    <ul className={mergeClasses(includedListClasses, className)}>
      {items.map((item, index) => (
        <IncludedListRow key={index} size={size}>
          {item}
        </IncludedListRow>
      ))}
    </ul>
  );
}
