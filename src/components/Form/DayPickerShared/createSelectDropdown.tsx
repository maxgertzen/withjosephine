"use client";

import type { ChangeEvent } from "react";
import type { DropdownProps } from "react-day-picker";

import { Select, type SelectOption } from "@/components/Form/Select";

export function createSelectDropdown(contentNode: HTMLElement | null) {
  return function Dropdown(props: DropdownProps) {
    const { value, onChange, options, "aria-label": ariaLabel } = props;
    const stringValue = value !== undefined ? String(value) : "";
    const selectOptions: ReadonlyArray<SelectOption> =
      options?.map((o) => ({ value: String(o.value), label: o.label })) ?? [];
    return (
      <Select
        ariaLabel={ariaLabel ?? "Choose"}
        value={stringValue}
        onValueChange={(next) => {
          if (!onChange) return;
          const synthetic = {
            target: { value: next },
            currentTarget: { value: next },
          } as unknown as ChangeEvent<HTMLSelectElement>;
          onChange(synthetic);
        }}
        options={selectOptions}
        portalContainer={contentNode}
      />
    );
  };
}
