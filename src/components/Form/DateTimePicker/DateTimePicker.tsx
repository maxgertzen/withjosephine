"use client";

import * as Popover from "@radix-ui/react-popover";
import { format, isValid, parse } from "date-fns";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { DayPicker, type DropdownProps } from "react-day-picker";

import {
  DAY_PICKER_BASE_CLASSES,
  DAY_PICKER_LABELS,
} from "@/components/Form/DayPickerShared/dayPickerShared";
import { FieldShell, FloatingLabel } from "@/components/Form/FieldShell";
import { Select, type SelectOption } from "@/components/Form/Select";
import { inputClasses } from "@/lib/formStyles";

const ISO_DATE = "yyyy-MM-dd";
const DISPLAY_FORMAT = "dd/MM/yyyy HH:mm";
const TIME_PARTS = /^(\d{2}):(\d{2})/;

const HOURS = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

const ITEM_HEIGHT_PX = 40;
const COLUMN_VISIBLE_ITEMS = 5;
const COLUMN_HEIGHT_PX = ITEM_HEIGHT_PX * COLUMN_VISIBLE_ITEMS;
const COLUMN_PAD_PX = (COLUMN_HEIGHT_PX - ITEM_HEIGHT_PX) / 2;

const DAY_PICKER_CLASSES = {
  ...DAY_PICKER_BASE_CLASSES,
  month: "flex flex-col gap-3 relative pt-1",
  month_caption: `${DAY_PICKER_BASE_CLASSES.month_caption} min-h-8`,
  nav: "flex items-center justify-between absolute inset-x-0 top-1 pointer-events-none",
};

type DateTimePickerProps = {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: string;
  max?: string;
};

function splitValue(value: string): { date: Date | undefined; hh: string; mm: string } {
  if (!value) return { date: undefined, hh: "", mm: "" };
  const [datePart = "", timePart = ""] = value.split("T");
  const parsed = datePart ? parse(datePart, ISO_DATE, new Date()) : null;
  const tMatch = TIME_PARTS.exec(timePart);
  return {
    date: parsed && isValid(parsed) ? parsed : undefined,
    hh: tMatch?.[1] ?? "",
    mm: tMatch?.[2] ?? "",
  };
}

function combine(date: Date | undefined, hh: string, mm: string): string {
  const hasTime = Boolean(hh || mm);
  const filledHh = hh || (hasTime ? "00" : "");
  const filledMm = mm || (hasTime ? "00" : "");
  if (!date) return hasTime ? `T${filledHh}:${filledMm}` : "";
  const ymd = format(date, ISO_DATE);
  if (!hasTime) return `${ymd}T`;
  return `${ymd}T${filledHh}:${filledMm}`;
}

function autoformatDisplay(text: string): string {
  const digits = text.replace(/\D/g, "").slice(0, 12);
  const [d, mo, y, h, mi] = [
    digits.slice(0, 2),
    digits.slice(2, 4),
    digits.slice(4, 8),
    digits.slice(8, 10),
    digits.slice(10, 12),
  ];
  let out = d;
  if (digits.length > 2) out += `/${mo}`;
  if (digits.length > 4) out += `/${y}`;
  if (digits.length > 8) out += ` ${h}`;
  if (digits.length > 10) out += `:${mi}`;
  return out;
}

function tryParseDisplay(text: string): string | null {
  const parsed = parse(text, DISPLAY_FORMAT, new Date());
  if (!isValid(parsed)) return null;
  return format(parsed, "yyyy-MM-dd'T'HH:mm");
}

function toDateBoundary(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const ymd = value.split("T")[0];
  const parsed = parse(ymd, ISO_DATE, new Date());
  return isValid(parsed) ? parsed : undefined;
}

function computeVisible(
  draft: string | null,
  date: Date | undefined,
  hh: string,
  mm: string,
): string {
  if (draft !== null) return draft;
  if (!date && !hh && !mm) return "";
  if (date && hh && mm) {
    const composed = new Date(date.getTime());
    composed.setHours(Number(hh), Number(mm), 0, 0);
    return format(composed, DISPLAY_FORMAT);
  }
  if (date) return format(date, "dd/MM/yyyy");
  if (hh && mm) return `${hh}:${mm}`;
  return "";
}

