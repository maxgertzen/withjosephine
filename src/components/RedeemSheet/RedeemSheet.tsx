"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { GiftCodeField, useGiftCodeField } from "@/components/GiftCodeField";
import { Sheet, sheetSubmitClasses, sheetTitleClasses } from "@/components/Sheet";
import { applyTokens } from "@/lib/emails/applyTokens";
import type { GiftCodeCheckOutcome } from "@/lib/gift/useGiftCodeCheck";
import { eyebrowClasses, quietButtonClasses } from "@/lib/textStyles";

import type { RedeemSheetContent } from "./redeemSheetCopy";

const TITLE_ID = "redeem-sheet-title";

export type RedeemSheetProps = {
  open: boolean;
  onClose: () => void;
  readingSlug: string;
  content: RedeemSheetContent;
  endpoint: string | null;
};

export function RedeemSheet({ open, onClose, readingSlug, content, endpoint }: RedeemSheetProps) {
  const field = useGiftCodeField(readingSlug, content, endpoint);
  const [outcome, setOutcome] = useState<GiftCodeCheckOutcome | null>(null);
  const otherReading = outcome?.kind === "other_reading" ? outcome : null;

  const handleCodeChange = (value: string) => {
    field.onChange(value);
    setOutcome(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (field.checking) return;
    const next = await field.check();
    if (next?.kind === "valid") {
      window.location.assign(next.path);
      return;
    }
    setOutcome(next);
  };

  return (
    <Sheet open={open} onClose={onClose} labelledBy={TITLE_ID}>
      <p className={`${eyebrowClasses} m-0`}>{content.sheetEyebrow}</p>
      <h2 id={TITLE_ID} className={sheetTitleClasses}>
        {content.redeemHeading}
      </h2>
      <p className="m-0 font-body text-sm leading-[1.55] text-j-text-muted">{content.redeemBody}</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <GiftCodeField
          id="redeem-gift-code"
          label={content.codeFieldLabel}
          checkingLabel={content.codeChecking}
          enterKeyHint="go"
          value={field.value}
          onChange={handleCodeChange}
          checking={field.checking}
          error={field.error}
        />

        {otherReading ? (
          <Button
            type="button"
            variant="outlined"
            size="lg"
            onClick={() => window.location.assign(otherReading.path)}
            className={sheetSubmitClasses}
          >
            {applyTokens(content.goToReadingTemplate, { reading: otherReading.readingName })}
          </Button>
        ) : (
          <Button type="submit" size="lg" disabled={field.checking} className={sheetSubmitClasses}>
            {content.redeemButtonLabel}
          </Button>
        )}
        <button type="button" onClick={onClose} className={quietButtonClasses}>
          {content.sheetCancelLabel}
        </button>
      </form>
    </Sheet>
  );
}
