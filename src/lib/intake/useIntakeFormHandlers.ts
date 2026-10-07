"use client";

import {
  type Dispatch,
  type FormEvent,
  type RefObject,
  type SetStateAction,
  useCallback,
} from "react";

import type { LegalAcknowledgmentsErrors } from "@/components/IntakeForm/LegalAcknowledgments";
import type { FieldValues } from "@/components/IntakeForm/types";
import { identifySubmission, track } from "@/lib/analytics";
import { COMPANION_SUFFIX_GEONAMEID, HONEYPOT_FIELD } from "@/lib/booking/constants";
import type { DynamicSchema } from "@/lib/booking/submissionSchema";
import {
  collectConsentErrors,
  isFullyConsented,
  type LegalConsentSnapshot,
} from "@/lib/compliance/intakeConsent";
import { normalizeGiftCode } from "@/lib/gift/giftCodeFormat";
import type { GiftCodeCheckOutcome } from "@/lib/gift/useGiftCodeCheck";
import { BOOKING_API_ROUTE, bookingPath } from "@/lib/http/routes";
import type { SanityFormField } from "@/lib/sanity/types";

import {
  focusFirstError,
  INTAKE_SUBMIT_ERROR,
  type IntakeSubmitErrorCode,
  validateCurrentPage,
  validateFullSubmission,
} from "./intakeValidation";
import {
  clear as clearDraft,
  clearGiftCode,
  type DraftValues,
  save as saveDraft,
} from "./localStorageDraft";

const GIFT_ENDING_ERRORS = ["gift_already_redeemed", "gift_not_found", "gift_not_active"] as const;

export type GiftEndingError = (typeof GIFT_ENDING_ERRORS)[number];

export type IntakeGiftErrors = {
  ending: Record<GiftEndingError, string>;
  tooManyTries: string;
};

export type IntakeSubmitGift = {
  code: string;
  errors: IntakeGiftErrors;
  endGiftMode: () => void;
};

export type IntakeGiftCodeFieldState = {
  value: string;
  checking: boolean;
  check: () => Promise<GiftCodeCheckOutcome | null>;
};

const HTTP_BAD_REQUEST = 400;
const FIX_HIGHLIGHTED_FIELDS = "Please fix the highlighted fields and try again.";
const FORM_CHANGED_MESSAGE = "This form was just updated. Please reload the page and try again.";
const HTTP_NOT_FOUND = 404;
const HTTP_CONFLICT = 409;
const HTTP_TOO_MANY_REQUESTS = 429;

function isGiftEndingError(error: unknown): error is GiftEndingError {
  return GIFT_ENDING_ERRORS.includes(error as GiftEndingError);
}

async function giftEndingErrorMessage(
  response: Response,
  gift: IntakeSubmitGift | undefined,
): Promise<string | null> {
  if (!gift) return null;
  if (response.status !== HTTP_NOT_FOUND && response.status !== HTTP_CONFLICT) return null;
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  return isGiftEndingError(body?.error) ? gift.errors.ending[body.error] : null;
}

async function serverFieldErrors(response: Response): Promise<Record<string, string> | null> {
  if (response.status !== HTTP_BAD_REQUEST) return null;
  const body = (await response.json().catch(() => null)) as {
    fieldErrors?: Record<string, string>;
  } | null;
  const fieldErrors = body?.fieldErrors;
  return fieldErrors && Object.keys(fieldErrors).length > 0 ? fieldErrors : null;
}

function failedSubmitMessage(status: number, gift: IntakeSubmitGift | undefined): string {
  if (gift && status === HTTP_TOO_MANY_REQUESTS) return gift.errors.tooManyTries;
  return status === HTTP_BAD_REQUEST
    ? "Some fields didn't pass validation. Please review and try again."
    : "Something went wrong submitting your form. Please try again.";
}

export type UseIntakeFormHandlersArgs = {
  readingId: string;
  formRef: RefObject<HTMLFormElement | null>;
  submitIntentRef: RefObject<boolean>;
  values: FieldValues;
  setValues: Dispatch<SetStateAction<FieldValues>>;
  allFields: SanityFormField[];
  currentPage: number;
  setCurrentPage: Dispatch<SetStateAction<number>>;
  totalPages: number;
  isFinalPage: boolean;
  currentKeys: string[];
  pageIndexOfField: (key: string) => number;
  submissionSchema: DynamicSchema;
  setErrors: Dispatch<SetStateAction<Record<string, string>>>;
  setSubmitError: Dispatch<SetStateAction<string | null>>;
  setIsSubmitting: Dispatch<SetStateAction<boolean>>;
  consentSnapshot: LegalConsentSnapshot;
  setConsentErrors: Dispatch<SetStateAction<LegalAcknowledgmentsErrors>>;
  honeypot: string;
  turnstileRequired: boolean;
  turnstileToken: string | null;
  requestFreshTurnstileToken: () => Promise<string | null>;
  flushSave: (nextValues: FieldValues, nextPage: number) => void;
  gift?: IntakeSubmitGift;
  giftCodeField?: IntakeGiftCodeFieldState;
  preview?: boolean;
};

