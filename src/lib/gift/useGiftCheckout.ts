"use client";

import { useState } from "react";

import { identifySubmission, track } from "@/lib/analytics";
import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import { CONSENT_ACK_MESSAGE } from "@/lib/compliance/intakeConsent";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";

import { giftClientReferenceId } from "./clientReference";
import type { GiftCheckoutMessages } from "./giftCopyKeys";
import {
  type GiftPurchaseRequestBody,
  type GiftSheetFieldErrors,
  validateGiftSheet,
} from "./giftInput";

export type GiftCheckoutValues = {
  buyerFirstName: string;
  note: string;
  coolingOffConsent: boolean;
  honeypot: string;
};

export type GiftCheckoutErrorField = "buyerFirstName" | "coolingOff" | "form";
export type GiftCheckoutErrors = Partial<Record<GiftCheckoutErrorField, string>>;

type UseGiftCheckoutArgs = {
  readingSlug: string;
  endpoint: string | null;
  messages: GiftCheckoutMessages;
};

type PurchaseResponse = { paymentUrl?: string; giftId?: string };
type PurchaseFailure = { fieldErrors?: GiftSheetFieldErrors };

type ErrorLineFields = Pick<GiftSheetFieldErrors, "buyerFirstName" | "coolingOff">;

function errorLines(fields: ErrorLineFields, messages: GiftCheckoutMessages): GiftCheckoutErrors {
  const errors: GiftCheckoutErrors = {};
  if (fields.buyerFirstName === "required") errors.buyerFirstName = messages.buyerNameRequired;
  if (fields.coolingOff === "required") errors.coolingOff = CONSENT_ACK_MESSAGE;
  return errors;
}

function clientFieldErrors(values: GiftCheckoutValues): ErrorLineFields {
  const validation = validateGiftSheet(values);
  return {
    buyerFirstName: "fieldErrors" in validation ? validation.fieldErrors.buyerFirstName : undefined,
    coolingOff: values.coolingOffConsent ? undefined : "required",
  };
}

async function serverFieldErrors(response: Response): Promise<ErrorLineFields> {
  const body = (await response.json().catch(() => null)) as PurchaseFailure | null;
  return body?.fieldErrors ?? {};
}

export function useGiftCheckout({ readingSlug, endpoint, messages }: UseGiftCheckoutArgs) {
  const turnstile = useTurnstileChallenge();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<GiftCheckoutErrors>({});

  const clearError = (field: GiftCheckoutErrorField) =>
    setErrors((current) => ({ ...current, [field]: undefined }));

  const fail = (nextErrors: GiftCheckoutErrors) => {
    setErrors(nextErrors);
    setIsSubmitting(false);
  };

  const submit = async (values: GiftCheckoutValues) => {
    const missing = errorLines(clientFieldErrors(values), messages);
    setErrors(missing);
    if (Object.keys(missing).length > 0 || !endpoint) return;

    setIsSubmitting(true);
    const turnstileToken = await turnstile.requestFreshToken();
    if (turnstile.turnstileRequired && !turnstileToken) {
      fail({ form: messages.sheetSubmitFailed });
      return;
    }

    const requestBody: GiftPurchaseRequestBody = {
      readingSlug,
      buyerFirstName: values.buyerFirstName,
      note: values.note,
      coolingOffConsent: values.coolingOffConsent,
      turnstileToken: turnstileToken ?? "",
      [HONEYPOT_FIELD]: values.honeypot,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const fieldErrors =
          response.status === 400 ? errorLines(await serverFieldErrors(response), messages) : {};
        fail(
          Object.keys(fieldErrors).length > 0 ? fieldErrors : { form: messages.sheetSubmitFailed },
        );
        return;
      }

      const data = (await response.json()) as PurchaseResponse;
      if (!data.paymentUrl || !data.giftId) {
        fail({ form: messages.sheetSubmitFailed });
        return;
      }

      const submissionId = giftClientReferenceId(data.giftId);
      identifySubmission(submissionId);
      track("stripe_redirect", { reading_id: readingSlug, submission_id: submissionId });
      window.location.href = data.paymentUrl;
    } catch {
      fail({ form: messages.sheetNetworkFailed });
    }
  };

  return { submit, isSubmitting, errors, clearError, turnstile };
}
