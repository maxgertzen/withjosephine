import type { ReactNode } from "react";

import type { BookingPageElement } from "@/lib/booking/pageLayout";

const ACCORDIONS = new Set<BookingPageElement>(["included", "howItWorks", "questions"]);

export type BookingPageElementNodes = Partial<Record<BookingPageElement, ReactNode>>;

function gapClass(previous: BookingPageElement | undefined, current: BookingPageElement) {
  if (!previous) return undefined;
  if (current === "form") return "mt-10";
  if (ACCORDIONS.has(previous) && ACCORDIONS.has(current)) return "mt-4";
  return "mt-8";
}

export function renderedElements(order: readonly BookingPageElement[], elements: BookingPageElementNodes) {
  return order.filter((element) => elements[element] !== null && elements[element] !== undefined);
}

export function BookingPageStack({
  order,
  elements,
}: {
  order: readonly BookingPageElement[];
  elements: BookingPageElementNodes;
}) {
  const shown = renderedElements(order, elements);
  return (
    <div>
      {shown.map((element, index) => (
        <div key={element} className={gapClass(shown[index - 1], element)}>
          {elements[element]}
        </div>
      ))}
    </div>
  );
}
