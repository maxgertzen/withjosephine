import type { ReactNode } from "react";

import { errorClasses } from "@/lib/formStyles";

type CheckboxProps = {
  id: string;
  name: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
  disabled?: boolean;
  required?: boolean;
};

export function Checkbox({
  id,
  name,
  checked,
  onChange,
  children,
  error,
  disabled,
  required,
}: CheckboxProps) {
  const errorId = error ? `${id}-error` : undefined;

  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-start gap-3 font-body text-sm text-j-text leading-[1.6] cursor-pointer"
      >
        <input
          id={id}
          name={name}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className="mt-[3px] h-4 w-4 shrink-0 accent-j-accent cursor-pointer"
        />
        <span>{children}</span>
      </label>
      {error ? (
        <p id={errorId} role="alert" className={`${errorClasses} mt-2`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
