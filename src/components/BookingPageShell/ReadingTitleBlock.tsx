import type { ReactNode } from "react";

export type PriceTone = "gift";

const PRICE_SIZE_CLASS: Record<PriceTone | "reading", string> = {
  reading: "text-[1rem] md:text-[1.5rem]",
  gift: "text-[0.95rem] md:text-[1.3rem]",
};

export function ReadingPrice({ label, tone }: { label: string; tone?: PriceTone }) {
  if (!label) return null;
  return (
    <span
      className={`font-display italic text-j-text-gold md:text-j-text-gold-lg ${PRICE_SIZE_CLASS[tone ?? "reading"]} mt-1 md:mt-2`}
    >
      {label}
    </span>
  );
}

type ReadingTitleBlockProps = {
  readingTag: string;
  readingName: string;
  readingPrice: string;
  priceLine?: ReactNode;
  back?: ReactNode;
};

export function ReadingTitleBlock({
  readingTag,
  readingName,
  readingPrice,
  priceLine,
  back,
}: ReadingTitleBlockProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-0 pt-3 md:pt-14 pb-4 border-b border-j-border-subtle grid justify-items-center text-center md:grid-cols-[1fr_minmax(0,48rem)_1fr] md:items-baseline">
      {back ? <div className="justify-self-start mb-1 md:mb-0 md:ml-6 md:row-start-3 md:col-start-2">{back}</div> : null}
      {readingTag ? (
        <span className="font-body uppercase text-j-text-gold text-[0.6rem] tracking-[0.18em] md:text-[0.68rem] md:tracking-[0.22em] md:row-start-1 md:col-start-2">
          {readingTag}
        </span>
      ) : null}
      <h1 className="m-0 font-display font-light italic leading-[1.1] text-j-text-heading text-balance text-[1.75rem] md:text-[2.4rem] mt-1 md:mt-2 md:row-start-2 md:col-start-2">
        {readingName}
      </h1>
      <div className="flex flex-col items-center md:row-start-3 md:col-start-2">
        {priceLine ?? <ReadingPrice label={readingPrice} />}
      </div>
    </div>
  );
}
