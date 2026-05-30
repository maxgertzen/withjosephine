import { format } from "date-fns";

export const DAY_PICKER_LABELS = {
  labelPrevious: () => "Previous month",
  labelNext: () => "Next month",
  labelMonthDropdown: () => "Month",
  labelYearDropdown: () => "Year",
  labelGrid: (date: Date) => format(date, "MMMM yyyy"),
};

export const DAY_PICKER_BASE_CLASSES = {
  root: "font-body text-sm text-j-text [--rdp-accent-color:var(--j-accent)] [--rdp-accent-background-color:var(--j-blush)]",
  months: "flex flex-col gap-3",
  month: "flex flex-col gap-3",
  month_caption:
    "flex items-center justify-center gap-2 font-display italic text-base text-j-text-heading",
  caption_label: "sr-only",
  dropdowns: "flex gap-2 items-center",
  dropdown:
    "font-body text-sm bg-j-cream border border-j-border-subtle rounded-sm px-2 py-1 text-j-text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
  nav: "flex items-center justify-between absolute inset-x-0 top-0 px-1 pointer-events-none",
  button_previous:
    "pointer-events-auto inline-flex items-center justify-center w-8 h-8 rounded-sm text-j-text-heading hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
  button_next:
    "pointer-events-auto inline-flex items-center justify-center w-8 h-8 rounded-sm text-j-text-heading hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
  month_grid: "w-full border-collapse",
  weekdays: "flex",
  weekday:
    "flex-1 font-body text-[0.7rem] tracking-wider uppercase text-j-text-muted py-2 text-center",
  week: "flex w-full",
  day: "flex-1 text-center p-0",
  day_button:
    "w-10 h-10 inline-flex items-center justify-center font-body text-sm rounded-sm transition-colors hover:bg-j-blush/40 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep",
  outside: "[&>button]:text-j-text-muted",
  selected:
    "[&>button]:bg-j-deep [&>button]:text-j-cream [&>button]:hover:bg-j-deep [&>button]:focus-visible:outline-j-accent",
  today:
    "[&>button]:font-semibold [&>button]:text-j-text-heading [&>button]:ring-2 [&>button]:ring-inset [&>button]:ring-j-accent",
  disabled: "[&>button]:opacity-40 [&>button]:cursor-not-allowed",
  chevron: "fill-j-text-heading w-4 h-4",
};
