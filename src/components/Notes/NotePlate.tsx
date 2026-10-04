import { nonBlank } from "@/lib/content/nonBlank";
import type { NotePlateValue } from "@/lib/notes/types";

import { StarMark } from "./StarMark";

type PlateColumn = { heading?: string; lines: string[] };
type PlateLayout = NonNullable<NotePlateValue["layout"]>;

const HEADING =
  "m-0 mb-2.5 font-display italic font-semibold text-2xl leading-[1.2] text-j-text-heading";

const WIDE_ROW = "min-[480px]:flex-row min-[480px]:gap-5";
const WIDE_FIRST = "min-[480px]:flex-1 min-[480px]:py-1";
const WIDE_SECOND = `${WIDE_FIRST} min-[480px]:border-t-0 min-[480px]:border-l min-[480px]:pl-5`;

const LAYOUT_CLASSES: Record<PlateLayout, { row: string; columns: [string, string] }> = {
  stacked: {
    row: `flex flex-col ${WIDE_ROW}`,
    columns: [`pt-1 pb-3.5 ${WIDE_FIRST}`, `pt-3.5 border-t border-j-border-subtle ${WIDE_SECOND}`],
  },
  sideBySide: {
    row: `flex flex-row gap-3.5 ${WIDE_ROW}`,
    columns: ["flex-1 py-1", "flex-1 py-1 border-l border-j-border-subtle pl-3.5 min-[480px]:pl-5"],
  },
};

function column(heading: string | undefined, lines: string[] | undefined): PlateColumn {
  return { heading: nonBlank(heading), lines: (lines ?? []).filter((line) => nonBlank(line)) };
}

function TwoColumns({ columns, layout }: { columns: PlateColumn[]; layout: PlateLayout }) {
  const classes = LAYOUT_CLASSES[layout];
  return (
    <div className={classes.row}>
      {columns.map((plateColumn, index) => (
        <div key={index} className={classes.columns[index]}>
          {plateColumn.heading ? <p className={HEADING}>{plateColumn.heading}</p> : null}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {plateColumn.lines.map((line, lineIndex) => (
              <li
                key={lineIndex}
                className="flex items-baseline gap-2.5 font-body text-base font-medium leading-[1.45] text-j-text"
              >
                <StarMark size={10} className="shrink-0 translate-y-px text-j-ornament" />
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function OneColumn({ plateColumn }: { plateColumn: PlateColumn }) {
  return (
    <>
      {plateColumn.heading ? <p className={HEADING}>{plateColumn.heading}</p> : null}
      {plateColumn.lines.map((line, index) => (
        <p
          key={index}
          className="m-0 font-display italic text-[1.375rem] leading-[1.4] text-j-text"
        >
          {line}
        </p>
      ))}
    </>
  );
}

export function NotePlate({ plate }: { plate: NotePlateValue }) {
  const filled = [
    column(plate.leftHeading, plate.leftLines),
    column(plate.rightHeading, plate.rightLines),
  ].filter((plateColumn) => plateColumn.heading || plateColumn.lines.length > 0);

  return (
    <aside className="my-8 rounded-[16px] border border-j-border-subtle bg-j-ivory px-5 py-6 shadow-j-soft">
      <p className="m-0 mb-3 font-body text-xs font-semibold uppercase leading-[1.4] tracking-[0.18em] text-j-text-gold">
        {plate.label}
      </p>
      {filled.length === 2 ? (
        <TwoColumns columns={filled} layout={plate.layout ?? "stacked"} />
      ) : filled[0] ? (
        <OneColumn plateColumn={filled[0]} />
      ) : null}
    </aside>
  );
}
