import type { ReactNode } from "react";

export type BookingPageStackItem = { key: string; node: ReactNode; accordion?: boolean; form?: boolean };

function gapClass(previous: BookingPageStackItem | undefined, current: BookingPageStackItem) {
  if (!previous) return undefined;
  if (current.form) return "mt-10";
  if (previous.accordion && current.accordion) return "mt-4";
  return "mt-8";
}

export function shownStackItems(items: readonly BookingPageStackItem[]) {
  return items.filter(({ node }) => node !== null && node !== undefined);
}

export function BookingPageStack({ items }: { items: readonly BookingPageStackItem[] }) {
  const shown = shownStackItems(items);
  return (
    <div>
      {shown.map((item, index) => (
        <div key={item.key} className={gapClass(shown[index - 1], item)}>
          {item.node}
        </div>
      ))}
    </div>
  );
}
