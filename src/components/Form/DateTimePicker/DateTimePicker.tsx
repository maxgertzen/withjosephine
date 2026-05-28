"use client";

import { DatePicker } from "@/components/Form/DatePicker";
import { TimePicker } from "@/components/Form/TimePicker";

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

const DATETIME_LOCAL_SHAPE = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?$/;

function splitDateTime(value: string): { date: string; time: string } {
  const match = DATETIME_LOCAL_SHAPE.exec(value);
  if (!match) return { date: "", time: "" };
  return { date: match[1], time: match[2] };
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
  return (
    <div className="flex flex-col sm:flex-row gap-2">
      <DatePicker
        id={`${id}-date`}
        name={`${name}-date`}
        label={`${label} (date)`}
        value={date}
        onChange={(next) => onChange(combineDateTime(next, time))}
        error={error}
        required={required}
        disabled={disabled}
        min={toDateBoundary(min)}
        max={toDateBoundary(max)}
      />
      <TimePicker
        id={`${id}-time`}
        name={`${name}-time`}
        label={`${label} (time)`}
        value={time}
        onChange={(next) => onChange(combineDateTime(date, next))}
        required={required}
        disabled={disabled}
      />
    </div>
  );
}
