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
import {
  BOOKING_API_GIFT_REDEEM_ROUTE,
  BOOKING_API_ROUTE,
  COMPANION_SUFFIX_GEONAMEID,
  HONEYPOT_FIELD,
} from "@/lib/booking/constants";
import type { DynamicSchema } from "@/lib/booking/submissionSchema";
import {
  collectConsentErrors,
  isFullyConsented,
  type LegalConsentSnapshot,
} from "@/lib/compliance/intakeConsent";
import type { SanityFormField } from "@/lib/sanity/types";

import {
  focusFirstError,
  INTAKE_SUBMIT_ERROR,
  type IntakeSubmitErrorCode,
  validateCurrentPage,
  validateFullSubmission,
} from "./intakeValidation";
import { clear as clearDraft } from "./localStorageDraft";

export type IntakeMode = "create" | "redeem";

export type UseIntakeFormHandlersArgs = {
  mode: IntakeMode;
  readingId: string;
  draftScope: string;
  redeemSubmissionId?: string;
  redeemSuccessUrl?: string;
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
};

export type UseIntakeFormHandlersResult = {
  setValue: (key: string, value: FieldValues[string]) => void;
  handleNext: () => void;
  handleBack: () => void;
  handleReviewEdit: (targetPageIndex: number) => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
};

function blurAndScrollToTop(): void {
  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  if (typeof window !== "undefined") {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
}

export function useIntakeFormHandlers({
  mode,
  readingId,
  draftScope,
  redeemSubmissionId,
  redeemSuccessUrl,
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
      track(
        direction === "back" ? "intake_page_back_click" : "intake_page_review_edit_click",
        {
          reading_id: readingId,
          from_page: currentPage + 1,
          to_page: targetPageIndex + 1,
        },
      );
      setCurrentPage(targetPageIndex);
      flushSave(values, targetPageIndex);
      blurAndScrollToTop();
    },
    [setSubmitError, setErrors, readingId, currentPage, setCurrentPage, flushSave, values],
  );

  const handleNext = useCallback(() => {
    setSubmitError(null);
    const { success, fieldErrors } = validateCurrentPage(
      allFields,
      currentKeys,
      values,
    );
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
    blurAndScrollToTop();
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

      function failSubmit(errorCode: IntakeSubmitErrorCode, userMessage: string) {
        setSubmitError(userMessage);
        setIsSubmitting(false);
        track("intake_submit_error", {
          reading_id: readingId,
          error_code: errorCode,
        });
      }

      const validation = validateFullSubmission(submissionSchema, allFields, values);
      const consentOk = isFullyConsented(consentSnapshot, true);
      setConsentErrors(
        collectConsentErrors(consentSnapshot, { requireArt9: true }),
      );
      track("intake_submit_click", {
        reading_id: readingId,
        validation_pass: validation.success && consentOk,
      });

      let submissionTurnstileToken: string | null = turnstileToken;
      if (turnstileRequired) {
        submissionTurnstileToken = await requestFreshTurnstileToken();
        if (!submissionTurnstileToken) {
          failSubmit(INTAKE_SUBMIT_ERROR.turnstileFailed, "Please complete the verification challenge.");
          return;
        }
      }

      if (!validation.success || !consentOk) {
        setErrors(validation.fieldErrors);
        const message = !consentOk
          ? "All required acknowledgments below must be checked to continue."
          : "Please fix the highlighted fields and try again.";
        setSubmitError(message);
        focusFirstError(formRef.current, validation.fieldErrors);
        track("intake_submit_error", {
          reading_id: readingId,
          error_code: INTAKE_SUBMIT_ERROR.validationFailed,
        });
        return;
      }

      setIsSubmitting(true);
      try {
        const companionKeys: Record<string, string> = {};
        for (const field of allFields) {
          if (field.type !== "placeAutocomplete") continue;
          const companion = `${field.key}${COMPANION_SUFFIX_GEONAMEID}`;
          const v = values[companion];
          if (typeof v === "string" && v !== "") companionKeys[companion] = v;
        }

        const endpoint =
          mode === "redeem" ? BOOKING_API_GIFT_REDEEM_ROUTE : BOOKING_API_ROUTE;
        const requestBody: Record<string, unknown> = {
          readingSlug: readingId,
          values: { ...validation.parsedValues, ...companionKeys },
          turnstileToken: submissionTurnstileToken ?? "",
          [HONEYPOT_FIELD]: honeypot,
          art6Consent: consentSnapshot.art6.acknowledged,
          art9Consent: consentSnapshot.art9.acknowledged,
          coolingOffConsent: consentSnapshot.coolingOff.acknowledged,
          consentSnapshot,
        };
        if (mode === "redeem" && redeemSubmissionId) {
          requestBody.submissionId = redeemSubmissionId;
        }

        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          const message =
            response.status === 400
              ? "Some fields didn't pass validation. Please review and try again."
              : "Something went wrong submitting your form. Please try again.";
          failSubmit(`http_${response.status}`, message);
          return;
        }

        if (mode === "redeem") {
          const redeemData = (await response.json()) as {
            submissionId?: string;
            redirectUrl?: string;
          };
          if (!redeemData.submissionId) {
            failSubmit(INTAKE_SUBMIT_ERROR.missingRedeemId, "Unexpected response. Please try again.");
            return;
          }
          track("intake_submit_success", { reading_id: readingId });
          identifySubmission(redeemData.submissionId);
          clearDraft(draftScope);
          window.location.href =
            redeemData.redirectUrl ??
            redeemSuccessUrl ??
            `/thank-you/${redeemData.submissionId}?gift=1&redeemed=1`;
          return;
        }

        const data = (await response.json()) as {
          paymentUrl?: string;
          submissionId?: string;
        };
        if (!data.paymentUrl || !data.submissionId) {
          failSubmit(INTAKE_SUBMIT_ERROR.missingPaymentUrl, "Unexpected response. Please try again.");
          return;
        }

        track("intake_submit_success", { reading_id: readingId });
        identifySubmission(data.submissionId);
        track("stripe_redirect", {
          reading_id: readingId,
          submission_id: data.submissionId,
        });

        clearDraft(draftScope);
        window.location.href = data.paymentUrl;
      } catch {
        failSubmit(INTAKE_SUBMIT_ERROR.networkError, "Network error. Please check your connection and try again.");
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
      mode,
      honeypot,
      redeemSubmissionId,
      draftScope,
      redeemSuccessUrl,
    ],
  );

  return {
    setValue,
    handleNext,
    handleBack,
    handleReviewEdit,
    handleSubmit,
  };
}
