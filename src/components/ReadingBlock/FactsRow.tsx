import type { ReadingFact, ReadingFactsLayout } from "@/data/defaults";
import { mergeClasses } from "@/lib/utils";

import { factRows } from "./factRows";

const LABEL_CLASSES = "font-body uppercase text-[0.68rem] tracking-[0.18em] text-j-text-muted";
const VALUE_CLASSES = "m-0 font-display italic text-[1.15rem] leading-[1.2] text-j-text";
const FRAME_CLASSES = "mt-6 border-y border-j-border-subtle divide-y divide-j-border-subtle";

function splitIntoRows(facts: ReadingFact[], rows: number[]): ReadingFact[][] {
  return rows.map((size, index) => {
    const start = rows.slice(0, index).reduce((sum, previous) => sum + previous, 0);
    return facts.slice(start, start + size);
  });
}

function FactsGrid({ facts, rows, className }: { facts: ReadingFact[]; rows: number[]; className?: string }) {
  const cellWidth = `${100 / rows[0]}%`;
  return (
    <div className={mergeClasses(FRAME_CLASSES, className)}>
      {splitIntoRows(facts, rows).map((rowFacts, rowIndex) => (
        <dl key={rowIndex} className="m-0 flex justify-center divide-x divide-j-border-subtle">
          {rowFacts.map((fact, index) => (
            <div
              key={index}
              style={{ flexBasis: cellWidth }}
              className="flex min-w-0 shrink-0 grow-0 flex-col gap-1 px-1 py-3.5 text-center"
            >
              <dt className={LABEL_CLASSES}>{fact.label}</dt>
              <dd className={VALUE_CLASSES}>{fact.value}</dd>
            </div>
          ))}
        </dl>
      ))}
    </div>
  );
}

function FactsList({ facts, className }: { facts: ReadingFact[]; className?: string }) {
  return (
    <dl className={mergeClasses(FRAME_CLASSES, "mb-0", className)}>
      {facts.map((fact, index) => (
        <div key={index} className="flex items-baseline justify-between gap-4 px-1 py-3">
          <dt className={LABEL_CLASSES}>{fact.label}</dt>
          <dd className={mergeClasses(VALUE_CLASSES, "text-right")}>{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function FactsRow({ facts, layout }: { facts: ReadingFact[]; layout: ReadingFactsLayout }) {
  if (facts.length === 0) return null;
  const desktopRows = factRows(facts.length, layout.factsPerRowDesktop, layout.factsBalanceRows);
  const phoneRows = layout.factsListOnPhones
    ? undefined
    : factRows(facts.length, layout.factsPerRowPhone, layout.factsBalanceRows);
  if (phoneRows?.join() === desktopRows.join()) return <FactsGrid facts={facts} rows={desktopRows} />;
  return (
    <>
      {phoneRows ? (
        <FactsGrid facts={facts} rows={phoneRows} className="md:hidden" />
      ) : (
        <FactsList facts={facts} className="md:hidden" />
      )}
      <FactsGrid facts={facts} rows={desktopRows} className="hidden md:block" />
    </>
  );
}
