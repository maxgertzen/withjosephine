import type { KeyboardEvent } from "react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Form/Input";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";

export type GiftCodeFieldProps = {
  id: string;
  label: string;
  checkingLabel: string;
  value: string;
  onChange: (value: string) => void;
  checking: boolean;
  error?: string;
  apply?: { label: string; onApply: () => void };
};

export function GiftCodeField({
  id,
  label,
  checkingLabel,
  value,
  onChange,
  checking,
  error,
  apply,
}: GiftCodeFieldProps) {
  const canApply = !checking && value.trim() !== "";

  function applyOnEnterInField(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" && event.target instanceof HTMLInputElement && canApply)
      apply?.onApply();
  }

  return (
    <div
      {...CLARITY_MASK_PROPS}
      onKeyDown={apply ? applyOnEnterInField : undefined}
      className="flex flex-col gap-3 md:flex-row md:items-start"
    >
      <div className="min-w-0 md:flex-1">
        <Input
          id={id}
          name="giftCode"
          label={label}
          value={value}
          onChange={onChange}
          variant="code"
          helpText={checking ? checkingLabel : undefined}
          error={error}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          enterKeyHint="go"
        />
      </div>
      {apply ? (
        <Button
          type="button"
          variant="outlined"
          onClick={apply.onApply}
          disabled={!canApply}
          className="w-full md:h-14.5 md:w-auto md:shrink-0"
        >
          {apply.label}
        </Button>
      ) : null}
    </div>
  );
}
