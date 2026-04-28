import type { ReactNode } from "react";

import { errorClasses, labelClasses } from "@/lib/formStyles";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({ id, label, required, helpText, error, children }: FieldShellProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div data-field-shell aria-describedby={describedBy}>
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
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
    </div>
  );
}
