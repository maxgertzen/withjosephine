"use client";

import { type FormEvent, useState } from "react";

import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Form/Checkbox";
import { InlineError } from "@/components/Form/InlineError";
import { Input } from "@/components/Form/Input";
import { GiftNoteField } from "@/components/GiftNoteField";
import { HoneypotField } from "@/components/HoneypotField";
import { SubmitOverlay } from "@/components/IntakeForm/SubmitOverlay";
import { InvisibleTurnstile } from "@/components/InvisibleTurnstile";
import { Sheet } from "@/components/Sheet";
import { type GiftContent, PAYMENT_BUTTON_TEXT_FALLBACK } from "@/data/defaults";
import { GIFT_BUYER_NAME_MAX_CHARS } from "@/lib/booking/constants";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { COOLING_OFF_CONSENT_LABEL } from "@/lib/compliance/intakeConsent";
import { applyTokens } from "@/lib/emails/applyTokens";
import { errorClasses } from "@/lib/formStyles";
import { useGiftCheckout } from "@/lib/gift/useGiftCheckout";
import { eyebrowClasses, quietButtonClasses } from "@/lib/textStyles";

const TITLE_ID = "gift-sheet-title";

const keepSheetOpen = () => undefined;

export type GiftSheetProps = {
  open: boolean;
  onClose: () => void;
  reading: { slug: string; name: string; price: string };
  content: GiftContent;
  paymentButtonText?: string;
  loadingStateCopy?: string;
  endpoint: string | null;
};

export function GiftSheet({
  open,
  onClose,
  reading,
  content,
  paymentButtonText,
  loadingStateCopy,
  endpoint,
}: GiftSheetProps) {
  const [buyerFirstName, setBuyerFirstName] = useState("");
  const [note, setNote] = useState("");
  const [coolingOffConsent, setCoolingOffConsent] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const { submit, isSubmitting, errors, clearError, turnstile } = useGiftCheckout({
    readingSlug: reading.slug,
    endpoint,
    messages: content,
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submit({ buyerFirstName, note, coolingOffConsent, honeypot });
  };

  const steps = [content.sheetStepPay, content.sheetStepSend, content.sheetStepRecipient];
  const close = isSubmitting ? keepSheetOpen : onClose;

  return (
    <Sheet open={open} onClose={close} labelledBy={TITLE_ID}>
      <p className={`${eyebrowClasses} m-0`}>{content.sheetEyebrow}</p>
      <h2
        id={TITLE_ID}
        className="m-0 font-display text-[1.6rem] font-light italic leading-[1.1] text-j-text-heading"
      >
        {applyTokens(content.sheetTitleTemplate, { reading: reading.name, price: reading.price })}
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2 p-0 font-body text-sm leading-[1.55] text-j-text">
        {steps.map((step) => (
          <li key={step} className="grid grid-cols-[18px_1fr] gap-2">
            <span aria-hidden="true" className="text-j-ornament">
              ✦
            </span>
            {step}
          </li>
        ))}
      </ul>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="relative flex flex-col gap-4"
        {...CLARITY_MASK_PROPS}
      >
        {isSubmitting ? <SubmitOverlay text={loadingStateCopy} /> : null}
        <HoneypotField value={honeypot} onChange={setHoneypot} />

        <Input
          id="gift-buyer-name"
          name="buyerFirstName"
          label={content.buyerNameLabel}
          value={buyerFirstName}
          onChange={(value) => {
            setBuyerFirstName(value);
            clearError("buyerFirstName");
          }}
          helpText={errors.buyerFirstName ? undefined : content.buyerNameHelp}
          error={errors.buyerFirstName}
          required
          maxLength={GIFT_BUYER_NAME_MAX_CHARS}
          autoComplete="given-name"
          enterKeyHint="next"
        />

        <GiftNoteField
          id="gift-note"
          label={content.noteLabel}
          value={note}
          onChange={setNote}
          rows={4}
          helpText={note ? undefined : content.noteHelpBeforePayment}
          copy={content}
        />

        <Checkbox
          id="gift-cooling-off"
          name="coolingOffConsent"
          checked={coolingOffConsent}
          onChange={(checked) => {
            setCoolingOffConsent(checked);
            clearError("coolingOff");
          }}
          error={errors.coolingOff}
          required
        >
          {COOLING_OFF_CONSENT_LABEL}
        </Checkbox>

        <InvisibleTurnstile challenge={turnstile} />

        <InlineError message={errors.form} className={errorClasses} />

        <Button
          type="submit"
          size="lg"
          disabled={isSubmitting}
          className="min-h-14 w-full !font-display !text-base !font-medium !normal-case !italic !tracking-normal"
        >
          {paymentButtonText ?? PAYMENT_BUTTON_TEXT_FALLBACK}
        </Button>
        <button
          type="button"
          onClick={close}
          className={quietButtonClasses}
        >
          {content.sheetCancelLabel}
        </button>
      </form>
    </Sheet>
  );
}
