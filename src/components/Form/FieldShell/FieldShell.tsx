import type { ReactNode } from "react";

import { errorClasses, labelClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  children: ReactNode;
};

export function FieldShell({
  id,
  label,
  required,
  helpText,
  helperPosition = "after",
  clarificationNote,
  error,
  children,
}: FieldShellProps) {
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  const helper = helpText ? (
    <p
      id={helpId}
      className={`font-body text-xs text-j-text-muted ${
        helperPosition === "before" ? "mt-1 mb-3" : "mt-2"
      }`}
    >
      {helpText}
    </p>
  ) : null;

  return (
    <div data-field-shell aria-describedby={describedBy}>
      <label htmlFor={id} className={labelClasses}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {clarificationNote ? (
        <p className="font-display italic text-sm text-j-text-muted mt-1 mb-3">
          {clarificationNote}
        </p>
      ) : null}
      {helperPosition === "before" ? helper : null}
      {children}
      {helperPosition === "after" ? helper : null}
      {error ? (
        <p id={errorId} role="alert" className={`${errorClasses} mt-2`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
