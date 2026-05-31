"use client";

import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";

export type BrandSelectOption = {
  value: string;
  label: string;
};

type BrandSelectProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: ReadonlyArray<BrandSelectOption>;
  placeholder?: string;
  ariaLabel: string;
  disabled?: boolean;
  className?: string;
  /**
   * When the BrandSelect is opened from inside another Radix Portal (e.g. a
   * Popover), pass that portal's container ref so the listbox renders inside
   * the same stacking context. Otherwise the listbox can disappear behind
   * the parent popover or escape its scroll boundary.
   */
  portalContainer?: HTMLElement | null;
};

export function BrandSelect({
  value,
  onValueChange,
  options,
  placeholder,
  ariaLabel,
  disabled,
  className,
  portalContainer,
}: BrandSelectProps): ReactNode {
  return (
    <Select.Root value={value || undefined} onValueChange={onValueChange} disabled={disabled}>
      <Select.Trigger
        aria-label={ariaLabel}
        className={`inline-flex items-center justify-between gap-2 font-body text-sm bg-j-cream border border-j-border-subtle rounded-sm px-3 py-2 text-j-text-heading focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-j-deep disabled:opacity-40 disabled:cursor-not-allowed ${className ?? ""}`}
      >
        <Select.Value placeholder={placeholder} />
        <Select.Icon className="text-j-text-muted">
          <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal container={portalContainer ?? undefined}>
        <Select.Content
          className="z-50 w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] bg-j-ivory border border-j-border-gold rounded-md shadow-j-card overflow-hidden font-body text-sm text-j-text-heading"
          position="popper"
          sideOffset={4}
        >
          <Select.Viewport className="p-1 max-h-[280px]">
            {options.map((opt) => (
              <Select.Item
                key={opt.value}
                value={opt.value}
                className="relative flex items-center pl-6 pr-3 py-1.5 rounded-sm cursor-pointer select-none outline-none data-[highlighted]:bg-j-blush/40 data-[state=checked]:font-semibold"
              >
                <Select.ItemIndicator className="absolute left-1 inline-flex items-center text-j-deep">
                  <Check className="h-3 w-3" aria-hidden="true" />
                </Select.ItemIndicator>
                <Select.ItemText>{opt.label}</Select.ItemText>
              </Select.Item>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}
