import { nonBlank } from "@/lib/content/nonBlank";
import type { NotePlateValue } from "@/lib/notes/types";

import { StarMark } from "./StarMark";

type PlateColumn = { heading?: string; lines: string[] };
type PlateLayout = NonNullable<NotePlateValue["layout"]>;

const HEADING_BASE =
  "m-0 font-display italic font-semibold text-2xl leading-[1.2] text-j-text-heading";

const WIDE_GRID =
  "min-[480px]:grid min-[480px]:grid-cols-2 min-[480px]:gap-x-5 min-[480px]:gap-y-2";
const WIDE_SUBGRID = "min-[480px]:grid min-[480px]:grid-rows-subgrid";
const WIDE_FIRST = `${WIDE_SUBGRID} min-[480px]:py-1`;
const WIDE_SECOND = `${WIDE_FIRST} min-[480px]:border-t-0 min-[480px]:border-l min-[480px]:pl-5`;

const LAYOUT_CLASSES: Record<
  PlateLayout,
  { grid: string; columns: [string, string]; lines: string; heading: string }
> = {
  stacked: {
    grid: `flex flex-col ${WIDE_GRID}`,
    columns: [`pt-1 pb-3.5 ${WIDE_FIRST}`, `pt-3.5 border-t border-j-border-subtle ${WIDE_SECOND}`],
    lines: `flex flex-col gap-2 ${WIDE_SUBGRID}`,
    heading: "mb-2.5 min-[480px]:mb-0.5",
  },
  sideBySide: {
    grid: `grid grid-cols-2 gap-x-3.5 gap-y-2 min-[480px]:gap-x-5`,
    columns: [
      "grid grid-rows-subgrid py-1",
      "grid grid-rows-subgrid py-1 border-l border-j-border-subtle pl-3.5 min-[480px]:pl-5",
    ],
    lines: "grid grid-rows-subgrid",
    heading: "mb-0.5",
  },
};

function column(heading: string | undefined, lines: string[] | undefined): PlateColumn {
  return { heading: nonBlank(heading), lines: (lines ?? []).filter((line) => nonBlank(line)) };
}

function TwoColumns({ columns, layout }: { columns: PlateColumn[]; layout: PlateLayout }) {
  const classes = LAYOUT_CLASSES[layout];
  const headingRows = columns.some((plateColumn) => plateColumn.heading) ? 1 : 0;
  const totalRows =
    headingRows + Math.max(...columns.map((plateColumn) => plateColumn.lines.length));
  return (
    <div className={classes.grid} style={{ gridTemplateRows: `repeat(${totalRows}, auto)` }}>
      {columns.map((plateColumn, index) => (
        <div key={index} className={`row-span-full ${classes.columns[index]}`}>
          {plateColumn.heading ? (
            <p className={`${HEADING_BASE} ${classes.heading}`}>{plateColumn.heading}</p>
          ) : null}
          <ul
            className={`m-0 list-none p-0 ${headingRows ? "row-[2/-1]" : "row-span-full"} ${classes.lines}`}
          >
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
      {plateColumn.heading ? (
        <p className={`${HEADING_BASE} mb-2.5`}>{plateColumn.heading}</p>
      ) : null}
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
