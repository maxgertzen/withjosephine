import { Check } from "lucide-react";

import {
  isNameFollowupEnabled,
  NAME_FOLLOWUP_MAX_LENGTH,
} from "@/lib/booking/nameFollowup";
import type { SanityFormFieldOption } from "@/lib/sanity/types";

type QuestionCardProps = {
  option: SanityFormFieldOption;
  fieldId: string;
  fieldName: string;
  checked: boolean;
  softened: boolean;
  disabled?: boolean;
  onToggle: () => void;
  nameFollowupValue: string;
  onNameFollowupChange: (text: string) => void;
};

export function QuestionCard({
  option,
  fieldId,
  fieldName,
  checked,
  softened,
  disabled,
  onToggle,
  nameFollowupValue,
  onNameFollowupChange,
}: QuestionCardProps) {
  const followupEnabled = isNameFollowupEnabled(option);
  const inputId = `${fieldId}-${option.value}`;
  const followupId = `${inputId}-name`;
  const showFollowup = followupEnabled && checked;

  return (
    <li
      data-softened={softened || undefined}
      className={[
        "relative flex flex-col gap-3 px-4 py-3 border rounded-md transition-colors min-h-12",
        checked
          ? "border-j-accent bg-j-ivory"
          : "border-j-border-subtle bg-j-cream hover:bg-j-blush/20 hover:border-j-border-gold",
        softened ? "opacity-55 pointer-events-none" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <label
        htmlFor={inputId}
        className="flex items-start gap-3 cursor-pointer min-h-11"
      >
        <span className="relative flex-shrink-0">
          <input
            id={inputId}
            type="checkbox"
            name={fieldName}
            value={option.value}
            checked={checked}
            disabled={disabled}
            onChange={onToggle}
            tabIndex={softened ? 0 : undefined}
            aria-disabled={softened || undefined}
            className="absolute inset-0 w-[22px] h-[22px] opacity-0 cursor-pointer m-0 z-[2] focus-visible:outline-none"
          />
          <span
            aria-hidden="true"
            className={[
              "inline-flex w-[18px] h-[18px] mt-1 items-center justify-center rounded-sm border transition-colors",
              checked
                ? "bg-j-deep border-j-deep"
                : "bg-j-cream border-j-text-muted",
            ].join(" ")}
          >
            {checked ? (
              <Check className="w-3 h-3 text-j-cream" strokeWidth={2.5} />
            ) : null}
          </span>
        </span>
        <span className="font-body text-base leading-snug text-j-text">
          {option.label}
        </span>
      </label>

      {showFollowup ? (
        <div className="ml-9 mt-1 px-4 py-3 bg-j-blush/30 border-l-2 border-j-accent rounded-r-md">
          <label
            htmlFor={followupId}
            className="block font-display italic text-sm text-j-text mb-2"
          >
            {option.nameFollowup?.label ?? "Their name"}
          </label>
          <input
            id={followupId}
            type="text"
            value={nameFollowupValue}
            onChange={(event) =>
              onNameFollowupChange(event.target.value.slice(0, NAME_FOLLOWUP_MAX_LENGTH))
            }
            placeholder={option.nameFollowup?.placeholder ?? ""}
            maxLength={NAME_FOLLOWUP_MAX_LENGTH}
            autoComplete="off"
            inputMode="text"
            autoCapitalize="words"
            spellCheck="true"
            className="font-body text-base px-3 py-2 border border-j-text-muted bg-j-ivory rounded-sm w-full max-w-[280px] min-h-11 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-j-deep focus-visible:border-j-deep"
          />
        </div>
      ) : null}
    </li>
  );
}