export function DateTimePicker({
  id,
  name,
  label,
  value,
  onChange,
  error,
  required,
  disabled,
  min,
  max,
}: DateTimePickerProps) {
  const popoverId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const calendarWrapRef = useRef<HTMLDivElement | null>(null);
  const [contentNode, setContentNode] = useState<HTMLDivElement | null>(null);
  const justClosedRef = useRef(false);

  const dayPickerComponents = {
    Dropdown: (props: DropdownProps) => {
      const { value, onChange, options, "aria-label": ariaLabel } = props;
      const stringValue = value !== undefined ? String(value) : "";
      const selectOptions: ReadonlyArray<SelectOption> =
        options?.map((o) => ({ value: String(o.value), label: o.label })) ?? [];
      return (
        <Select
          ariaLabel={ariaLabel ?? "Choose"}
          value={stringValue}
          onValueChange={(next) => {
            if (!onChange) return;
            const synthetic = {
              target: { value: next },
              currentTarget: { value: next },
            } as unknown as ChangeEvent<HTMLSelectElement>;
            onChange(synthetic);
          }}
          options={selectOptions}
          portalContainer={contentNode}
        />
      );
    },
  };
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<string | null>(null);

  const { date, hh, mm } = splitValue(value);
  const minDate = toDateBoundary(min);
  const maxDate = toDateBoundary(max);
  const [month, setMonth] = useState<Date | undefined>(date ?? minDate);
  const [prevValue, setPrevValue] = useState(value);
  if (prevValue !== value) {
    setPrevValue(value);
    setMonth(date ?? minDate);
  }

  const visible = computeVisible(draft, date, hh, mm);

  function handleManualInput(text: string) {
    const formatted = autoformatDisplay(text);
    setDraft(formatted);
    if (formatted === "") {
      onChange("");
      return;
    }
    const next = tryParseDisplay(formatted);
    if (next) {
      onChange(next);
      setDraft(null);
    }
  }

  function focusCalendar() {
    const wrap = calendarWrapRef.current;
    const target =
      wrap?.querySelector<HTMLButtonElement>('td[aria-selected="true"] button') ??
      wrap?.querySelector<HTMLButtonElement>("td[data-today] button") ??
      wrap?.querySelector<HTMLButtonElement>("td[data-day] button:not([disabled])");
    target?.focus();
  }

  function closeAndReturnFocus() {
    justClosedRef.current = true;
    setDraft(null);
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleInputKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      requestAnimationFrame(focusCalendar);
      return;
    }
    if (e.key === "Enter" && open) {
      e.preventDefault();
      const committed = draft ? tryParseDisplay(draft) : null;
      if (committed) {
        onChange(committed);
        setDraft(null);
      }
      closeAndReturnFocus();
    } else if (e.key === "Escape" && open) {
      e.preventDefault();
      closeAndReturnFocus();
    }
  }

  function handleDateSelect(next: Date | undefined) {
    onChange(combine(next, hh, mm));
    setDraft(null);
  }

  function handleHourSelect(next: string) {
    onChange(combine(date, next, mm));
    setDraft(null);
  }

  function handleMinuteSelect(next: string) {
    onChange(combine(date, hh, next));
    setDraft(null);
  }

  return (
    <FieldShell id={id} label={label} required={required} error={error} noLabel>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor className="relative block">
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
            value={visible}
            onChange={(e) => handleManualInput(e.target.value)}
            onFocus={() => {
              if (disabled) return;
              if (justClosedRef.current) {
                justClosedRef.current = false;
                return;
              }
              setOpen(true);
            }}
            onKeyDown={handleInputKeyDown}
            placeholder=" "
            disabled={disabled}
            required={required}
            autoComplete="off"
            inputMode="numeric"
            aria-haspopup="dialog"
            aria-controls={popoverId}
            aria-expanded={open}
            aria-invalid={error ? true : undefined}
            className={inputClasses}
          />
          <FloatingLabel id={id} label={label} required={required} />
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            ref={setContentNode}
            id={popoverId}
            side="bottom"
            align="start"
            sideOffset={8}
            aria-label="Choose date and time"
            onOpenAutoFocus={(e) => e.preventDefault()}
            onInteractOutside={(e) => {
              if (e.target === inputRef.current) e.preventDefault();
            }}
            className="z-50 bg-j-ivory border border-j-border-gold rounded-md shadow-j-card p-4 flex flex-col gap-3"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              <div
                ref={calendarWrapRef}
                className="relative sm:border-r sm:border-j-border-subtle sm:pr-4"
              >
                <DayPicker
                  mode="single"
                  selected={date}
                  onSelect={handleDateSelect}
                  startMonth={minDate}
                  endMonth={maxDate}
                  month={month ?? new Date()}
                  onMonthChange={setMonth}
                  captionLayout="dropdown"
                  showOutsideDays
                  labels={DAY_PICKER_LABELS}
                  classNames={DAY_PICKER_CLASSES}
                  components={dayPickerComponents}
                />
              </div>
              <div className="flex gap-2 items-center justify-center">
                <TimeColumn
                  idPrefix={id}
                  column="hour"
                  items={HOURS}
                  selected={hh}
                  ariaLabel="Hour"
                  onSelect={handleHourSelect}
                  isOpen={open}
                />
                <span aria-hidden="true" className="font-display italic text-j-text-heading text-xl">
                  :
                </span>
                <TimeColumn
                  idPrefix={id}
                  column="minute"
                  items={MINUTES}
                  selected={mm}
                  ariaLabel="Minute"
                  onSelect={handleMinuteSelect}
                  isOpen={open}
                />
              </div>
            </div>
            <div className="flex justify-end pt-2 border-t border-j-border-subtle">
              <button
                type="button"
                onClick={closeAndReturnFocus}
                className="font-display italic text-sm text-j-text-heading hover:text-j-accent transition-colors px-3 py-1 rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep"
              >
                Done
              </button>
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </FieldShell>
  );
}

