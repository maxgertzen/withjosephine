"use client";

import { DatePicker } from "@/components/Form/DatePicker";
import { TimePicker } from "@/components/Form/TimePicker";
import { errorClassesSmall } from "@/lib/formStyles";

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

function splitDateTime(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" };
  const [datePart, timePart] = value.split("T");
  return { date: datePart ?? "", time: timePart?.slice(0, 5) ?? "" };
}

function combineDateTime(date: string, time: string): string {
  if (!date && !time) return "";
  return `${date}T${time}`;
}

function toDateBoundary(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return value.split("T")[0];
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
  const { date, time } = splitDateTime(value);
  const dateId = `${id}-date`;
  const timeId = `${id}-time`;
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div className="flex flex-col gap-1" aria-describedby={errorId}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1">
          <DatePicker
            id={dateId}
            name={`${name}-date`}
            label={`${label} — date`}
            value={date}
            onChange={(next) => onChange(combineDateTime(next, time))}
            required={required}
            disabled={disabled}
            min={toDateBoundary(min)}
            max={toDateBoundary(max)}
          />
        </div>
        <div className="flex-1">
          <TimePicker
            id={timeId}
            name={`${name}-time`}
            label={`${label} — time`}
            value={time}
            onChange={(next) => onChange(combineDateTime(date, next))}
            required={required}
            disabled={disabled}
          />
        </div>
      </div>
      {error ? (
        <span id={errorId} className={errorClassesSmall}>
          {error}
        </span>
      ) : null}
    </div>
  );
}
