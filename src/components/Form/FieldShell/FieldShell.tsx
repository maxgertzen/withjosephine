import type { ReactNode } from "react";

import { errorClasses } from "@/lib/formStyles";
import type { SanityFormHelperPosition } from "@/lib/sanity/types";

import { FloatingLabel } from "./FloatingLabel";

type FieldShellProps = {
  id: string;
  label: string;
  required?: boolean;
  helpText?: string;
  helperPosition?: SanityFormHelperPosition;
  clarificationNote?: string;
  error?: string;
  children: ReactNode;
  afterField?: ReactNode;
  noLabel?: boolean;
  multilineLabel?: boolean;
};

export function fieldDescribedBy(
  id: string,
  { helpText, error }: { helpText?: string; error?: string },
): string | undefined {
  const ids = [helpText ? `${id}-help` : null, error ? `${id}-error` : null].filter(Boolean);
  return ids.length ? ids.join(" ") : undefined;
}

export function FieldShell({
  id,
  label,
  required,
  helpText,
  helperPosition,
  clarificationNote,
  error,
  children,
  afterField,
  noLabel = false,
  multilineLabel = false,
}: FieldShellProps) {
  const helperBefore = helperPosition === "before";
  const helpId = helpText ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = fieldDescribedBy(id, { helpText, error });

  const helper = helpText ? (
    <p
      id={helpId}
      className={`font-body text-xs text-j-text-muted ${
        helperBefore ? "mt-1 mb-3" : "mt-2"
      }`}
    >
      {helpText}
    </p>
  ) : null;

  return (
    <div data-field-shell aria-describedby={describedBy}>
      {clarificationNote ? (
        <p className="font-display italic text-sm text-j-text-muted mb-2">
          {clarificationNote}
        </p>
      ) : null}
      {helperBefore ? helper : null}
      <div className="relative">
        {children}
        {noLabel ? null : (
          <FloatingLabel
            id={id}
            label={label}
            required={required}
            multiline={multilineLabel}
          />
        )}
      </div>
      {helperBefore ? null : helper}
      {afterField}
      {error ? (
        <p id={errorId} role="alert" className={`${errorClasses} mt-2`}>
          {error}
        </p>
      ) : null}
    </div>
  );
}