type TimeColumnProps = {
  idPrefix: string;
  column: "hour" | "minute";
  items: string[];
  selected: string;
  ariaLabel: string;
  onSelect: (value: string) => void;
  isOpen: boolean;
};

function TimeColumn({
  idPrefix,
  column,
  items,
  selected,
  ariaLabel,
  onSelect,
  isOpen,
}: TimeColumnProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const optionRefs = useRef<Array<HTMLDivElement | null>>([]);
  const selectedIndex = items.indexOf(selected);
  const [activeIndex, setActiveIndex] = useState(selectedIndex >= 0 ? selectedIndex : 0);
  const [prevSelectedIndex, setPrevSelectedIndex] = useState(selectedIndex);
  if (prevSelectedIndex !== selectedIndex) {
    setPrevSelectedIndex(selectedIndex);
    if (selectedIndex >= 0) setActiveIndex(selectedIndex);
  }

  useEffect(() => {
    if (!isOpen) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = activeIndex * ITEM_HEIGHT_PX;
  }, [isOpen, activeIndex]);

  function moveActive(nextIdx: number) {
    setActiveIndex(nextIdx);
    optionRefs.current[nextIdx]?.focus();
  }

  function handleOptionKeyDown(e: KeyboardEvent<HTMLDivElement>, i: number) {
    if (items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveActive(Math.min(items.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      moveActive(Math.max(0, i - 1));
    } else if (e.key === "Home") {
      e.preventDefault();
      moveActive(0);
    } else if (e.key === "End") {
      e.preventDefault();
      moveActive(items.length - 1);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelect(items[i]);
    }
  }

  return (
    <div className="relative w-14" style={{ height: COLUMN_HEIGHT_PX }}>
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 border-y border-j-accent/60 bg-j-blush/40 rounded-sm"
        style={{ height: ITEM_HEIGHT_PX }}
      />
      <div
        ref={scrollRef}
        role="listbox"
        aria-label={ariaLabel}
        className="h-full overflow-y-auto snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-sm"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent 0, black 30%, black 70%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent 0, black 30%, black 70%, transparent 100%)",
        }}
      >
        <div style={{ paddingBlock: COLUMN_PAD_PX }}>
          {items.map((item, i) => {
            const isSelected = item === selected;
            const isActive = i === activeIndex;
            return (
              <div
                key={item}
                ref={(el) => {
                  optionRefs.current[i] = el;
                }}
                id={`${idPrefix}-${column}-opt-${item}`}
                role="option"
                aria-selected={isSelected}
                tabIndex={isActive ? 0 : -1}
                onKeyDown={(e) => handleOptionKeyDown(e, i)}
                onClick={() => {
                  setActiveIndex(i);
                  onSelect(item);
                }}
                className={`block w-full snap-center font-body text-base flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-j-deep rounded-sm ${
                  isSelected
                    ? "text-j-text-heading font-semibold"
                    : "text-j-text-muted hover:text-j-text-heading"
                }`}
                style={{ height: ITEM_HEIGHT_PX }}
              >
                {item}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
