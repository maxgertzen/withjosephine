import type { ReactNode } from "react";

export const cardSurfaceClasses =
  "bg-j-ivory border border-j-border-subtle rounded-[20px] p-6 shadow-j-soft";

export const cardLabelClasses = "font-body text-xs tracking-[0.18em] uppercase text-j-text-muted";

export function GiftCardSurface({ label, children }: { label: string; children: ReactNode }) {
  return (
    <section className={`w-full ${cardSurfaceClasses} flex flex-col gap-3 text-center`}>
      <h2 className={cardLabelClasses}>{label}</h2>
      {children}
    </section>
  );
}