export type UseIntakeFormHandlersResult = {
  setValue: (key: string, value: FieldValues[string]) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleReviewEdit: (targetPageIndex: number) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
  handleApplyGiftCode: () => Promise<void>;
  handleRemoveGiftCode: () => void;
};

function blurAndScrollToForm(form: HTMLFormElement | null): void {
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  form?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function useIntakeFormHandlers({
  readingId,
  formRef,
  submitIntentRef,
  values,
  setValues,
  allFields,
  currentPage,
  setCurrentPage,
  totalPages,
  isFinalPage,
  currentKeys,
  pageIndexOfField,
  submissionSchema,
  setErrors,
  setSubmitError,
  setIsSubmitting,
  consentSnapshot,
  setConsentErrors,
  honeypot,
  turnstileRequired,
  turnstileToken,
  requestFreshTurnstileToken,
  flushSave,
  gift,
  giftCodeField,
  preview = false,
}: UseIntakeFormHandlersArgs): UseIntakeFormHandlersResult {
  const setValue = useCallback(
    (key: string, value: FieldValues[string]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
      setErrors((prev) => {
        if (prev[key] === undefined) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
    },
    [setValues, setErrors],
  );

  const navigateToPage = useCallback(
    (targetPageIndex: number, direction: "back" | "review-edit") => {
      setSubmitError(null);
      setErrors({});
      track(direction === "back" ? "intake_page_back_click" : "intake_page_review_edit_click", {
        reading_id: readingId,
        from_page: currentPage + 1,
        to_page: targetPageIndex + 1,
      });
      setCurrentPage(targetPageIndex);
      flushSave(values, targetPageIndex);
      blurAndScrollToForm(formRef.current);
    },
    [setSubmitError, setErrors, readingId, currentPage, setCurrentPage, flushSave, values, formRef],
  );

  const handleNext = useCallback(() => {
    setSubmitError(null);
    const { success, fieldErrors } = validateCurrentPage(allFields, currentKeys, values);
    track("intake_page_next_click", {
      reading_id: readingId,
      page_number: currentPage + 1,
      validation_pass: success,
    });
    if (!success) {
      setErrors(fieldErrors);
      focusFirstError(formRef.current, fieldErrors);
      return;
    }
    setErrors({});
    const nextPage = Math.min(currentPage + 1, totalPages - 1);
    setCurrentPage(nextPage);
    flushSave(values, nextPage);
    blurAndScrollToForm(formRef.current);
  }, [
    setSubmitError,
    allFields,
    currentKeys,
    values,
    readingId,
    currentPage,
    setErrors,
    formRef,
    setCurrentPage,
    totalPages,
    flushSave,
  ]);

  const handleBack = useCallback(() => {
    navigateToPage(Math.max(currentPage - 1, 0), "back");
  }, [navigateToPage, currentPage]);

  const handleReviewEdit = useCallback(
    (targetPageIndex: number) => {
      if (targetPageIndex === currentPage) return;
      navigateToPage(targetPageIndex, "review-edit");
    },
    [navigateToPage, currentPage],
  );

  const handleApplyGiftCode = useCallback(async () => {
    if (preview || !giftCodeField || giftCodeField.checking) return;
    setSubmitError(null);
    const outcome = await giftCodeField.check();
    if (outcome?.kind !== "valid") return;
    saveDraft(readingId, {
      currentPage,
      values: values as DraftValues,
      giftCode: normalizeGiftCode(giftCodeField.value) ?? undefined,
    });
    window.location.assign(outcome.path);
  }, [preview, giftCodeField, setSubmitError, readingId, currentPage, values]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!submitIntentRef.current) return;
      submitIntentRef.current = false;

      setSubmitError(null);

      if (!isFinalPage) {
        handleNext();
        return;
      }

      if (preview) return;

      if (giftCodeField?.value.trim()) {
        await handleApplyGiftCode();
        return;
      }

      // Reflect pending synchronously, before the first await (the turnstile
      // token fetch below). Otherwise the submit button looks dead for the
      // first beat. Every non-navigating exit must reset it (failSubmit does;
      // the validation-fail branch resets explicitly).
      setIsSubmitting(true);

      function failSubmit(errorCode: IntakeSubmitErrorCode, userMessage: string) {
        setSubmitError(userMessage);
        setIsSubmitting(false);
        track("intake_submit_error", {
          reading_id: readingId,
          error_code: errorCode,
        });
      }

      function showServerFieldErrors(fieldErrors: Record<string, string>) {
        const shownKey = Object.keys(fieldErrors).find((key) => pageIndexOfField(key) >= 0);
        if (!shownKey) {
          failSubmit(INTAKE_SUBMIT_ERROR.serverValidationFailed, FORM_CHANGED_MESSAGE);
          return;
        }
        setErrors(fieldErrors);
        failSubmit(INTAKE_SUBMIT_ERROR.serverValidationFailed, FIX_HIGHLIGHTED_FIELDS);
        const errorPage = pageIndexOfField(shownKey);
        if (errorPage === currentPage) {
          focusFirstError(formRef.current, shownKey);
          return;
        }
        setCurrentPage(errorPage);
        flushSave(values, errorPage);
        blurAndScrollToForm(formRef.current);
      }

      const validation = validateFullSubmission(submissionSchema, allFields, values);
      const consentRequirements = {
        requireArt9: true,
        requireCoolingOff: true,
      };
      const consentOk = isFullyConsented(consentSnapshot, consentRequirements);
      setConsentErrors(collectConsentErrors(consentSnapshot, consentRequirements));
      track("intake_submit_click", {
        reading_id: readingId,
        validation_pass: validation.success && consentOk,
      });

      let submissionTurnstileToken: string | null = turnstileToken;
      if (turnstileRequired) {
        submissionTurnstileToken = await requestFreshTurnstileToken();
        if (!submissionTurnstileToken) {
          failSubmit(
            INTAKE_SUBMIT_ERROR.turnstileFailed,
            "Please complete the verification challenge.",
          );
          return;
        }
      }

      if (!validation.success || !consentOk) {
        setIsSubmitting(false);
        setErrors(validation.fieldErrors);
        const message = !consentOk
          ? "All required acknowledgments below must be checked to continue."
          : FIX_HIGHLIGHTED_FIELDS;
        setSubmitError(message);
        focusFirstError(formRef.current, validation.fieldErrors);
        track("intake_submit_error", {
          reading_id: readingId,
          error_code: INTAKE_SUBMIT_ERROR.validationFailed,
        });
        return;
      }

      try {
        const companionKeys: Record<string, string> = {};
        for (const field of allFields) {
          if (field.type !== "placeAutocomplete") continue;
          const companion = `${field.key}${COMPANION_SUFFIX_GEONAMEID}`;
          const v = values[companion];
          if (typeof v === "string" && v !== "") companionKeys[companion] = v;
        }

        const requestBody: Record<string, unknown> = {
          readingSlug: readingId,
          values: { ...validation.parsedValues, ...companionKeys },
          turnstileToken: submissionTurnstileToken ?? "",
          [HONEYPOT_FIELD]: honeypot,
          art6Consent: consentSnapshot.art6.acknowledged,
          art9Consent: consentSnapshot.art9.acknowledged,
          coolingOffConsent: consentSnapshot.coolingOff.acknowledged,
          consentSnapshot,
          ...(gift ? { giftCode: gift.code } : {}),
        };

        const response = await fetch(BOOKING_API_ROUTE, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const fieldErrors = await serverFieldErrors(response);
          if (fieldErrors) {
            showServerFieldErrors(fieldErrors);
            return;
          }
          const giftEndingMessage = await giftEndingErrorMessage(response, gift);
          if (giftEndingMessage) {
            clearGiftCode(readingId);
            gift?.endGiftMode();
          }
          failSubmit(
            `http_${response.status}`,
            giftEndingMessage ?? failedSubmitMessage(response.status, gift),
          );
          return;
        }

        const data = (await response.json()) as {
          paymentUrl?: string;
          thankYouUrl?: string;
          submissionId?: string;
        };
        const nextUrl = gift ? data.thankYouUrl : data.paymentUrl;

        if (!nextUrl || !data.submissionId) {
          failSubmit(
            gift ? INTAKE_SUBMIT_ERROR.missingThankYouUrl : INTAKE_SUBMIT_ERROR.missingPaymentUrl,
            "Unexpected response. Please try again.",
          );
          return;
        }

        track("intake_submit_success", { reading_id: readingId });
        identifySubmission(data.submissionId);
        if (!gift) {
          track("stripe_redirect", {
            reading_id: readingId,
            submission_id: data.submissionId,
          });
        }

        clearDraft(readingId);
        window.location.href = nextUrl;
      } catch {
        failSubmit(
          INTAKE_SUBMIT_ERROR.networkError,
          "Network error. Please check your connection and try again.",
        );
      }
    },
    [
      submitIntentRef,
      setSubmitError,
      isFinalPage,
      handleNext,
      submissionSchema,
      values,
      allFields,
      consentSnapshot,
      setConsentErrors,
      readingId,
      turnstileRequired,
      turnstileToken,
      requestFreshTurnstileToken,
      setErrors,
      formRef,
      setIsSubmitting,
      honeypot,
      gift,
      giftCodeField,
      handleApplyGiftCode,
      preview,
      pageIndexOfField,
      currentPage,
      setCurrentPage,
      flushSave,
    ],
  );

  const handleRemoveGiftCode = useCallback(() => {
    if (preview) return;
    clearGiftCode(readingId);
    window.location.assign(bookingPath(readingId));
  }, [readingId, preview]);

  return {
    setValue,
    handleNext,
    handleBack,
    handleReviewEdit,
    handleSubmit,
    handleApplyGiftCode,
    handleRemoveGiftCode,
  };
}
