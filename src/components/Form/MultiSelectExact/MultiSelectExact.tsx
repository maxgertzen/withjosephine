"use client";

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
};

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
}: MultiSelectExactProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const reachedLimit = value.length >= count;

  function toggle(optionValue: string) {
    if (disabled) return;
    if (value.includes(optionValue)) {
      onChange(value.filter((v) => v !== optionValue));
      return;
    }
    if (reachedLimit) return;
    onChange([...value, optionValue]);
  }

  return (
    <fieldset id={id} className="border-0 p-0 m-0" aria-invalid={error ? true : undefined}>
      <legend className={labelClasses}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
        <span className="text-j-text-muted normal-case tracking-normal ml-2">
          (choose {count})
        </span>
      </legend>
      <div className="flex flex-col gap-2">
        {options.map((option) => {
          const checked = value.includes(option.value);
          const disableCheckbox = disabled || (!checked && reachedLimit);
          const inputId = `${id}-${option.value}`;
          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`flex items-center gap-3 font-body text-sm text-j-text cursor-pointer ${
                disableCheckbox ? "opacity-50 cursor-not-allowed" : ""
              }`}
            >
              <input
                id={inputId}
                type="checkbox"
                name={name}
                value={option.value}
                checked={checked}
                disabled={disableCheckbox}
                onChange={() => toggle(option.value)}
                className="h-4 w-4 accent-j-accent"
              />
              <span>{option.label}</span>
            </label>
          );
        })}
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
