"use client";

import {
  Turnstile,
  type TurnstileInstance,
} from "@marsidev/react-turnstile";
import type {
  ChangeEvent,
  Dispatch,
  FormEvent,
  KeyboardEvent,
  ReactNode,
  RefObject,
  SetStateAction,
} from "react";

import { HONEYPOT_FIELD } from "@/lib/booking/constants";
import type { IntakePage } from "@/lib/booking/derivePages";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import type { LegalConsentSnapshot } from "@/lib/compliance/intakeConsent";
import { errorClasses } from "@/lib/formStyles";
import type { SanityFormSection } from "@/lib/sanity/types";

import { DiscardDraftButton } from "./DiscardDraftButton";
import {
  LegalAcknowledgments,
  type LegalAcknowledgmentsErrors,
} from "./LegalAcknowledgments";
import { PageIndicator } from "./PageIndicator";
import { PageNav } from "./PageNav";
import { RenderedSection } from "./RenderedSection";
import type { RenderContext } from "./renderField";
import { ReviewSummary } from "./ReviewSummary";
import { SubmitOverlay } from "./SubmitOverlay";
import type { FieldValues } from "./types";

export type IntakeFormBodyProps = {
  formRef: RefObject<HTMLFormElement | null>;
  submitIntentRef: RefObject<boolean>;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void> | void;

  readingId: string;
  readingName: string;
  loadingStateCopy?: string;
  pageIndicatorTagline?: string;
  submitLabel?: string;
  nextLabel?: string;
  saveLaterLabel?: string;
  nonRefundableNotice: string;

  honeypot: string;
  setHoneypot: Dispatch<SetStateAction<string>>;

  isSubmitting: boolean;
  isFinalPage: boolean;
  isFirstPage: boolean;
  currentPage: number;
  totalPages: number;
  currentPageValid: boolean;
  valuesUntouched: boolean;
  values: FieldValues;
  pages: IntakePage[];
  currentSections: SanityFormSection[];
  pairedUnknownKeys: Set<string>;
  renderContext: RenderContext;

  lastSavedAt: Date | null;
  savedIndicator: ReactNode;

  consentSnapshot: LegalConsentSnapshot;
  setConsentSnapshot: Dispatch<SetStateAction<LegalConsentSnapshot>>;
  consentErrors: LegalAcknowledgmentsErrors;
  clearConsentError: (key: keyof LegalAcknowledgmentsErrors) => void;

  turnstileRequired: boolean;
  turnstileSiteKey: string | undefined;
  turnstileRef: RefObject<TurnstileInstance | null>;
  handleTurnstileSuccess: (token: string) => void;
  handleTurnstileFailure: () => void;

  submitError: string | null;

  handleNext: () => void;
  handleBack: () => void;
  handleReviewEdit: (targetPageIndex: number) => void;
  handleSaveLater: () => void;
  handleDiscardDraft: () => void;
};

function suppressEnterInNonSubmitFields(event: KeyboardEvent<HTMLFormElement>) {
  if (event.key !== "Enter") return;
  const target = event.target as HTMLElement;
  const tag = target.tagName;
  if (tag === "TEXTAREA") return;
  if (tag === "BUTTON" && (target as HTMLButtonElement).type === "submit") return;
  event.preventDefault();
}

export function IntakeFormBody({
  formRef,
  submitIntentRef,
  handleSubmit,
  readingId,
  readingName,
  loadingStateCopy,
  pageIndicatorTagline,
  submitLabel,
  nextLabel,
  saveLaterLabel,
  nonRefundableNotice,
  honeypot,
  setHoneypot,
  isSubmitting,
  isFinalPage,
  isFirstPage,
  currentPage,
  totalPages,
  currentPageValid,
  valuesUntouched,
  values,
  pages,
  currentSections,
  pairedUnknownKeys,
  renderContext,
  lastSavedAt,
  savedIndicator,
  consentSnapshot,
  setConsentSnapshot,
  consentErrors,
  clearConsentError,
  turnstileRequired,
  turnstileSiteKey,
  turnstileRef,
  handleTurnstileSuccess,
  handleTurnstileFailure,
  submitError,
  handleNext,
  handleBack,
  handleReviewEdit,
  handleSaveLater,
  handleDiscardDraft,
}: IntakeFormBodyProps) {
  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={suppressEnterInNonSubmitFields}
      noValidate
      className="relative flex flex-col gap-10"
      {...CLARITY_MASK_PROPS}
    >
      {isSubmitting ? <SubmitOverlay text={loadingStateCopy} /> : null}
      <input
        type="text"
        name={HONEYPOT_FIELD}
        value={honeypot}
        onChange={(event: ChangeEvent<HTMLInputElement>) =>
          setHoneypot(event.target.value)
        }
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
      />

      {totalPages > 0 ? (
        <div className="flex items-center justify-between gap-4">
          <PageIndicator
            pageNumber={currentPage + 1}
            totalPages={totalPages}
            tagline={pageIndicatorTagline}
          />
          {lastSavedAt ? (
            <DiscardDraftButton onConfirm={handleDiscardDraft} />
          ) : null}
        </div>
      ) : null}

      {currentSections.map((section) => (
        <RenderedSection
          key={section._id}
          section={section}
          pairedUnknownKeys={pairedUnknownKeys}
          context={renderContext}
        />
      ))}

      {isFinalPage ? (
        <ReviewSummary
          pages={pages}
          values={values}
          currentPageIndex={currentPage}
          onEdit={handleReviewEdit}
        />
      ) : null}

      {isFinalPage ? (
        <LegalAcknowledgments
          snapshot={consentSnapshot}
          setSnapshot={setConsentSnapshot}
          errors={consentErrors}
          clearError={clearConsentError}
          nonRefundableNotice={nonRefundableNotice}
          isSubmitting={isSubmitting}
        />
      ) : null}

      {turnstileRequired && turnstileSiteKey ? (
        <div className="sr-only" aria-hidden="true">
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileSiteKey}
            options={{ execution: "execute", appearance: "interaction-only" }}
            onSuccess={handleTurnstileSuccess}
            onExpire={handleTurnstileFailure}
            onError={handleTurnstileFailure}
          />
        </div>
      ) : null}

      {submitError ? (
        <p role="alert" className={errorClasses}>
          {submitError}
        </p>
      ) : null}

      {!currentPageValid ? (
        <p
          role="status"
          aria-live="polite"
          className="font-body text-xs italic text-j-text-muted text-center mt-4"
        >
          Please complete the required fields above.
        </p>
      ) : null}

      <PageNav
        isFirstPage={isFirstPage}
        isFinalPage={isFinalPage}
        backHref={`/book/${readingId}`}
        onBack={handleBack}
        onNext={handleNext}
        onSaveLater={handleSaveLater}
        onSubmitIntent={() => {
          submitIntentRef.current = true;
        }}
        isSubmitting={isSubmitting}
        nextDisabled={!currentPageValid}
        submitDisabled={isFinalPage && !currentPageValid}
        saveLaterDisabled={valuesUntouched}
        submitLabel={submitLabel}
        nextLabel={nextLabel}
        saveLaterLabel={saveLaterLabel}
        savedIndicator={savedIndicator}
      />

      <p className="sr-only">{`Booking form for ${readingName}`}</p>
    </form>
  );
}
