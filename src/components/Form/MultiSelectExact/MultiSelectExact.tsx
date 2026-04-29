"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { QuestionCard } from "@/components/IntakeForm/QuestionCard";
import { SlotBlock } from "@/components/IntakeForm/SlotBlock";
import {
  LIMIT_MESSAGE_DEFAULT,
  LIMIT_MESSAGE_TIMEOUT_MS,
  statusLineFor,
} from "@/lib/booking/nameFollowup";
import { errorClasses, labelClasses } from "@/lib/formStyles";
import type { SanityFormFieldOption } from "@/lib/sanity/types";

type MultiSelectExactProps = {
  id: string;
  name: string;
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  options: SanityFormFieldOption[];
  count: number;
  helpText?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  nameFollowupValues?: Record<string, string>;
  onNameFollowupChange?: (optionValue: string, text: string) => void;
};

type CategoryGroup = {
  name: string;
  order: number;
  options: SanityFormFieldOption[];
};

const UNCATEGORIZED = "__uncategorized__";

function groupByCategory(options: SanityFormFieldOption[]): CategoryGroup[] {
  const groups = new Map<string, CategoryGroup>();
  for (const option of options) {
    const key = option.category ?? UNCATEGORIZED;
    const order = option.categoryOrder ?? Number.MAX_SAFE_INTEGER;
    const existing = groups.get(key);
    if (existing) {
      existing.options.push(option);
      if (order < existing.order) existing.order = order;
    } else {
      groups.set(key, { name: option.category ?? "", order, options: [option] });
    }
  }
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

export function MultiSelectExact({
  id,
  name,
  label,
  value,
  onChange,
  options,
  count,
  helpText,
  error,
  required,
  disabled,
  nameFollowupValues = {},
  onNameFollowupChange,
}: MultiSelectExactProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const reachedLimit = value.length >= count;

  const [flashCount, setFlashCount] = useState(0);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (flashCount === 0) return;
    if (flashTimer.current) clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlashCount(0), LIMIT_MESSAGE_TIMEOUT_MS);
    return () => {
      if (flashTimer.current) clearTimeout(flashTimer.current);
    };
  }, [flashCount]);

  const optionsByValue = useMemo(() => {
    const map = new Map<string, SanityFormFieldOption>();
    for (const option of options) map.set(option.value, option);
    return map;
  }, [options]);

  const selectedOptions = useMemo(
    () => value.map((v) => optionsByValue.get(v)).filter(Boolean) as SanityFormFieldOption[],
    [value, optionsByValue],
  );

  const grouped = useMemo(() => groupByCategory(options), [options]);
  const isCategorized = options.some((option) => Boolean(option.category));

  function toggle(optionValue: string) {
    if (disabled) return;
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
      onNameFollowupChange?.(optionValue, "");
      return;
    }
    if (reachedLimit) {
      setFlashCount((n) => n + 1);
      return;
    }
    onChange([...value, optionValue]);
  }

  const status = statusLineFor(value.length, count);
  const limitMessage = flashCount > 0 ? LIMIT_MESSAGE_DEFAULT : undefined;

  function renderCard(option: SanityFormFieldOption) {
    const checked = value.includes(option.value);
    const softened = !checked && reachedLimit;
    return (
      <QuestionCard
        key={option.value}
        option={option}
        fieldId={id}
        fieldName={name}
        checked={checked}
        softened={softened}
        disabled={disabled}
        onToggle={() => toggle(option.value)}
        nameFollowupValue={nameFollowupValues[option.value] ?? ""}
        onNameFollowupChange={(text) => onNameFollowupChange?.(option.value, text)}
      />
    );
  }

  return (
    <fieldset
      id={id}
      className="border-0 p-0 m-0"
      aria-invalid={error ? true : undefined}
      aria-describedby={[errorId, helpId].filter(Boolean).join(" ") || undefined}
    >
      <legend className={labelClasses}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </legend>

      {isCategorized ? (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <div key={group.name || UNCATEGORIZED}>
              {group.name ? (
                <div className="flex items-baseline justify-between font-body text-xs font-semibold tracking-widest uppercase text-j-text-heading border-b border-j-border-subtle pb-2 mb-3">
                  <span>{group.name}</span>
                  <span className="font-normal text-j-text-muted tracking-wider">
                    {group.options.length}
                  </span>
                </div>
              ) : null}
              <ul className="list-none p-0 m-0 flex flex-col gap-2">
                {group.options.map(renderCard)}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <ul className="list-none p-0 m-0 flex flex-col gap-2">
          {options.map(renderCard)}
        </ul>
      )}

      <div className="mt-6">
        <SlotBlock
          count={count}
          selected={selectedOptions}
          status={status}
          limitMessage={limitMessage}
        />
      </div>

      {helpText ? (
        <p id={helpId} className="font-body text-xs text-j-text-muted mt-2">
          {helpText}
        </p>
      ) : null}
      {error ? (
        <p id={errorId} role="alert" className={`${errorClasses} mt-2`}>
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}
